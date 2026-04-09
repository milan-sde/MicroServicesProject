# Smart Order Management System - Testing Guide

## Quick Start

```bash
# Start all services
docker-compose up --build

# Stop all services
docker-compose down
```

## Services Running

- Frontend: http://localhost:3000
- API Gateway (Nginx): http://localhost
- User Service: http://localhost:3001
- Product Service: http://localhost:3002
- Order Service: http://localhost:3003
- Inventory Service (gRPC): localhost:3004
- Payment Service (gRPC): localhost:3005
- MongoDB: localhost:27017

## Postman API Testing

### 1. Register User
**POST** `http://localhost/users/signup`

```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "password123"
}
```

### 2. Login User
**POST** `http://localhost/users/login`

```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

Response includes JWT token. Save it for authenticated requests.

### 3. Add Product
**POST** `http://localhost/products`

```json
{
  "name": "Laptop",
  "description": "High-performance laptop",
  "price": 999.99,
  "stock": 50
}
```

### 4. Get All Products
**GET** `http://localhost/products`

### 5. Create Order
**POST** `http://localhost/orders`

```json
{
  "userId": "USER_ID_FROM_DB",
  "products": [
    {
      "productId": "PRODUCT_ID_FROM_DB",
      "productName": "Laptop",
      "quantity": 2,
      "price": 999.99
    }
  ]
}
```

### 6. Get Orders
**GET** `http://localhost/orders?userId=USER_ID`

## gRPC Testing with grpcurl

### Check Inventory Stock
```bash
grpcurl -plaintext -d '{"product_id": "PRODUCT_ID", "quantity": 5}' localhost:3004 inventory.InventoryService/CheckStock
```

### Update Inventory Stock
```bash
grpcurl -plaintext -d '{"product_id": "PRODUCT_ID", "quantity": 10, "increase": true}' localhost:3004 inventory.InventoryService/UpdateStock
```

### Process Payment
```bash
grpcurl -plaintext -d '{"order_id": "ORDER_ID", "amount": 1999.98}' localhost:3005 payment.PaymentService/ProcessPayment
```

## MongoDB Collections

Access MongoDB:
```bash
docker exec -it mongodb mongosh
```

Collections:
- `usersdb.users` - User accounts
- `productsdb.products` - Product catalog
- `ordersdb.orders` - Order records
- `inventorydb.inventories` - Stock inventory
- `paymentsdb.payments` - Payment transactions

## Verify Services

```bash
# Check if services are running
docker-compose ps

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f user-service
docker-compose logs -f order-service
```

## Test Flow

1. Start system: `docker-compose up --build`
2. Register: POST /users/signup
3. Login: POST /users/login (get token)
4. Add products: POST /products (multiple)
5. List products: GET /products
6. Create order: POST /orders (triggers gRPC calls)
7. View orders: GET /orders

## Expected Console Logs

- User service: "User signed up:", "User logged in:"
- Product service: "Product added:", "Products retrieved:"
- Order service: "Order received", "Inventory checked", "Payment processed"
- Inventory service: "Inventory checked for product:", "Stock update for product:"
- Payment service: "Payment processing for order:", "Payment processed successfully"
