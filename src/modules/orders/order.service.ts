import { prisma } from "../../config/db";
import { ApiError } from "../../utils/ApiError";
import { clearCart } from "../cart/cart.service";

/**
 * Generates a human-readable order number: ORD-YYYYMMDD-XXXX
 * More readable than CUID for customer-facing use.
 */
const generateOrderNumber = () => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `ORD-${date}-${rand}`;
};

export const placeOrder = async (
  userId: string,
  addressId?: string,
  note?: string
) => {
  // Fetch cart with items
  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: { include: { product: true } },
    },
  });

  if (!cart || cart.items.length === 0)
    throw new ApiError(400, "Cart is empty");

  // Validate stock for all items before creating order
  // This prevents partial orders if one item is out of stock
  for (const item of cart.items) {
    if (!item.product.isActive)
      throw new ApiError(400, `Product "${item.product.name}" is no longer available`);
    if (item.product.stock < item.quantity)
      throw new ApiError(
        400,
        `Insufficient stock for "${item.product.name}". Available: ${item.product.stock}`
      );
  }

  const totalAmount = cart.items.reduce(
    (sum: number, item: any) => sum + item.product.price * item.quantity,
    0
  );

  /**
   * Using a Prisma transaction here is CRITICAL.
   * Without it: if stock decrement succeeds but order creation fails,
   * stock is decremented with no corresponding order — data corruption.
   * Transaction ensures either ALL succeed or ALL rollback.
   */
  const order = await prisma.$transaction(async (tx: any) => {
    // Create the order with snapshot prices
    const newOrder = await tx.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        userId,
        addressId,
        note,
        totalAmount,
        items: {
          create: cart.items.map((item: any) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.product.price, // snapshot — price at time of purchase
          })),
        },
      },
      include: {
        items: { include: { product: { select: { name: true, images: true } } } },
        address: true,
      },
    });

    // Decrement stock for each product
    for (const item of cart.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      });
    }

    return newOrder;
  });

  // Clear cart after successful order (outside transaction is fine)
  await clearCart(userId);

  return order;
};

export const getUserOrders = async (userId: string, page = 1, limit = 10) => {
  const skip = (page - 1) * limit;

  const [orders, total] = await prisma.$transaction([
    prisma.order.findMany({
      where: { userId },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          include: { product: { select: { name: true, images: true, slug: true } } },
        },
      },
    }),
    prisma.order.count({ where: { userId } }),
  ]);

  return { orders, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } };
};

export const getOrderById = async (orderId: string, userId: string) => {
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId }, // userId check prevents accessing other user's orders
    include: {
      items: { include: { product: { select: { name: true, images: true, slug: true } } } },
      address: true,
    },
  });
  if (!order) throw new ApiError(404, "Order not found");
  return order;
};

export const updateOrderStatus = async (orderId: string, status: string) => {
  const order = await prisma.order.update({
    where: { id: orderId },
    data: { status: status as any },
  });
  return order;
};

export const cancelOrder = async (orderId: string, userId: string) => {
  const order = await prisma.order.findFirst({ where: { id: orderId, userId } });
  if (!order) throw new ApiError(404, "Order not found");

  // Only pending/confirmed orders can be cancelled
  if (!["PENDING", "CONFIRMED"].includes(order.status))
    throw new ApiError(400, `Cannot cancel an order with status: ${order.status}`);

  /**
   * Restore stock when order is cancelled.
   * Again using a transaction to keep order status + stock in sync.
   */
  return prisma.$transaction(async (tx: any) => {
    const updated = await tx.order.update({
      where: { id: orderId },
      data: { status: "CANCELLED" },
      include: { items: true },
    });

    for (const item of updated.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      });
    }

    return updated;
  });
};

// Admin: get all orders with pagination + filter by status
export const getAllOrders = async (page = 1, limit = 20, status?: string) => {
  const skip = (page - 1) * limit;
  const where = status ? { status: status as any } : {};

  const [orders, total] = await prisma.$transaction([
    prisma.order.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, email: true } },
        items: { select: { quantity: true, price: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);

  return { orders, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } };
};
