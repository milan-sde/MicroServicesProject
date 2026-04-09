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
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey123';
const INVENTORY_SERVICE_HOST = process.env.INVENTORY_SERVICE_HOST || 'inventory-service';
const INVENTORY_SERVICE_PORT = process.env.INVENTORY_SERVICE_PORT || 3004;
const INVENTORY_PROTO_PATH = '/proto/inventory.proto';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB - Products collection'))
  .catch(err => console.error('MongoDB connection error:', err));

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  price: { type: Number, required: true },
  stock: { type: Number, required: true, default: 100 },
  createdAt: { type: Date, default: Date.now }
});

const Product = mongoose.model('Product', productSchema);

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
    console.log('Products retrieved:', products.length);
    res.json({ products });
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
    res.json({ product });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Product service running on port ${PORT}`);
});
