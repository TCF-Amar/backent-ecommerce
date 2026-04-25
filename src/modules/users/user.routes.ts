import { Response, Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/db";
import { ApiError } from "../../utils/ApiError";
import { ApiResponse } from "../../utils/ApiResponse";
import { catchAsync } from "../../utils/catchAsync";
import { validate } from "../../middleware/validate.middleware";
import { authenticate, AuthRequest } from "../../middleware/auth.middleware";

const addressSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(10),
  line1: z.string().min(5),
  line2: z.string().optional(),
  city: z.string().min(2),
  state: z.string().min(2),
  pincode: z.string().length(6),
  isDefault: z.boolean().default(false),
});

const reviewSchema = z.object({
  productId: z.string().cuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
});

// ── Address Controllers ───────────────────────────

const getAddresses = catchAsync(async (req: AuthRequest, res: Response) => {
  const addresses = await prisma.address.findMany({ where: { userId: req.user!.id } });
  res.json(new ApiResponse(200, "Addresses fetched", addresses));
});

const addAddress = catchAsync(async (req: AuthRequest, res: Response) => {
  // If this is default, unset other defaults first
  if (req.body.isDefault) {
    await prisma.address.updateMany({
      where: { userId: req.user!.id },
      data: { isDefault: false },
    });
  }
  const address = await prisma.address.create({
    data: { ...req.body, userId: req.user!.id },
  });
  res.status(201).json(new ApiResponse(201, "Address added", address));
});

const deleteAddress = catchAsync(async (req: AuthRequest, res: Response) => {
  const address = await prisma.address.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
  });
  if (!address) throw new ApiError(404, "Address not found");
  await prisma.address.delete({ where: { id: req.params.id } });
  res.json(new ApiResponse(200, "Address deleted"));
});

// ── Review Controllers ────────────────────────────

const addReview = catchAsync(async (req: AuthRequest, res: Response) => {
  const { productId, rating, comment } = req.body;

  // Check if user bought this product
  const purchased = await prisma.orderItem.findFirst({
    where: {
      productId,
      order: { userId: req.user!.id, status: "DELIVERED" },
    },
  });
  if (!purchased)
    throw new ApiError(403, "You can only review products you have purchased");

  const review = await prisma.review.upsert({
    where: { userId_productId: { userId: req.user!.id, productId } },
    update: { rating, comment },
    create: { userId: req.user!.id, productId, rating, comment },
  });

  // Update product's aggregate rating
  const agg = await prisma.review.aggregate({
    where: { productId },
    _avg: { rating: true },
    _count: { rating: true },
  });

  await prisma.product.update({
    where: { id: productId },
    data: {
      rating: agg._avg.rating ?? 0,
      reviewCount: agg._count.rating,
    },
  });

  res.status(201).json(new ApiResponse(201, "Review submitted", review));
});

// ── Router ────────────────────────────────────────

export const userRouter = Router();

userRouter.use(authenticate);

userRouter.get("/addresses", getAddresses);
userRouter.post("/addresses", validate(addressSchema), addAddress);
userRouter.delete("/addresses/:id", deleteAddress);
userRouter.post("/reviews", validate(reviewSchema), addReview);
