import { Response, Router } from "express";
import { z } from "zod";
import { catchAsync } from "../../utils/catchAsync";
import { ApiResponse } from "../../utils/ApiResponse";
import { validate } from "../../middleware/validate.middleware";
import { authenticate, AuthRequest } from "../../middleware/auth.middleware";
import * as cartService from "./cart.service";

const addItemSchema = z.object({
  productId: z.string().cuid(),
  quantity: z.number().int().positive().default(1),
});

const updateItemSchema = z.object({
  quantity: z.number().int().min(0), // 0 = remove
});

// ── Controllers ──────────────────────────────────

const getCart = catchAsync(async (req: AuthRequest, res: Response) => {
  const cart = await cartService.getCart(req.user!.id);
  res.json(new ApiResponse(200, "Cart fetched", cart));
});

const addItem = catchAsync(async (req: AuthRequest, res: Response) => {
  const { productId, quantity } = req.body;
  const cart = await cartService.addToCart(req.user!.id, productId, quantity);
  res.json(new ApiResponse(200, "Item added to cart", cart));
});

const updateItem = catchAsync(async (req: AuthRequest, res: Response) => {
  const { quantity } = req.body;
  const cart = await cartService.updateCartItem(req.user!.id, req.params.itemId, quantity);
  res.json(new ApiResponse(200, "Cart updated", cart));
});

const removeItem = catchAsync(async (req: AuthRequest, res: Response) => {
  const cart = await cartService.removeFromCart(req.user!.id, req.params.itemId);
  res.json(new ApiResponse(200, "Item removed", cart));
});

const clearCart = catchAsync(async (req: AuthRequest, res: Response) => {
  await cartService.clearCart(req.user!.id);
  res.json(new ApiResponse(200, "Cart cleared"));
});

// ── Router ────────────────────────────────────────

export const cartRouter = Router();

// All cart routes require auth — cart is user-specific
cartRouter.use(authenticate);

cartRouter.get("/", getCart);
cartRouter.post("/items", validate(addItemSchema), addItem);
cartRouter.patch("/items/:itemId", validate(updateItemSchema), updateItem);
cartRouter.delete("/items/:itemId", removeItem);
cartRouter.delete("/", clearCart);
