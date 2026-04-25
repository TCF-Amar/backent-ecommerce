import { Request, Response, NextFunction, RequestHandler } from "express";

/**
 * Wraps async route handlers.
 * Without this, you'd need try-catch in every controller.
 * Any thrown error (including ApiError) gets forwarded to Express error middleware.
 */
export const catchAsync = (fn: RequestHandler): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
