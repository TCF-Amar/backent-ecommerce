import { prisma } from "../../config/db";
import { ApiError } from "../../utils/ApiError";

/**
 * Gets or creates cart for user.
 * Cart is auto-created on first add — no separate "create cart" API needed.
 */
const getOrCreateCart = async (userId: string) => {
  return prisma.cart.upsert({
    where: { userId },
    create: { userId },
    update: {},
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true, name: true, slug: true, price: true,
              comparePrice: true, images: true, stock: true,
            },
          },
        },
      },
    },
  });
};

export const getCart = async (userId: string) => {
  const cart = await getOrCreateCart(userId);

  // Calculate totals on the fly (don't store in DB — prices can change)
  const subtotal = cart.items.reduce(
    (sum: number, item: any) => sum + item.product.price * item.quantity,
    0
  );
  const savings = cart.items.reduce((sum: number, item: any) => {
    const compare = item.product.comparePrice ?? item.product.price;
    return sum + (compare - item.product.price) * item.quantity;
  }, 0);

  return { ...cart, subtotal, savings, totalItems: cart.items.length };
};

export const addToCart = async (
  userId: string,
  productId: string,
  quantity: number
) => {
  // Validate product exists and has stock
  const product = await prisma.product.findUnique({
    where: { id: productId, isActive: true },
  });
  if (!product) throw new ApiError(404, "Product not found");
  if (product.stock < quantity)
    throw new ApiError(400, `Only ${product.stock} items in stock`);

  const cart = await getOrCreateCart(userId);

  // Check if item already in cart
  const existing = await prisma.cartItem.findUnique({
    where: { cartId_productId: { cartId: cart.id, productId } },
  });

  if (existing) {
    const newQty = existing.quantity + quantity;
    if (product.stock < newQty)
      throw new ApiError(400, `Only ${product.stock} items in stock`);

    await prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: newQty },
    });
  } else {
    await prisma.cartItem.create({
      data: { cartId: cart.id, productId, quantity },
    });
  }

  return getCart(userId);
};

export const updateCartItem = async (
  userId: string,
  itemId: string,
  quantity: number
) => {
  // Ensure item belongs to this user's cart
  const item = await prisma.cartItem.findFirst({
    where: { id: itemId, cart: { userId } },
    include: { product: true },
  });
  if (!item) throw new ApiError(404, "Cart item not found");

  if (quantity <= 0) {
    await prisma.cartItem.delete({ where: { id: itemId } });
  } else {
    if (item.product.stock < quantity)
      throw new ApiError(400, `Only ${item.product.stock} items in stock`);
    await prisma.cartItem.update({ where: { id: itemId }, data: { quantity } });
  }

  return getCart(userId);
};

export const removeFromCart = async (userId: string, itemId: string) => {
  const item = await prisma.cartItem.findFirst({
    where: { id: itemId, cart: { userId } },
  });
  if (!item) throw new ApiError(404, "Cart item not found");
  await prisma.cartItem.delete({ where: { id: itemId } });
  return getCart(userId);
};

export const clearCart = async (userId: string) => {
  const cart = await prisma.cart.findUnique({ where: { userId } });
  if (cart) await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
};
