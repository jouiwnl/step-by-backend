import { describe, expect, test, vitest } from 'vitest';
import fastify from 'fastify';
import { appRoutes } from '../../routes';
import { randomUUID } from 'node:crypto';
import SummaryService from '../../services/summaryService';

const app = fastify();
app.register(appRoutes);

describe('summary controller test', () => {
  test('get summary by user', async () => {
    const user_id = randomUUID();
    const year = new Date().getFullYear();
    const summary = getValidSummary();

    SummaryService.getSummary = vitest.fn().mockReturnValueOnce(summary);

    const res = await app.inject({
      method: 'GET',
      url: '/summary',
      query: {
        user_id,
        year: year.toString()
      }
    })

    const json = await res.json();

    expect(json).toStrictEqual(summary);
    expect(res.statusCode).toBe(200)
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