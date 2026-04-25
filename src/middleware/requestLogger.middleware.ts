import { Request, Response, NextFunction } from "express";
import logger from "../config/logger";

/**
 * Logs every HTTP request with method, path, status, and response time.
 * Skips /health to avoid log spam from uptime monitors.
 */
export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.path === "/health") return next();

  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    };

    // Color-code by status: 4xx = warn, 5xx = error, else info
    if (res.statusCode >= 500) {
      logger.error("HTTP Request", logData);
    } else if (res.statusCode >= 400) {
      logger.warn("HTTP Request", logData);
    } else {
      logger.info("HTTP Request", logData);
    }
  });

  next();
};
