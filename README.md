# 🛒 E-Commerce Backend API

Production-grade REST API built with **Node.js + TypeScript + PostgreSQL + Prisma + Redis**.

---

## Tech Stack

| Layer        | Tech                          |
|-------------|-------------------------------|
| Runtime     | Node.js + TypeScript           |
| Framework   | Express.js                    |
| Database    | PostgreSQL + Prisma ORM        |
| Cache       | Redis                         |
| Auth        | JWT (access token)            |
| Validation  | Zod                           |
| Security    | Helmet, CORS, Rate Limiting    |

---

## Project Structure

```
src/
├── app.ts                    # Entry point
├── config/
│   ├── db.ts                 # Prisma singleton
│   └── redis.ts              # Redis client + cache helpers
├── middleware/
│   ├── auth.middleware.ts    # JWT verify + role guard
│   ├── error.middleware.ts   # Global error handler
│   └── validate.middleware.ts# Zod request validation
├── utils/
│   ├── ApiResponse.ts        # Standardized response
│   ├── ApiError.ts           # Custom error class
│   └── catchAsync.ts         # Async route wrapper
└── modules/
    ├── auth/                 # Register, Login, Profile
    ├── products/             # CRUD, search, filter, cache
    ├── categories/           # CRUD + product count
    ├── cart/                 # Add/update/remove items
    ├── orders/               # Place, track, cancel, admin
    └── users/                # Addresses, reviews
```

---

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL running locally
- Redis running locally (optional — app works without it)

### 1. Install

```bash
npm install
```

### 2. Configure

```bash
cp .env.example .env
# Edit .env with your DATABASE_URL
```

### 3. Database setup + seed

```bash
npm run db:migrate       # Run migrations
npm run db:generate      # Generate Prisma client
npm run db:seed          # Seed 25 categories + 200 products
```

### 4. Start dev server

```bash
npm run dev
```

---

## Seed Data

After `npm run db:seed`:

| Item          | Count |
|--------------|-------|
| Categories   | 25    |
| Products     | 200   |
| Admin user   | admin@shop.com / Admin@123 |
| Demo user    | user@shop.com / User@123 |

---

## API Reference

Base URL: `http://localhost:5000/api/v1`

### Auth
| Method | Endpoint        | Auth | Description        |
|--------|----------------|------|--------------------|
| POST   | /auth/register | No   | Create account     |
| POST   | /auth/login    | No   | Login, get token   |
| GET    | /auth/me       | Yes  | Get my profile     |

### Products
| Method | Endpoint         | Auth  | Description                    |
|--------|-----------------|-------|--------------------------------|
| GET    | /products       | No    | List with filter/search/sort   |
| GET    | /products/:slug | No    | Get single product             |
| POST   | /products       | Admin | Create product                 |
| PATCH  | /products/:id   | Admin | Update product                 |
| DELETE | /products/:id   | Admin | Soft delete                    |

**Query params for GET /products:**
```
?page=1&limit=20
?category=smartphones
?search=iphone
?minPrice=5000&maxPrice=50000
?sort=price_asc|price_desc|rating|newest
?tags=samsung,flagship
```

### Categories
| Method | Endpoint           | Auth  | Description       |
|--------|--------------------|-------|-------------------|
| GET    | /categories        | No    | All categories    |
| GET    | /categories/:slug  | No    | Single category   |
| POST   | /categories        | Admin | Create category   |
| PATCH  | /categories/:id    | Admin | Update category   |

### Cart
| Method | Endpoint               | Auth | Description        |
|--------|------------------------|------|--------------------|
| GET    | /cart                  | Yes  | Get cart + totals  |
| POST   | /cart/items            | Yes  | Add item           |
| PATCH  | /cart/items/:itemId    | Yes  | Update quantity    |
| DELETE | /cart/items/:itemId    | Yes  | Remove item        |
| DELETE | /cart                  | Yes  | Clear cart         |

### Orders
| Method | Endpoint              | Auth  | Description          |
|--------|-----------------------|-------|----------------------|
| POST   | /orders               | Yes   | Place order from cart|
| GET    | /orders/my            | Yes   | My orders            |
| GET    | /orders/my/:id        | Yes   | Single order         |
| PATCH  | /orders/my/:id/cancel | Yes   | Cancel order         |
| GET    | /orders               | Admin | All orders           |
| PATCH  | /orders/:id/status    | Admin | Update order status  |

### Users
| Method | Endpoint           | Auth | Description     |
|--------|--------------------|------|-----------------|
| GET    | /users/addresses   | Yes  | Get addresses   |
| POST   | /users/addresses   | Yes  | Add address     |
| DELETE | /users/addresses/:id | Yes| Delete address  |
| POST   | /users/reviews     | Yes  | Submit review   |

---

## Response Format

All responses follow this shape:

```json
{
  "success": true,
  "message": "Products fetched",
  "data": [...],
  "meta": {
    "pagination": {
      "total": 200,
      "page": 1,
      "limit": 20,
      "totalPages": 10,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

Error response:
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "Invalid email" }
  ]
}
```

---

## Key Design Decisions

- **Soft delete on products** — Deleting a product keeps order history intact
- **Price snapshot in OrderItem** — Stores price at purchase time, not live price
- **Prisma transactions for orders** — Stock decrement + order creation is atomic
- **Redis caching** — Product listings cached 5min, individual products 10min
- **Review gate** — Users can only review products they've received (DELIVERED)
- **Cart totals calculated on-the-fly** — Never store totals in DB (prices change)