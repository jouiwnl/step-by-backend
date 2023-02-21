import Redis from 'ioredis';

export default class RedisService {
  static redis() {
    const redisHost = process.env.REDIS_HOST;

    if (!redisHost) {
      throw new Error("Failed to connect to Redis.")
    }

    return new Redis(redisHost);
  }
}