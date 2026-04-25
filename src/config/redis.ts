import { createClient } from "redis";

const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

redisClient.on("error", (err) => {
  // Log but don't crash — app should still work without Redis
  console.error("❌ Redis error:", err.message);
});

redisClient.on("connect", () => {
  console.log("✅ Redis connected");
});

export const connectRedis = async () => {
  try {
    await redisClient.connect();
  } catch (err) {
    console.warn("⚠️ Redis connection failed. Caching disabled.");
  }
};

// Helper: get from cache or set it
export const getOrSetCache = async <T>(
  key: string,
  ttlSeconds: number,
  fetchFn: () => Promise<T>
): Promise<T> => {
  try {
    const cached = await redisClient.get(key);
    if (cached) return JSON.parse(cached) as T;

    const fresh = await fetchFn();
    await redisClient.setEx(key, ttlSeconds, JSON.stringify(fresh));
    return fresh;
  } catch {
    // Redis down? Just fetch from DB
    return fetchFn();
  }
};

export const invalidateCache = async (pattern: string) => {
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length) await redisClient.del(keys);
  } catch {
    // Silent fail
  }
};

export default redisClient;
