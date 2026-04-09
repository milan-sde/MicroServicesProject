const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const stompit = require('stompit');
const CircuitBreaker = require('opossum');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3003;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ordersdb';

const INVENTORY_SERVICE_HOST = process.env.INVENTORY_SERVICE_HOST || 'localhost';
const INVENTORY_SERVICE_PORT = process.env.INVENTORY_SERVICE_PORT || 3004;
const PAYMENT_SERVICE_HOST = process.env.PAYMENT_SERVICE_HOST || 'localhost';
const PAYMENT_SERVICE_PORT = process.env.PAYMENT_SERVICE_PORT || 3005;
const ACTIVEMQ_URL = process.env.ACTIVEMQ_URL || 'tcp://activemq:61616';
const ORDER_QUEUE = process.env.ORDER_QUEUE || 'order.queue';
const ACTIVEMQ_RETRY_DELAY_MS = Number(process.env.ACTIVEMQ_RETRY_DELAY_MS || 5000);

function parseBrokerUrl(url) {
  try {
    const parsed = new URL(url);
    const basePort = Number(parsed.port || 61616);
    const ports = basePort === 61616 ? [61616, 61613] : [basePort];

    return {
      host: parsed.hostname,
      ports,
      connectHeaders: {
        host: '/',
        login: parsed.username || 'admin',
        passcode: parsed.password || 'admin',
      },
    };
  } catch {
    return {
      host: 'activemq',
      ports: [61616, 61613],
      connectHeaders: {
        host: '/',
        login: 'admin',
        passcode: 'admin',
      },
    };
  }
}

const stompConnectOptions = parseBrokerUrl(ACTIVEMQ_URL);

function connectStompWithRetry() {
  return new Promise((resolve) => {
    const tryConnect = () => {
      const ports = [...stompConnectOptions.ports];

      const tryPort = () => {
        const port = ports.shift();

        if (!port) {
          setTimeout(tryConnect, ACTIVEMQ_RETRY_DELAY_MS);
          return;
        }

        stompit.connect(
          {
            host: stompConnectOptions.host,
            port,
            connectHeaders: stompConnectOptions.connectHeaders,
          },
          (error, client) => {
            if (error) {
              console.error(`ActiveMQ connection failed on port ${port}. Retrying...`, error.message);
              tryPort();
              return;
            }
            resolve(client);
          }
        );
      };

      tryPort();
    };

    tryConnect();
  });
}

async function sendMessage(queue, message) {
  const client = await connectStompWithRetry();

  return new Promise((resolve, reject) => {
    try {
      const frame = client.send({
        destination: `/queue/${queue}`,
        'content-type': 'application/json',
      });

      frame.write(JSON.stringify(message));
      frame.end();

      client.disconnect();
      console.log('Message sent to ActiveMQ');
      resolve();
    } catch (error) {
      client.disconnect();
      reject(error);
    }
  });
}

mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB - Orders collection'))
  .catch(err => console.error('MongoDB connection error:', err));

const orderSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  products: [{
    productId: { type: String, required: true },
    productName: { type: String },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true }
  }],
  totalAmount: { type: Number, required: true },
  status: { type: String, default: 'pending' },
  inventoryChecked: { type: Boolean, default: false },
  paymentProcessed: { type: Boolean, default: false },
  transactionId: { type: String },
  createdAt: { type: Date, default: Date.now }
});

const Order = mongoose.model('Order', orderSchema);

const INVENTORY_PROTO_PATH = path.join(__dirname, '../../proto/inventory.proto');
const PAYMENT_PROTO_PATH = path.join(__dirname, '../../proto/payment.proto');

const inventoryPackage = protoLoader.loadSync(INVENTORY_PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const paymentPackage = protoLoader.loadSync(PAYMENT_PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const inventoryProto = grpc.loadPackageDefinition(inventoryPackage).inventory;
const paymentProto = grpc.loadPackageDefinition(paymentPackage).payment;

let inventoryClient;
let paymentClient;
let paymentCircuitBreaker;

function initializeGrpcClients() {
  inventoryClient = new inventoryProto.InventoryService(
    `${INVENTORY_SERVICE_HOST}:${INVENTORY_SERVICE_PORT}`,
    grpc.credentials.createInsecure()
  );
  
  paymentClient = new paymentProto.PaymentService(
    `${PAYMENT_SERVICE_HOST}:${PAYMENT_SERVICE_PORT}`,
    grpc.credentials.createInsecure()
  );
  
  console.log('gRPC clients initialized');
}

function processPayment(orderId, amount) {
  console.log('Calling Payment Service');

  return new Promise((resolve, reject) => {
    paymentClient.ProcessPayment({
      order_id: orderId,
      amount,
    }, (err, response) => {
      if (err) {
        return reject(err);
      }

      return resolve(response);
    });
  });
}

function initializeCircuitBreaker() {
  paymentCircuitBreaker = new CircuitBreaker(processPayment, {
    timeout: 3000,
    errorThresholdPercentage: 50,
    resetTimeout: 5000,
  });

  paymentCircuitBreaker.fallback(() => {
    console.log('Fallback executed');
    return {
      status: 'FAILED',
      message: 'Payment service unavailable',
    };
  });

  paymentCircuitBreaker.on('open', () => {
    console.log('Circuit breaker triggered');
  });
}

initializeGrpcClients();
initializeCircuitBreaker();

app.post('/orders', async (req, res) => {
  try {
    const { userId, products } = req.body;
    
    console.log('Order received from user:', userId);
    
    if (!products || products.length === 0) {
      return res.status(400).json({ message: 'No products in order' });
    }

    let totalAmount = 0;
    for (const item of products) {
      totalAmount += item.price * item.quantity;
    }

    const order = new Order({
      userId,
      products,
      totalAmount,
      status: 'pending'
    });
    
    await order.save();
    console.log('Order created:', order._id);

    for (const item of products) {
      const stockCheck = await checkInventory(item.productId, item.quantity);
      if (!stockCheck.available) {
        order.status = 'FAILED';
        order.inventoryChecked = true;
        await order.save();
        return res.status(400).json({
          message: `Insufficient stock for product ${item.productId}`,
          order
        });
      }
    }
    
    order.inventoryChecked = true;
    await order.save();
    console.log('Inventory checked for order:', order._id);

    const paymentResponse = await paymentCircuitBreaker.fire(order._id.toString(), totalAmount);

    if (!paymentResponse?.success) {
      order.paymentProcessed = false;
      order.status = 'FAILED';
      await order.save();

      return res.status(503).json({
        status: 'FAILED',
        message: 'Payment service unavailable',
        order,
      });
    }

    console.log('Payment processed for order:', order._id);
    order.paymentProcessed = true;
    order.transactionId = paymentResponse.transaction_id || paymentResponse.transactionId;
    order.status = 'SUCCESS';

    for (const item of products) {
      await updateInventory(item.productId, item.quantity, false);
    }

    await order.save();
    console.log('Order completed:', order._id);

    sendMessage(ORDER_QUEUE, {
        event: 'ORDER_PLACED',
        orderId: order._id.toString(),
        productId: products[0]?.productId || null,
        status: 'SUCCESS'
      }).catch((mqError) => {
        console.error('Failed to publish order event:', mqError.message);
      });
    
    res.status(201).json({
      message: 'Order placed successfully',
      order,
      transactionId: order.transactionId
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

function checkInventory(productId, quantity) {
  return new Promise((resolve, reject) => {
    inventoryClient.CheckStock({ product_id: productId, quantity }, (err, response) => {
      if (err) {
        console.error('Inventory check error:', err);
        reject(err);
        return;
      }
      resolve(response);
    });
  });
}

function updateInventory(productId, quantity, increase) {
  return new Promise((resolve, reject) => {
    inventoryClient.UpdateStock({ product_id: productId, quantity, increase }, (err, response) => {
      if (err) {
        console.error('Inventory update error:', err);
        reject(err);
        return;
      }
      resolve(response);
    });
  });
}

app.get('/orders', async (req, res) => {
  try {
    const { userId } = req.query;
    const query = userId ? { userId } : {};
    const orders = await Order.find(query);
    console.log('Orders retrieved:', orders.length);
    res.json({ orders });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/orders/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.json({ order });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Order service running on port ${PORT}`);
});
