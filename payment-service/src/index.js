const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const mongoose = require('mongoose');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3005;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/paymentsdb';

const PROTO_PATH = path.join(__dirname, '../../proto/payment.proto');

mongoose.connect(MONGODB_URI)
  .then(() => console.log('Payment service: Connected to MongoDB - Payments collection'))
  .catch(err => console.error('Payment service: MongoDB connection error:', err));

const paymentSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  amount: { type: Number, required: true },
  transactionId: { type: String, required: true },
  status: { type: String, default: 'success' },
  processedAt: { type: Date, default: Date.now }
});

const Payment = mongoose.model('Payment', paymentSchema);

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const paymentProto = grpc.loadPackageDefinition(packageDefinition).payment;

function processPayment(call, callback) {
  const orderId = call.request.order_id || call.request.orderId;
  const amount = call.request.amount;
  console.log(`Payment processing for order: ${orderId}, amount: ${amount}`);
  
  const transactionId = `TXN_${crypto.randomUUID()}`;
  
  const payment = new Payment({
    orderId,
    amount,
    transactionId,
    status: 'success'
  });
  
  payment.save()
    .then(() => {
      console.log(`Payment processed successfully. Transaction ID: ${transactionId}`);
      callback(null, {
        success: true,
        message: 'Payment processed successfully',
        transaction_id: transactionId
      });
    })
    .catch(err => {
      if (err.code === 11000) {
        console.log(`Payment already processed for order: ${orderId}`);
        return callback(null, {
          success: true,
          message: 'Payment already processed',
          transaction_id: 'duplicate'
        });
      }
      console.error('Payment processing error:', err);
      callback({
        code: grpc.status.INTERNAL,
        message: 'Error processing payment'
      });
    });
}

function main() {
  const server = new grpc.Server();
  server.addService(paymentProto.PaymentService.service, {
    ProcessPayment: processPayment
  });

  server.bindAsync(
    `0.0.0.0:${PORT}`,
    grpc.ServerCredentials.createInsecure(),
    (err, port) => {
      if (err) {
        console.error('Failed to start server:', err);
        return;
      }
      console.log(`Payment service running on port ${port}`);
    }
  );
}

main();
