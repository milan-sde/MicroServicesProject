const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const mongoose = require('mongoose');
const path = require('path');

const PORT = process.env.PORT || 3004;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/inventorydb';

const PROTO_PATH = path.join(__dirname, '../../proto/inventory.proto');

mongoose.connect(MONGODB_URI)
  .then(() => console.log('Inventory service: Connected to MongoDB - Inventory collection'))
  .catch(err => console.error('Inventory service: MongoDB connection error:', err));

const inventorySchema = new mongoose.Schema({
  productId: { type: String, required: true, unique: true },
  stock: { type: Number, required: true, default: 100 },
  updatedAt: { type: Date, default: Date.now }
});

const Inventory = mongoose.model('Inventory', inventorySchema);

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const inventoryProto = grpc.loadPackageDefinition(packageDefinition).inventory;

function checkStock(call, callback) {
  const productId = call.request.product_id || call.request.productId;
  const quantity = call.request.quantity;
  console.log(`Inventory checked for product: ${productId}, requested quantity: ${quantity}`);
  
  Inventory.findOne({ productId })
    .then(inventory => {
      if (!inventory) {
        return callback(null, {
          available: false,
          message: 'Product not found in inventory',
          current_stock: 0
        });
      }
      
      const available = inventory.stock >= quantity;
      callback(null, {
        available,
        message: available ? 'Stock available' : 'Insufficient stock',
        current_stock: inventory.stock
      });
    })
    .catch(err => {
      console.error('Check stock error:', err);
      callback({
        code: grpc.status.INTERNAL,
        message: 'Error checking stock'
      });
    });
}

function updateStock(call, callback) {
  const productId = call.request.product_id || call.request.productId;
  const quantity = call.request.quantity;
  const increase = call.request.increase;
  console.log(`Stock update for product: ${productId}, quantity: ${quantity}, increase: ${increase}`);
  
  const updateValue = increase ? quantity : -quantity;
  
  Inventory.findOneAndUpdate(
    { productId },
    { 
      $inc: { stock: updateValue },
      $set: { updatedAt: new Date() }
    },
    { new: true, upsert: true }
  )
    .then(inventory => {
      const newStock = inventory ? inventory.stock : quantity;
      console.log(`Inventory updated. New stock: ${newStock}`);
      callback(null, {
        success: true,
        message: 'Stock updated successfully',
        new_stock: newStock
      });
    })
    .catch(err => {
      console.error('Update stock error:', err);
      callback({
        code: grpc.status.INTERNAL,
        message: 'Error updating stock'
      });
    });
}

function main() {
  const server = new grpc.Server();
  server.addService(inventoryProto.InventoryService.service, {
    CheckStock: checkStock,
    UpdateStock: updateStock
  });

  server.bindAsync(
    `0.0.0.0:${PORT}`,
    grpc.ServerCredentials.createInsecure(),
    (err, port) => {
      if (err) {
        console.error('Failed to start server:', err);
        return;
      }
      console.log(`Inventory service running on port ${port}`);
    }
  );
}

main();
