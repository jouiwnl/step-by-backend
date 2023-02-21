import { describe, expect, test, vitest } from 'vitest';
import fastify from 'fastify';
import { appRoutes } from '../../routes';
import { prisma } from '../../lib/prisma';
import { randomUUID } from 'node:crypto';

const app = fastify();
app.register(appRoutes);

describe('color test', () => {
  test('create an user color palette', async () => {
    const color = createColorWithUserId();

    prisma.color.create = vitest.fn().mockReturnValueOnce(color);

    const res = await app.inject({
      method: 'POST',
      url: '/colors',
      payload: color
    });
  
    expect(await res.json()).toStrictEqual(color);
    expect(res.statusCode).toBe(200);
  })

  test('should not create a color without user id', async () => {
    const color = createColorWithoutUserId();

    prisma.color.create = vitest.fn().mockReturnValueOnce(color);

    const res = await app.inject({
      method: 'POST',
      url: '/colors',
      payload: color
    });
  
    expect(res.statusCode).toBe(500);
  })

  test('should return all colors from an user', async () => {
    const color = createColorWithUserId();

    prisma.color.findFirst = vitest.fn().mockReturnValueOnce(color);

    const res = await app.inject({
      method: 'GET',
      url: `/colors/${color.user_id}`
    });
  
    expect(await res.json()).toStrictEqual(color);
    expect(res.statusCode).toBe(200);
  })

  test('should not update color from a invalid id', async () => {
    const color = updateColor();

    prisma.color.update = vitest.fn().mockReturnValueOnce(color);

    const res = await app.inject({
      method: 'PUT',
      payload: color,
      url: `/colors/${color.id}`
    });
  
    expect(res.statusCode).toBe(404);
    expect((await res.json()).message).toBe("Not found any color with id: " + color.id)
  })

  test('should update color from a valid id', async () => {
    const color = updateColor();

    prisma.color.findFirst = vitest.fn().mockReturnValueOnce(color);
    prisma.color.update = vitest.fn().mockReturnValueOnce(color);

    const res = await app.inject({
      method: 'PUT',
      payload: color,
      url: `/colors/${color.id}`
    });
  
    expect(res.statusCode).toBe(200);
  })
})

function createColorWithUserId() {
  const user_id = "e87ea5a5-52cc-4555-ba08-1c2e10d72a8c";
  return {
    user_id,
    color_1: '#fff',
    color_2: '#fff',
    color_3: '#fff',
    color_4: '#fff',
    color_5: '#fff'
  }
}

function createColorWithoutUserId() {
  const user_id = null;
  return {
    user_id,
    color_1: '#fff',
    color_2: '#fff',
    color_3: '#fff',
    color_4: '#fff',
    color_5: '#fff'
  }
}

function updateColor() {
  return {
    id: randomUUID(),
    color_1: '#123',
    color_2: '#f33',
    color_3: '#ff3',
    color_4: '#fff',
    color_5: '#fff'
  }
}