import { prisma } from "../../config/db";
import { ApiError } from "../../utils/ApiError";

/**
 * Wishlist is a simple many-to-many between User <-> Product.
 * We use a dedicated join table (not Prisma implicit) so we can
 * add metadata later (e.g., added_at, notes, share token).
 */

export const getWishlist = async (userId: string) => {
  const items = await prisma.wishlistItem.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      product: {
        select: {
          id: true, name: true, slug: true, price: true,
          comparePrice: true, images: true, rating: true,
          stock: true, isActive: true,
          category: { select: { name: true, slug: true } },
        },
      },
    },
  });
  return items;
};

export const addToWishlist = async (userId: string, productId: string) => {
  const product = await prisma.product.findUnique({
    where: { id: productId, isActive: true },
  });
  if (!product) throw new ApiError(404, "Product not found");

  // upsert prevents duplicate wishlist items without throwing
  const item = await prisma.wishlistItem.upsert({
    where: { userId_productId: { userId, productId } },
    update: {}, // already exists, do nothing
    create: { userId, productId },
    include: { product: { select: { name: true, images: true } } },
  });

  return item;
};

export const removeFromWishlist = async (userId: string, productId: string) => {
  const item = await prisma.wishlistItem.findUnique({
    where: { userId_productId: { userId, productId } },
  });
  if (!item) throw new ApiError(404, "Item not in wishlist");

  await prisma.wishlistItem.delete({
    where: { userId_productId: { userId, productId } },
  });
};

export const moveToCart = async (userId: string, productId: string) => {
  /**
   * Move to cart: add to cart first, then remove from wishlist.
   * If add-to-cart fails (out of stock), wishlist is preserved.
   */
  const { addToCart } = await import("../cart/cart.service");
  await addToCart(userId, productId, 1);
  await removeFromWishlist(userId, productId);
};

export const isInWishlist = async (userId: string, productId: string) => {
  const item = await prisma.wishlistItem.findUnique({
    where: { userId_productId: { userId, productId } },
  });
  return !!item;
};
