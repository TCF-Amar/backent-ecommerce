import { Response, Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/db";
import { ApiError } from "../../utils/ApiError";
import { ApiResponse } from "../../utils/ApiResponse";
import { catchAsync } from "../../utils/catchAsync";
import { validate } from "../../middleware/validate.middleware";
import { authenticate, authorize, AuthRequest } from "../../middleware/auth.middleware";
import { getOrSetCache, invalidateCache } from "../../config/redis";

const categorySchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  image: z.string().url().optional(),
});

// ── Service ──────────────────────────────────────

const getAll = async () =>
  getOrSetCache("categories:all", 600, () =>
    prisma.category.findMany({
      where: { isActive: true },
      include: { _count: { select: { products: true } } },
      orderBy: { name: "asc" },
    })
  );

const getBySlug = async (slug: string) => {
  const cat = await prisma.category.findUnique({
    where: { slug },
    include: { _count: { select: { products: true } } },
  });
  if (!cat) throw new ApiError(404, "Category not found");
  return cat;
};

// ── Controllers ──────────────────────────────────

const getAllCategories = catchAsync(async (_req: AuthRequest, res: Response) => {
  const categories = await getAll();
  res.json(new ApiResponse(200, "Categories fetched", categories));
});

const getCategory = catchAsync(async (req: AuthRequest, res: Response) => {
  const category = await getBySlug(req.params.slug);
  res.json(new ApiResponse(200, "Category fetched", category));
});

const createCategory = catchAsync(async (req: AuthRequest, res: Response) => {
  const { name, description, image } = req.body;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const category = await prisma.category.create({ data: { name, slug, description, image } });
  await invalidateCache("categories:*");
  res.status(201).json(new ApiResponse(201, "Category created", category));
});

const updateCategory = catchAsync(async (req: AuthRequest, res: Response) => {
  const category = await prisma.category.update({
    where: { id: req.params.id },
    data: req.body,
  });
  await invalidateCache("categories:*");
  res.json(new ApiResponse(200, "Category updated", category));
});

// ── Router ────────────────────────────────────────

export const categoryRouter = Router();

categoryRouter.get("/", getAllCategories);
categoryRouter.get("/:slug", getCategory);
categoryRouter.post("/", authenticate, authorize("ADMIN"), validate(categorySchema), createCategory);
categoryRouter.patch("/:id", authenticate, authorize("ADMIN"), updateCategory);
