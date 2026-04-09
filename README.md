# Smart Order Management System

A complete microservices-based order management system with React frontend, REST APIs, and gRPC inter-service communication.

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend  │────▶│    Nginx    │────▶│ User Service│
│   (React)   │     │ (Gateway)   │     │  (REST :3001)│
└─────────────┘     └─────────────┘     └─────────────┘
                           │                    │
                           │                    ▼
                           ▼            ┌─────────────┐
                    ┌─────────────┐     │Product Svc  │
                    │Order Service│────▶│  (REST :3002)│
                    │  (REST)     │     └─────────────┘
                    └──────┬──────┘
                           │
              ┌────────────┴────────────┐
              │                         │
              ▼                         ▼
      ┌──────────────┐           ┌──────────────┐
      │  Inventory   │           │   Payment    │
      │  (gRPC :3004)│           │  (gRPC :3005)│
      └──────────────┘           └──────────────┘
              │                         │
              └────────────┬────────────┘
                           ▼
                   ┌──────────────┐
                   │   MongoDB     │
                   └──────────────┘
```

## Tech Stack

- **Backend**: Node.js, Express
- **Frontend**: React
- **Database**: MongoDB
- **API Gateway**: Nginx
- **Communication**: REST (client→services), gRPC (service→service)
- **Containerization**: Docker, Docker Compose

## Project Structure

```
MAP-Project/
├── docker-compose.yml          # Docker orchestration
├── nginx/
│   └── nginx.conf              # API Gateway configuration
├── proto/
│   ├── inventory.proto         # Inventory service proto
│   └── payment.proto           # Payment service proto
├── user-service/
│   ├── package.json
│   ├── Dockerfile
│   └── src/
│       └── index.js            # User authentication, JWT
├── product-service/
│   ├── package.json
│   ├── Dockerfile
│   └── src/
│       └── index.js            # Product CRUD
├── order-service/
│   ├── package.json
│   ├── Dockerfile
│   └── src/
│       └── index.js            # Order creation, gRPC calls
├── inventory-service/
│   ├── package.json
│   ├── Dockerfile
│   └── src/
│       └── index.js            # gRPC inventory service
├── payment-service/
│   ├── package.json
│   ├── Dockerfile
│   └── src/
│       └── index.js            # gRPC payment service
├── frontend/
│   ├── package.json
│   ├── Dockerfile
│   ├── public/
│   │   └── index.html
│   └── src/
│       ├── index.js
│       ├── App.js
│       └── App.css
├── TESTING.md                   # Testing documentation
└── README.md
```

## Quick Start

```bash
# Build and start all services
docker-compose up --build

# Stop all services
docker-compose down

# View logs
docker-compose logs -f
```

## Services

| Service | Port | Description |
|---------|------|-------------|
| Frontend | 3000 | React UI |
| Nginx | 80 | API Gateway |
| User Service | 3001 | Auth, JWT |
| Product Service | 3002 | Products CRUD |
| Order Service | 3003 | Order processing |
| Inventory Service | 3004 | gRPC stock check |
| Payment Service | 3005 | gRPC payment |
| MongoDB | 27017 | Database |

## MongoDB Collections

- `usersdb.users` - User accounts
- `productsdb.products` - Products
- `ordersdb.orders` - Orders
- `inventorydb.inventories` - Stock
- `paymentsdb.payments` - Payments

## API Endpoints

### User Service (http://localhost/users)
- `POST /users/signup` - Register user
- `POST /users/login` - Login (returns JWT)
- `GET /users/profile` - Get profile (requires token)

### Product Service (http://localhost/products)
- `POST /products` - Add product
- `GET /products` - List products
- `GET /products/:id` - Get product

### Order Service (http://localhost/orders)
- `POST /orders` - Create order
- `GET /orders` - List orders

## Order Flow

1. Client creates order via REST API
2. Order service validates order
3. Order service calls Inventory service (gRPC) to check stock
4. Order service calls Payment service (gRPC) to process payment
5. Order is saved to MongoDB
6. Response returned to client

## Development

To run services locally (without Docker):

```bash
# Terminal 1: MongoDB
mongod

# Terminal 2: User Service
cd user-service && npm start

# Terminal 3: Product Service
cd product-service && npm start

# Terminal 4: Inventory Service
cd inventory-service && npm start

# Terminal 5: Payment Service
cd payment-service && npm start

# Terminal 6: Order Service
cd order-service && npm start

# Terminal 7: Frontend
cd frontend && npm start
```
