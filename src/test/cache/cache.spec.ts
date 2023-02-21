import { Redis } from 'ioredis';
import { describe, expect, test, vitest } from 'vitest';
import RedisService from '../../lib/cache';

describe("cache test", () => {
  test('should not create a instance of redis without host', () => {
    const originalRedisHost = process.env.REDIS_HOST;
    delete process.env.REDIS_HOST;
  
    expect(() => {
      RedisService.redis();
    }).toThrowError('Failed to connect to Redis.');
  
    process.env.REDIS_HOST = originalRedisHost;
  });
})