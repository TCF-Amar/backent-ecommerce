import { Response, Router } from "express";
import { z } from "zod";
import { catchAsync } from "../../utils/catchAsync";
import { ApiResponse } from "../../utils/ApiResponse";
import { validate } from "../../middleware/validate.middleware";
import { authenticate, authorize, AuthRequest } from "../../middleware/auth.middleware";
import * as productService from "./product.service";

const createProductSchema = z.object({
  name: z.string().min(2),
  description: z.string().min(10),
  price: z.number().positive(),
  comparePrice: z.number().positive().optional(),
  stock: z.number().int().min(0),
  sku: z.string().min(3),
  images: z.array(z.string().url()).min(1),
  tags: z.array(z.string()).default([]),
  categoryId: z.string().cuid(),
});

// ── Controllers ──────────────────────────────────

const getAll = catchAsync(async (req: AuthRequest, res: Response) => {
  const result = await productService.getAllProducts({
    page: Number(req.query.page) || 1,
    limit: Math.min(Number(req.query.limit) || 20, 100), // max 100/page
    category: req.query.category as string,
    search: req.query.search as string,
    minPrice: req.query.minPrice ? Number(req.query.minPrice) : undefined,
    maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) : undefined,
    sort: req.query.sort as any,
    tags: req.query.tags as string,
  });
  res.json(new ApiResponse(200, "Products fetched", result.products, { pagination: result.pagination }));
});

const getOne = catchAsync(async (req: AuthRequest, res: Response) => {
  const product = await productService.getProductBySlug(req.params.slug);
  res.json(new ApiResponse(200, "Product fetched", product));
});

const create = catchAsync(async (req: AuthRequest, res: Response) => {
  const product = await productService.createProduct(req.body);
  res.status(201).json(new ApiResponse(201, "Product created", product));
});

const update = catchAsync(async (req: AuthRequest, res: Response) => {
  const product = await productService.updateProduct(req.params.id, req.body);
  res.json(new ApiResponse(200, "Product updated", product));
});

const remove = catchAsync(async (req: AuthRequest, res: Response) => {
  await productService.deleteProduct(req.params.id);
  res.json(new ApiResponse(200, "Product deleted"));
});

// ── Router ────────────────────────────────────────

export const productRouter = Router();

// Public
productRouter.get("/", getAll);
productRouter.get("/:slug", getOne);

// Admin only
productRouter.post("/", authenticate, authorize("ADMIN"), validate(createProductSchema), create);
productRouter.patch("/:id", authenticate, authorize("ADMIN"), update);
productRouter.delete("/:id", authenticate, authorize("ADMIN"), remove);
