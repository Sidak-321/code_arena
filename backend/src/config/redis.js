import Redis from "ioredis";
import { createAdapter } from "@socket.io/redis-adapter";
import { env } from "./env.js";

export function createRedisClients() {
  const options = {
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1
  };
  const pubClient = new Redis(env.redisUrl, options);
  const subClient = pubClient.duplicate();
  pubClient.on("error", () => {});
  subClient.on("error", () => {});
  return { pubClient, subClient };
}

export function attachRedisAdapter(io, pubClient, subClient) {
  io.adapter(createAdapter(pubClient, subClient));
}
