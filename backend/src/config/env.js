import dotenv from "dotenv";

dotenv.config();

const required = ["MONGODB_URI", "REDIS_URL", "JUDGE0_BASE_URL"];

for (const key of required) {
  if (!process.env[key]) {
    // eslint-disable-next-line no-console
    console.warn(`[env] Missing ${key}. Check backend/.env.example`);
  }
}

export const env = {
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || "development",
  frontendOrigin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
  mongoUri: process.env.MONGODB_URI,
  redisUrl: process.env.REDIS_URL,
  judge0BaseUrl: process.env.JUDGE0_BASE_URL,
  judge0ApiKey: process.env.JUDGE0_API_KEY,
  judge0ApiHost: process.env.JUDGE0_API_HOST,
  runRateLimitWindowMs: Number(process.env.RUN_RATE_LIMIT_WINDOW_MS || 60000),
  runRateLimitMax: Number(process.env.RUN_RATE_LIMIT_MAX || 30),
  maxSourceSize: Number(process.env.MAX_SOURCE_SIZE || 20000)
};
