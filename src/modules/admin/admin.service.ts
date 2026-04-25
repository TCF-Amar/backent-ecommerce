import { prisma } from "../../config/db";
import { getOrSetCache } from "../../config/redis";

/**
 * All analytics are cached aggressively (5–15 mins).
 * These are expensive aggregation queries — we never want them
 * hitting the DB on every dashboard refresh.
 */

// ── Revenue & Orders Overview ─────────────────────

export const getDashboardStats = async () => {
  return getOrSetCache("admin:dashboard:stats", 300, async () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const [
      totalRevenue,
      monthRevenue,
      lastMonthRevenue,
      totalOrders,
      monthOrders,
      pendingOrders,
      totalUsers,
      newUsersThisMonth,
      totalProducts,
      lowStockProducts,
    ] = await prisma.$transaction([
      // All-time revenue (delivered orders only)
      prisma.order.aggregate({
        where: { status: "DELIVERED" },
        _sum: { totalAmount: true },
      }),
      // This month revenue
      prisma.order.aggregate({
        where: { status: "DELIVERED", createdAt: { gte: startOfMonth } },
        _sum: { totalAmount: true },
      }),
      // Last month revenue
      prisma.order.aggregate({
        where: {
          status: "DELIVERED",
          createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
        },
        _sum: { totalAmount: true },
      }),
      // Total orders
      prisma.order.count(),
      // This month orders
      prisma.order.count({ where: { createdAt: { gte: startOfMonth } } }),
      // Pending orders (need attention)
      prisma.order.count({ where: { status: "PENDING" } }),
      // Total users
      prisma.user.count({ where: { role: "USER" } }),
      // New users this month
      prisma.user.count({ where: { createdAt: { gte: startOfMonth }, role: "USER" } }),
      // Total active products
      prisma.product.count({ where: { isActive: true } }),
      // Low stock (< 10 units)
      prisma.product.count({ where: { isActive: true, stock: { lt: 10 } } }),
    ]);

    const thisMonth = monthRevenue._sum.totalAmount ?? 0;
    const lastMonth = lastMonthRevenue._sum.totalAmount ?? 0;
    const revenueGrowth = lastMonth > 0
      ? (((thisMonth - lastMonth) / lastMonth) * 100).toFixed(1)
      : "0";

    return {
      revenue: {
        total: totalRevenue._sum.totalAmount ?? 0,
        thisMonth,
        lastMonth,
        growthPercent: parseFloat(revenueGrowth),
      },
      orders: {
        total: totalOrders,
        thisMonth: monthOrders,
        pending: pendingOrders,
      },
      users: {
        total: totalUsers,
        newThisMonth: newUsersThisMonth,
      },
      products: {
        total: totalProducts,
        lowStock: lowStockProducts,
      },
    };
  });
};

// ── Revenue by Day (Last 30 days) ─────────────────

export const getRevenueChart = async (days = 30) => {
  return getOrSetCache(`admin:revenue:chart:${days}`, 600, async () => {
    const from = new Date();
    from.setDate(from.getDate() - days);

    const orders = await prisma.order.findMany({
      where: { status: "DELIVERED", createdAt: { gte: from } },
      select: { createdAt: true, totalAmount: true },
      orderBy: { createdAt: "asc" },
    });

    // Group by date string "YYYY-MM-DD"
    const grouped: Record<string, number> = {};
    orders.forEach((o: { createdAt: Date; totalAmount: number }) => {
      const date = o.createdAt.toISOString().slice(0, 10);
      grouped[date] = (grouped[date] ?? 0) + o.totalAmount;
    });

    // Fill in missing days with 0 (so chart has continuous x-axis)
    const result: { date: string; revenue: number }[] = [];
    for (let i = days; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const date = d.toISOString().slice(0, 10);
      result.push({ date, revenue: grouped[date] ?? 0 });
    }

    return result;
  });
};

// ── Orders by Status breakdown ────────────────────

export const getOrdersByStatus = async () => {
  return getOrSetCache("admin:orders:by-status", 300, async () => {
    const result = await prisma.order.groupBy({
      by: ["status"],
      _count: { status: true },
    });
    return result.map((r: { status: any; _count: { status: number } }) => ({ status: r.status, count: r._count.status }));
  });
};

// ── Top 10 Best-Selling Products ──────────────────

export const getTopProducts = async (limit = 10) => {
  return getOrSetCache(`admin:top-products:${limit}`, 600, async () => {
    const items = await prisma.orderItem.groupBy({
      by: ["productId"],
      _sum: { quantity: true },
      _count: { productId: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: limit,
    });

    const productIds = items.map((i: any) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, slug: true, images: true, price: true },
    });

    return items.map((item: any) => ({
      product: products.find((p: any) => p.id === item.productId),
      totalSold: item._sum.quantity ?? 0,
      orderCount: item._count.productId,
    }));
  });
};

// ── Top 5 Revenue-Generating Categories ──────────

export const getTopCategories = async () => {
  return getOrSetCache("admin:top-categories", 900, async () => {
    const items = await prisma.orderItem.findMany({
      select: {
        quantity: true,
        price: true,
        product: { select: { categoryId: true } },
      },
    });

    // Aggregate revenue per category
    const catRevenue: Record<string, number> = {};
    items.forEach((item: any) => {
      const catId = item.product.categoryId;
      catRevenue[catId] = (catRevenue[catId] ?? 0) + item.price * item.quantity;
    });

    const sorted = Object.entries(catRevenue)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    const categoryIds = sorted.map(([id]) => id);
    const categories = await prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true, slug: true, image: true },
    });

    return sorted.map(([id, revenue]) => ({
      category: categories.find((c: any) => c.id === id),
      revenue,
    }));
  });
};

// ── Low Stock Products (needs restocking) ─────────

export const getLowStockProducts = async (threshold = 10) => {
  return prisma.product.findMany({
    where: { isActive: true, stock: { lte: threshold } },
    select: {
      id: true, name: true, slug: true, stock: true, sku: true,
      images: true,
      category: { select: { name: true } },
    },
    orderBy: { stock: "asc" },
  });
};

// ── Recent Orders for Admin Feed ──────────────────

export const getRecentOrders = async (limit = 10) => {
  return prisma.order.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    select: {
      id: true, orderNumber: true, status: true,
      totalAmount: true, createdAt: true,
      user: { select: { name: true, email: true } },
      _count: { select: { items: true } },
    },
  });
};
