const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3002;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/productsdb';
const INVENTORY_MONGODB_URI = process.env.INVENTORY_MONGODB_URI || MONGODB_URI.replace('productsdb', 'inventorydb');
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey123';
const INVENTORY_SERVICE_HOST = process.env.INVENTORY_SERVICE_HOST || 'inventory-service';
const INVENTORY_SERVICE_PORT = process.env.INVENTORY_SERVICE_PORT || 3004;
const INVENTORY_PROTO_PATH = '/proto/inventory.proto';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB - Products collection'))
  .catch(err => console.error('MongoDB connection error:', err));

const inventoryDbConnection = mongoose.createConnection(INVENTORY_MONGODB_URI);
inventoryDbConnection
  .asPromise()
  .then(() => console.log('Connected to MongoDB - Inventory collection (read model)'))
  .catch(err => console.error('Inventory read model connection error:', err));

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  price: { type: Number, required: true },
  stock: { type: Number, required: true, default: 100 },
  createdAt: { type: Date, default: Date.now }
});

const Product = mongoose.model('Product', productSchema);

const inventoryReadSchema = new mongoose.Schema({
  productId: { type: String, required: true, unique: true },
  stock: { type: Number, required: true, default: 0 },
  updatedAt: { type: Date, default: Date.now }
}, { collection: 'inventories' });

const InventoryRead = inventoryDbConnection.model('InventoryRead', inventoryReadSchema);

async function enrichProductsWithLiveStock(products) {
  if (!products.length) {
    return [];
  }

  const ids = products.map(item => item._id.toString());
  const inventoryDocs = await InventoryRead.find({ productId: { $in: ids } }).lean();
  const stockByProductId = new Map(inventoryDocs.map(item => [item.productId, item.stock]));

  return products.map(item => {
    const plain = item.toObject ? item.toObject() : item;
    const liveStock = stockByProductId.get(plain._id.toString());
    return {
      ...plain,
      stock: Number.isFinite(liveStock) ? liveStock : plain.stock
    };
  });
}

const inventoryPackage = protoLoader.loadSync(INVENTORY_PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const inventoryProto = grpc.loadPackageDefinition(inventoryPackage).inventory;
const inventoryClient = new inventoryProto.InventoryService(
  `${INVENTORY_SERVICE_HOST}:${INVENTORY_SERVICE_PORT}`,
  grpc.credentials.createInsecure()
);

function initializeInventory(productId, stock) {
  return new Promise((resolve, reject) => {
    inventoryClient.UpdateStock(
      {
        product_id: productId,
        quantity: stock,
        increase: true
      },
      (err, response) => {
        if (err) {
          return reject(err);
        }
        resolve(response);
      }
    );
  });
}

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Authentication token required' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

function requireAdmin(req, res, next) {
  if ((req.user?.role || 'user') !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
}

async function removeInventoryRecord(productId) {
  await InventoryRead.deleteOne({ productId });
}

app.post('/products', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, description, price, stock } = req.body;
    const initialStock = Number.isInteger(stock) ? stock : Number(stock);

    if (!name || !Number.isFinite(Number(price)) || !Number.isFinite(initialStock) || initialStock < 0) {
      return res.status(400).json({ message: 'Invalid product payload' });
    }
    
    const product = new Product({ name, description, price, stock: initialStock });
    await product.save();

    try {
      await initializeInventory(product._id.toString(), initialStock);
    } catch (grpcError) {
      await Product.findByIdAndDelete(product._id);
      console.error('Inventory initialization error:', grpcError);
      return res.status(502).json({ message: 'Failed to initialize inventory for product' });
    }

    console.log('Product added:', name);
    
    res.status(201).json({ 
      message: 'Product created successfully',
      product
    });
  } catch (error) {
    console.error('Add product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/products', async (req, res) => {
  try {
    const products = await Product.find();
    const productsWithLiveStock = await enrichProductsWithLiveStock(products);
    console.log('Products retrieved:', products.length);
    res.json({ products: productsWithLiveStock });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const [productWithLiveStock] = await enrichProductsWithLiveStock([product]);
    res.json({ product: productWithLiveStock });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.delete('/products/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    await Product.findByIdAndDelete(req.params.id);
    await removeInventoryRecord(req.params.id);

    res.json({
      message: 'Product deleted successfully',
      productId: req.params.id
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Product service running on port ${PORT}`);
});
