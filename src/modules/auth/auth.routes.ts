import { Response, Router } from "express";
import { z } from "zod";
import { catchAsync } from "../../utils/catchAsync";
import { ApiResponse } from "../../utils/ApiResponse";
import { validate } from "../../middleware/validate.middleware";
import { authenticate, AuthRequest } from "../../middleware/auth.middleware";
import * as authService from "./auth.service";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 chars"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 chars"),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password required"),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token required"),
});

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
};

const ACCESS_TOKEN_EXPIRY = 15 * 60 * 1000; // 15 mins
const REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days

// ── Controllers ──────────────────────────────────

const register = catchAsync(async (req: AuthRequest, res: Response) => {
  const { name, email, password } = req.body;
  const result = await authService.registerUser(name, email, password);

  res.cookie("accessToken", result.accessToken, { ...COOKIE_OPTIONS, maxAge: ACCESS_TOKEN_EXPIRY });
  res.cookie("refreshToken", result.refreshToken, { ...COOKIE_OPTIONS, maxAge: REFRESH_TOKEN_EXPIRY });

  res.status(201).json(new ApiResponse(201, "Registered successfully", {
    user: result.user,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    expiresAt: result.user.expiresAt,
    note: result.user.expiresAt
      ? `Account auto-deletes on ${result.user.expiresAt.toDateString()}`
      : "Permanent account",
  }));
});

const login = catchAsync(async (req: AuthRequest, res: Response) => {
  const { email, password } = req.body;
  const result = await authService.loginUser(email, password);

  res.cookie("accessToken", result.accessToken, { ...COOKIE_OPTIONS, maxAge: ACCESS_TOKEN_EXPIRY });
  res.cookie("refreshToken", result.refreshToken, { ...COOKIE_OPTIONS, maxAge: REFRESH_TOKEN_EXPIRY });

  res.json(new ApiResponse(200, "Login successful", {
    user: result.user,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  }));
});

/**
 * POST /auth/refresh
 * Body: { refreshToken: "..." }
 * Returns new accessToken + rotated refreshToken
 * 
 * Client flow:
 * 1. API call fails with 401
 * 2. Client calls /auth/refresh with stored refreshToken
 * 3. Gets new accessToken → retry the original request
 * 4. If refresh also fails → redirect to login
 */
const refresh = catchAsync(async (req: AuthRequest, res: Response) => {
  const { refreshToken } = req.body;
  const tokens = await authService.refreshAccessToken(refreshToken);

  res.cookie("accessToken", tokens.accessToken, { ...COOKIE_OPTIONS, maxAge: ACCESS_TOKEN_EXPIRY });
  res.cookie("refreshToken", tokens.refreshToken, { ...COOKIE_OPTIONS, maxAge: REFRESH_TOKEN_EXPIRY });

  res.json(new ApiResponse(200, "Token refreshed", {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  }));
});

const logout = catchAsync(async (req: AuthRequest, res: Response) => {
  await authService.logoutUser(req.user!.id);
  res.clearCookie("accessToken", COOKIE_OPTIONS);
  res.clearCookie("refreshToken", COOKIE_OPTIONS);
  res.json(new ApiResponse(200, "Logged out successfully"));
});

const getMe = catchAsync(async (req: AuthRequest, res: Response) => {
  const profile = await authService.getProfile(req.user!.id);
  res.json(new ApiResponse(200, "Profile fetched", profile));
});

// ── Router ────────────────────────────────────────

export const authRouter = Router();

authRouter.post("/register", validate(registerSchema), register);
authRouter.post("/login", validate(loginSchema), login);
authRouter.post("/refresh", validate(refreshSchema), refresh);
authRouter.post("/logout", authenticate, logout);
authRouter.get("/me", authenticate, getMe);
