import { describe, expect, test, vitest } from 'vitest';
import { prisma } from '../../lib/prisma';
import { randomUUID } from 'node:crypto';
import SummaryService from '../../services/summaryService';
import RedisService from '../../lib/cache';

describe('summary service test', () => {
  const redis = RedisService.redis();

  test('get summary query without cache', async () => {
    const year = new Date().getFullYear();
    const user_id = randomUUID();
    const summary = await SummaryService.getSummary(year, user_id);

    redis.get = vitest.fn().mockReturnValueOnce("")
    prisma.$queryRaw = vitest.fn().mockReturnValueOnce(summary);

    expect(summary).toBeTruthy();
  })

  test('get summary query with cache', async () => {
    const summary = getValidSummary();
    const year = new Date().getFullYear();
    const user_id = randomUUID();

    RedisService.redis = vitest.fn().mockReturnValueOnce(redis);
    redis.get = vitest.fn().mockReturnValue(JSON.stringify(summary))

    const summaryCached = await SummaryService.getSummary(year, user_id);

    expect(summaryCached).toBeTruthy();
  })

  function getValidSummary() {
    return {
      id: randomUUID(),
      date: new Date().toString(),
      completed: 3,
      amount: 3      
    }
  }
})