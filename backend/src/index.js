import http from "node:http";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { Server } from "socket.io";
import { env } from "./config/env.js";
import { connectDatabase } from "./config/db.js";
import { createRedisClients, attachRedisAdapter } from "./config/redis.js";
import apiRoutes from "./routes/index.js";
import { registerCollabHandlers } from "./sockets/collabSocket.js";

function getAllowedOrigins() {
  return String(env.frontendOrigin || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function isLocalhostOrigin(origin) {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/u.test(origin);
}

function isOriginAllowed(origin) {
  if (!origin) {
    return true;
  }
  if (isLocalhostOrigin(origin)) {
    return true;
  }
  const allowed = getAllowedOrigins();
  return allowed.includes(origin);
}

async function bootstrap() {
  await connectDatabase();

  const app = express();
  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        if (isOriginAllowed(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error(`CORS blocked for origin: ${origin}`));
      },
      credentials: true
    })
  );
  app.use(express.json({ limit: "256kb" }));
  app.use("/api", apiRoutes);

  app.use((error, _req, res, _next) => {
    // eslint-disable-next-line no-console
    console.error(error);
    res.status(500).json({ error: error.message || "Internal server error" });
  });

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin(origin, callback) {
        if (isOriginAllowed(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error(`Socket CORS blocked for origin: ${origin}`));
      },
      credentials: true
    }
  });

  try {
    const { pubClient, subClient } = createRedisClients();
    await Promise.all([pubClient.ping(), subClient.ping()]);
    attachRedisAdapter(io, pubClient, subClient);
    // eslint-disable-next-line no-console
    console.log("Socket.io Redis adapter enabled");
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn("Redis unavailable. Running Socket.io without Redis adapter.");
  }
  registerCollabHandlers(io);

  server.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`Backend running on http://localhost:${env.port}`);
  });
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Failed to start backend:", error);
  process.exit(1);
});
