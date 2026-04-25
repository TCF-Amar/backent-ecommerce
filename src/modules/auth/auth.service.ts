import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { prisma } from "../../config/db";
import { ApiError } from "../../utils/ApiError";

const signAccessToken = (id: string, email: string, role: string) =>
  jwt.sign({ id, email, role } as object, process.env.JWT_SECRET as string,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m" } as jwt.SignOptions);

const signRefreshToken = (id: string) =>
  jwt.sign({ id } as object, process.env.JWT_REFRESH_SECRET as string,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d" } as jwt.SignOptions);

const hashToken = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex");

const getUserExpiresAt = (): Date | null => {
  const days = parseInt(process.env.USER_AUTO_DELETE_DAYS || "7");
  if (!days) return null;
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

export const registerUser = async (name: string, email: string, password: string) => {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new ApiError(409, "Email already registered");

  const hashed = await bcrypt.hash(password, 12);
  const expiresAt = getUserExpiresAt();

  const user = await prisma.user.create({
    data: { name, email, password: hashed, expiresAt },
    select: { id: true, name: true, email: true, role: true, expiresAt: true, createdAt: true },
  });

  const accessToken = signAccessToken(user.id, user.email, user.role);
  const refreshToken = signRefreshToken(user.id);
  await prisma.user.update({ where: { id: user.id }, data: { refreshToken: hashToken(refreshToken) } });

  return { user, accessToken, refreshToken };
};

export const loginUser = async (email: string, password: string) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) throw new ApiError(401, "Invalid credentials");

  if (!user.isProtected && user.expiresAt && user.expiresAt < new Date())
    throw new ApiError(401, "Account expired. Please register again.");

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new ApiError(401, "Invalid credentials");

  const accessToken = signAccessToken(user.id, user.email, user.role);
  const refreshToken = signRefreshToken(user.id);
  await prisma.user.update({ where: { id: user.id }, data: { refreshToken: hashToken(refreshToken) } });

  const { password: _, refreshToken: __, ...safeUser } = user;
  return { user: safeUser, accessToken, refreshToken };
};

export const refreshAccessToken = async (incomingRefreshToken: string) => {
  let decoded: { id: string };
  try {
    decoded = jwt.verify(incomingRefreshToken, process.env.JWT_REFRESH_SECRET as string) as { id: string };
  } catch {
    throw new ApiError(401, "Invalid or expired refresh token");
  }

  const user = await prisma.user.findUnique({ where: { id: decoded.id } });
  if (!user || !user.refreshToken || !user.isActive)
    throw new ApiError(401, "Refresh token revoked. Please login again.");

  const hashedIncoming = hashToken(incomingRefreshToken);
  if (hashedIncoming !== user.refreshToken) {
    // Reuse detected — revoke all tokens
    await prisma.user.update({ where: { id: user.id }, data: { refreshToken: null } });
    throw new ApiError(401, "Refresh token reuse detected. Please login again.");
  }

  const newAccessToken = signAccessToken(user.id, user.email, user.role);
  const newRefreshToken = signRefreshToken(user.id);
  await prisma.user.update({ where: { id: user.id }, data: { refreshToken: hashToken(newRefreshToken) } });

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
};

export const logoutUser = async (userId: string) => {
  await prisma.user.update({ where: { id: userId }, data: { refreshToken: null } });
};

export const getProfile = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, name: true, email: true, phone: true,
      role: true, isProtected: true, expiresAt: true, createdAt: true,
      addresses: true,
      _count: { select: { orders: true } },
    },
  });
  if (!user) throw new ApiError(404, "User not found");
  return user;
};
