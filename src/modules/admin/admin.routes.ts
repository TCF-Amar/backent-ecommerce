import { Response, Router } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { ApiResponse } from "../../utils/ApiResponse";
import { authenticate, authorize, AuthRequest } from "../../middleware/auth.middleware";
import * as adminService from "./admin.service";

// ── Controllers ──────────────────────────────────

const getDashboard = catchAsync(async (_req: AuthRequest, res: Response) => {
  const stats = await adminService.getDashboardStats();
  res.json(new ApiResponse(200, "Dashboard stats", stats));
});

const getRevenueChart = catchAsync(async (req: AuthRequest, res: Response) => {
  const days = Math.min(Number(req.query.days) || 30, 90); // max 90 days
  const data = await adminService.getRevenueChart(days);
  res.json(new ApiResponse(200, "Revenue chart data", data));
});

const getOrdersByStatus = catchAsync(async (_req: AuthRequest, res: Response) => {
  const data = await adminService.getOrdersByStatus();
  res.json(new ApiResponse(200, "Orders by status", data));
});

const getTopProducts = catchAsync(async (req: AuthRequest, res: Response) => {
  const limit = Math.min(Number(req.query.limit) || 10, 20);
  const data = await adminService.getTopProducts(limit);
  res.json(new ApiResponse(200, "Top products", data));
});

const getTopCategories = catchAsync(async (_req: AuthRequest, res: Response) => {
  const data = await adminService.getTopCategories();
  res.json(new ApiResponse(200, "Top categories by revenue", data));
});

const getLowStock = catchAsync(async (req: AuthRequest, res: Response) => {
  const threshold = Number(req.query.threshold) || 10;
  const data = await adminService.getLowStockProducts(threshold);
  res.json(new ApiResponse(200, "Low stock products", data));
});

const getRecentOrders = catchAsync(async (req: AuthRequest, res: Response) => {
  const limit = Math.min(Number(req.query.limit) || 10, 50);
  const data = await adminService.getRecentOrders(limit);
  res.json(new ApiResponse(200, "Recent orders", data));
});

// ── Router ────────────────────────────────────────
// All admin routes locked behind ADMIN role

export const adminRouter = Router();
adminRouter.use(authenticate, authorize("ADMIN"));

adminRouter.get("/dashboard",        getDashboard);
adminRouter.get("/revenue/chart",    getRevenueChart);
adminRouter.get("/orders/status",    getOrdersByStatus);
adminRouter.get("/products/top",     getTopProducts);
adminRouter.get("/products/low-stock", getLowStock);
adminRouter.get("/categories/top",   getTopCategories);
adminRouter.get("/orders/recent",    getRecentOrders);
