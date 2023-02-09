import Redis from 'ioredis';

const redisHost = process.env.REDIS_HOST;

if (!redisHost) {
  throw new Error("Failed to connect to Redis.")
}

export const redis = new Redis(redisHost);