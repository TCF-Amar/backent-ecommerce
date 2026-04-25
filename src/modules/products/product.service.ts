import { prisma } from "../../config/db";
import { ApiError } from "../../utils/ApiError";
import { getOrSetCache, invalidateCache } from "../../config/redis";

interface ProductQuery {
  page?: number;
  limit?: number;
  category?: string;       // category slug
  search?: string;         // name search
  minPrice?: number;
  maxPrice?: number;
  sort?: "price_asc" | "price_desc" | "rating" | "newest";
  tags?: string;
}

export const getAllProducts = async (query: ProductQuery) => {
  const {
    page = 1,
    limit = 20,
    category,
    search,
    minPrice,
    maxPrice,
    sort = "newest",
    tags,
  } = query;

  const skip = (page - 1) * limit;

  // Build dynamic where clause
  const where: any = { isActive: true };

  if (category) {
    where.category = { slug: category };
  }
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }
  if (minPrice || maxPrice) {
    where.price = {};
    if (minPrice) where.price.gte = minPrice;
    if (maxPrice) where.price.lte = maxPrice;
  }
  if (tags) {
    where.tags = { hasSome: tags.split(",") };
  }

  // Sort options
  const orderBy: any =
    sort === "price_asc" ? { price: "asc" }
    : sort === "price_desc" ? { price: "desc" }
    : sort === "rating" ? { rating: "desc" }
    : { createdAt: "desc" };

  const cacheKey = `products:${JSON.stringify({ where, skip, limit, orderBy })}`;

  return getOrSetCache(cacheKey, 300, async () => {
    const [products, total] = await prisma.$transaction([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true, name: true, slug: true, price: true, comparePrice: true,
          images: true, rating: true, reviewCount: true, stock: true, tags: true,
          category: { select: { name: true, slug: true } },
        },
      }),
      prisma.product.count({ where }),
    ]);

    return {
      products,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  });
};

export const getProductBySlug = async (slug: string) => {
  return getOrSetCache(`product:${slug}`, 600, async () => {
    const product = await prisma.product.findUnique({
      where: { slug, isActive: true },
      include: {
        category: { select: { name: true, slug: true } },
        reviews: {
          take: 10,
          orderBy: { createdAt: "desc" },
          select: {
            id: true, rating: true, comment: true, createdAt: true,
            user: { select: { name: true } },
          },
        },
      },
    });
    if (!product) throw new ApiError(404, "Product not found");
    return product;
  });
};

export const createProduct = async (data: {
  name: string; description: string; price: number; comparePrice?: number;
  stock: number; sku: string; images: string[]; tags: string[]; categoryId: string;
}) => {
  const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  const product = await prisma.product.create({
    data: { ...data, slug },
  });

  await invalidateCache("products:*");
  return product;
};

export const updateProduct = async (id: string, data: Partial<{
  name: string; description: string; price: number; comparePrice: number;
  stock: number; images: string[]; tags: string[]; isActive: boolean;
}>) => {
  const product = await prisma.product.update({
    where: { id },
    data,
  });
  await invalidateCache(`products:*`);
  await invalidateCache(`product:${product.slug}`);
  return product;
};

export const deleteProduct = async (id: string) => {
  const product = await prisma.product.update({
    where: { id },
    data: { isActive: false }, // Soft delete — don't break order history
  });
  await invalidateCache("products:*");
  await invalidateCache(`product:${product.slug}`);
};
