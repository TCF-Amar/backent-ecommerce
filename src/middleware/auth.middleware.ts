import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError";
import { prisma } from "../config/db";

export interface AuthRequest extends Request {
  user?: { id: string; email: string; role: string };
}

// Verify JWT and attach user to request
export const authenticate = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  try {
    let token = req.headers.authorization?.split(" ")[1]; // Bearer <token>

    // Fallback to cookie
    if (!token && req.cookies) {
      token = req.cookies.accessToken;
    }

    if (!token) throw new ApiError(401, "Access token required");

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: string;
      email: string;
      role: string;
    };

    // Check user still exists (handles deleted accounts)
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, role: true, isActive: true },
    });

    if (!user || !user.isActive) throw new ApiError(401, "Unauthorized");

    req.user = user;
    next();
  } catch (err) {
    if (err instanceof jwt.JsonWebTokenError) {
      return next(new ApiError(401, "Invalid or expired token"));
    }
    next(err);
  }
};

// Role-based guard — use after authenticate
export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ApiError(403, "Forbidden: insufficient permissions"));
    }
    next();
  };
};
