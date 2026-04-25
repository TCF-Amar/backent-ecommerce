import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/ApiError";
import logger from "../config/logger";

export const errorMiddleware = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  // Known operational error
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors || [],
    });
  }

  // Prisma unique constraint violation (e.g., duplicate email)
  if ((err as any).code === "P2002") {
    return res.status(409).json({
      success: false,
      message: `Duplicate value for field: ${(err as any).meta?.target?.join(", ")}`,
    });
  }

  // Prisma record not found
  if ((err as any).code === "P2025") {
    return res.status(404).json({ success: false, message: "Record not found" });
  }

  // Unknown/unhandled errors — don't leak internals in production
  logger.error("Unhandled error", { message: err.message, stack: err.stack });
  return res.status(500).json({
    success: false,
    message:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message,
  });
};
