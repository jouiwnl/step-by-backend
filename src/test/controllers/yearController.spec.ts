import { describe, expect, test, vitest } from 'vitest';
import fastify from 'fastify';
import { appRoutes } from '../../routes';
import { prisma } from '../../lib/prisma';
import { randomUUID } from 'node:crypto';

const app = fastify();
app.register(appRoutes);

describe('year controller test', () => {
  test('get years', async () => {
    const user_id = randomUUID();
    const year = getValidYear(user_id);

    prisma.year.findMany = vitest.fn().mockReturnValueOnce([year]);

    const res = await app.inject({
      method: 'GET',
      url: '/years',
      query: {
        user_id
      }
    })

    const json = await res.json();

    expect(json).toStrictEqual([year]);
    expect(res.statusCode).toBe(200)
  })

  test('create an year', async () => {
    const user_id = randomUUID();
    const year = getValidYear(user_id);

    prisma.year.create = vitest.fn().mockReturnValueOnce(year);

    const res = await app.inject({
      method: 'POST',
      url: '/years',
      payload: year
    })

    const json = await res.json();

    expect(json).toStrictEqual(year);
    expect(res.statusCode).toBe(200)
  })

  test('should not create an existing year', async () => {
    const user_id = randomUUID();
    const year = getValidYear(user_id);

    prisma.year.findFirst = vitest.fn().mockReturnValueOnce(year);
    prisma.year.create = vitest.fn().mockReturnValueOnce(year);

    const res = await app.inject({
      method: 'POST',
      url: '/years',
      payload: year
    })

    const json = await res.json();

    expect(json.message).toBe(`O ano ${year.year_number} já existe!`);
    expect(res.statusCode).toBe(422)
  })

  function getValidYear(user_id: string) {
    return {
      id: randomUUID(),
      year_number: new Date().getFullYear() + 2,
      user_id    
    }
  }
})