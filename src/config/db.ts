import { PrismaClient } from "@prisma/client";

/**
 * In development, Next.js / ts-node-dev hot reloads create new PrismaClient
 * instances on every reload, exhausting the connection pool.
 * This singleton pattern prevents that.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
