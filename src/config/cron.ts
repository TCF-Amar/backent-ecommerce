import cron from "node-cron";
import { prisma } from "./db";
import logger from "./logger";

/**
 * Auto-delete expired users.
 *
 * Rules:
 * - isProtected = true  → NEVER deleted (seed/default users)
 * - expiresAt = null    → permanent account, skip
 * - expiresAt < now     → delete along with all related data (cascade)
 *
 * Cascade delete order matters (FK constraints):
 * reviews → orderItems → orders → cartItems → cart → addresses → wishlist → user
 * Prisma schema has onDelete: Cascade on most relations, so deleting user
 * will auto-cascade. But orders have no cascade by default, so we clean manually.
 */

const deleteExpiredUsers = async () => {
  const now = new Date();

  // Find expired, non-protected users
  const expiredUsers = await prisma.user.findMany({
    where: {
      isProtected: false,
      expiresAt: { lt: now, not: null },
    },
    select: { id: true, email: true, expiresAt: true },
  });

  if (expiredUsers.length === 0) {
    logger.debug("Cron: No expired users found");
    return;
  }

  logger.info(`Cron: Found ${expiredUsers.length} expired users to delete`);

  let deleted = 0;
  for (const user of expiredUsers) {
    try {
      // Manual cleanup for tables without cascade
      await prisma.$transaction([
        prisma.review.deleteMany({ where: { userId: user.id } }),
        prisma.orderItem.deleteMany({ where: { order: { userId: user.id } } }),
        prisma.order.deleteMany({ where: { userId: user.id } }),
      ]);

      // Delete user — Prisma cascade handles cart, cartItems, addresses, wishlist
      await prisma.user.delete({ where: { id: user.id } });

      logger.info(`Cron: Deleted expired user ${user.email} (expired: ${user.expiresAt})`);
      deleted++;
    } catch (err: any) {
      logger.error(`Cron: Failed to delete user ${user.email}`, { error: err.message });
    }
  }

  logger.info(`Cron: Cleanup complete — deleted ${deleted}/${expiredUsers.length} users`);
};

export const startCronJobs = () => {
  // Run every day at 2:00 AM
  cron.schedule("0 2 * * *", async () => {
    logger.info("Cron: Starting expired user cleanup job");
    await deleteExpiredUsers();
  });

  // Also run once on server start (catches any missed deletions)
  deleteExpiredUsers().catch((err) =>
    logger.error("Cron: Startup cleanup failed", { error: err.message })
  );

  logger.info("✅ Cron jobs started (cleanup runs daily at 2 AM)");
};
