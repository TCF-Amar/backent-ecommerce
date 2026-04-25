import { Response, Router } from "express";
import { z } from "zod";
import { catchAsync } from "../../utils/catchAsync";
import { ApiResponse } from "../../utils/ApiResponse";
import { validate } from "../../middleware/validate.middleware";
import { authenticate, authorize, AuthRequest } from "../../middleware/auth.middleware";
import * as orderService from "./order.service";

const placeOrderSchema = z.object({
  addressId: z.string().cuid().optional(),
  note: z.string().max(500).optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"]),
});

// ── Controllers ──────────────────────────────────

const placeOrder = catchAsync(async (req: AuthRequest, res: Response) => {
  const { addressId, note } = req.body;
  const order = await orderService.placeOrder(req.user!.id, addressId, note);
  res.status(201).json(new ApiResponse(201, "Order placed successfully", order));
});

const getMyOrders = catchAsync(async (req: AuthRequest, res: Response) => {
  const result = await orderService.getUserOrders(
    req.user!.id,
    Number(req.query.page) || 1,
    Number(req.query.limit) || 10
  );
  res.json(new ApiResponse(200, "Orders fetched", result.orders, { pagination: result.pagination }));
});

const getMyOrder = catchAsync(async (req: AuthRequest, res: Response) => {
  const order = await orderService.getOrderById(req.params.id, req.user!.id);
  res.json(new ApiResponse(200, "Order fetched", order));
});

const cancelOrder = catchAsync(async (req: AuthRequest, res: Response) => {
  const order = await orderService.cancelOrder(req.params.id, req.user!.id);
  res.json(new ApiResponse(200, "Order cancelled", order));
});

// Admin controllers
const getAllOrders = catchAsync(async (req: AuthRequest, res: Response) => {
  const result = await orderService.getAllOrders(
    Number(req.query.page) || 1,
    Number(req.query.limit) || 20,
    req.query.status as string
  );
  res.json(new ApiResponse(200, "All orders", result.orders, { pagination: result.pagination }));
});

const updateStatus = catchAsync(async (req: AuthRequest, res: Response) => {
  const order = await orderService.updateOrderStatus(req.params.id, req.body.status);
  res.json(new ApiResponse(200, "Order status updated", order));
});

// ── Router ────────────────────────────────────────

export const orderRouter = Router();

orderRouter.use(authenticate);

// User routes
orderRouter.post("/", validate(placeOrderSchema), placeOrder);
orderRouter.get("/my", getMyOrders);
orderRouter.get("/my/:id", getMyOrder);
orderRouter.patch("/my/:id/cancel", cancelOrder);

// Admin routes
orderRouter.get("/", authorize("ADMIN"), getAllOrders);
orderRouter.patch("/:id/status", authorize("ADMIN"), validate(updateStatusSchema), updateStatus);
