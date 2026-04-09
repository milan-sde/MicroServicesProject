const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3003;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ordersdb';

const INVENTORY_SERVICE_HOST = process.env.INVENTORY_SERVICE_HOST || 'localhost';
const INVENTORY_SERVICE_PORT = process.env.INVENTORY_SERVICE_PORT || 3004;
const PAYMENT_SERVICE_HOST = process.env.PAYMENT_SERVICE_HOST || 'localhost';
const PAYMENT_SERVICE_PORT = process.env.PAYMENT_SERVICE_PORT || 3005;

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

initializeGrpcClients();

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

    let inventoryAvailable = true;
    for (const item of products) {
      const stockCheck = await checkInventory(item.productId, item.quantity);
      if (!stockCheck.available) {
        inventoryAvailable = false;
        order.status = 'failed';
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

    await new Promise((resolve, reject) => {
      paymentClient.ProcessPayment({
        order_id: order._id.toString(),
        amount: totalAmount
      }, (err, response) => {
        if (err) {
          console.error('Payment error:', err);
          reject(err);
          return;
        }
        console.log('Payment processed for order:', order._id);
        order.paymentProcessed = true;
        order.transactionId = response.transaction_id || response.transactionId;
        order.status = 'completed';
        resolve();
      });
    });

    for (const item of products) {
      await updateInventory(item.productId, item.quantity, false);
    }

    await order.save();
    console.log('Order completed:', order._id);
    
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
