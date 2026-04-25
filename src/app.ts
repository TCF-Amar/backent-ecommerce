import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";

import { connectRedis } from "./config/redis";
import { startCronJobs } from "./config/cron";
import logger from "./config/logger";
import { errorMiddleware } from "./middleware/error.middleware";
import { requestLogger } from "./middleware/requestLogger.middleware";
import { ApiResponse } from "./utils/ApiResponse";

// Module routes
import { authRouter } from "./modules/auth/auth.routes";
import { productRouter } from "./modules/products/product.routes";
import { categoryRouter } from "./modules/categories/category.routes";
import { cartRouter } from "./modules/cart/cart.routes";
import { orderRouter } from "./modules/orders/order.routes";
import { userRouter } from "./modules/users/user.routes";
import { wishlistRouter } from "./modules/wishlist/wishlist.routes";
import { adminRouter } from "./modules/admin/admin.routes";

const app = express();
const PORT = process.env.PORT || 5000;

// ── Security middleware ───────────────────────────

app.use(helmet());         // Sets secure HTTP headers
app.use(cors({
  origin: process.env.NODE_ENV === "production"
    ? process.env.CLIENT_URL
    : "*",
  credentials: true,
}));

// Global rate limiter — prevents brute force / DDoS
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, slow down!" },
});
app.use("/api", limiter);

// Stricter rate limit on auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,// 15 minutes
  max: 10,
  message: { success: false, message: "Too many auth attempts" },
});

// ── Body parsing ──────────────────────────────────

app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());
app.use(compression()); // Gzip responses
app.use(requestLogger); // Log every HTTP request

// ── Health check ──────────────────────────────────

app.get("/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime(), env: process.env.NODE_ENV });
});

// ── API Routes ────────────────────────────────────

const API = "/api/v1";

app.use(`${API}/auth`, authLimiter, authRouter);
app.use(`${API}/products`, productRouter);
app.use(`${API}/categories`, categoryRouter);
app.use(`${API}/cart`, cartRouter);
app.use(`${API}/orders`, orderRouter);
app.use(`${API}/users`, userRouter);
app.use(`${API}/wishlist`, wishlistRouter);
app.use(`${API}/admin`, adminRouter);

// 404 handler
app.all("*", (req, res) => {
  res.status(404).json(new ApiResponse(404, `Route ${req.originalUrl} not found`));
});

// Global error handler (must be last)
app.use(errorMiddleware);

// ── Start ─────────────────────────────────────────

const start = async () => {
  await connectRedis();
  startCronJobs();
  app.listen(PORT, () => {
    logger.info(`🚀 Server running on http://localhost:${PORT}`);
    logger.info(`📦 Environment: ${process.env.NODE_ENV}`);
  });

  // Handle unhandled promise rejections globally
  process.on("unhandledRejection", (err: Error) => {
    logger.error("Unhandled Rejection", { message: err.message, stack: err.stack });
  });
  process.on("uncaughtException", (err: Error) => {
    logger.error("Uncaught Exception", { message: err.message, stack: err.stack });
    process.exit(1);
  });
};

start();

export default app;
