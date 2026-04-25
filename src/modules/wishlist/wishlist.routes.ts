import { Response, Router } from "express";
import { z } from "zod";
import { catchAsync } from "../../utils/catchAsync";
import { ApiResponse } from "../../utils/ApiResponse";
import { validate } from "../../middleware/validate.middleware";
import { authenticate, AuthRequest } from "../../middleware/auth.middleware";
import * as wishlistService from "./wishlist.service";

const productIdSchema = z.object({
  productId: z.string().cuid(),
});

// ── Controllers ──────────────────────────────────

const getWishlist = catchAsync(async (req: AuthRequest, res: Response) => {
  const items = await wishlistService.getWishlist(req.user!.id);
  res.json(new ApiResponse(200, "Wishlist fetched", items));
});

const addItem = catchAsync(async (req: AuthRequest, res: Response) => {
  const item = await wishlistService.addToWishlist(req.user!.id, req.body.productId);
  res.status(201).json(new ApiResponse(201, "Added to wishlist", item));
});

const removeItem = catchAsync(async (req: AuthRequest, res: Response) => {
  await wishlistService.removeFromWishlist(req.user!.id, req.params.productId);
  res.json(new ApiResponse(200, "Removed from wishlist"));
});

const moveToCart = catchAsync(async (req: AuthRequest, res: Response) => {
  await wishlistService.moveToCart(req.user!.id, req.params.productId);
  res.json(new ApiResponse(200, "Moved to cart"));
});

const checkItem = catchAsync(async (req: AuthRequest, res: Response) => {
  const inWishlist = await wishlistService.isInWishlist(req.user!.id, req.params.productId);
  res.json(new ApiResponse(200, "Checked", { inWishlist }));
});

// ── Router ────────────────────────────────────────

export const wishlistRouter = Router();
wishlistRouter.use(authenticate);

wishlistRouter.get("/", getWishlist);
wishlistRouter.post("/", validate(productIdSchema), addItem);
wishlistRouter.delete("/:productId", removeItem);
wishlistRouter.post("/:productId/move-to-cart", moveToCart);
wishlistRouter.get("/:productId/check", checkItem);
