import { describe, expect, test, vitest } from 'vitest';
import fastify from 'fastify';
import { appRoutes } from '../../routes';
import { prisma } from '../../lib/prisma';
import { randomUUID } from 'node:crypto';
import dayjs from 'dayjs';
import SummaryService from '../../services/summaryService';

const app = fastify();
app.register(appRoutes);

describe('user controller test', () => {
  test('create a new user', async () => {
    const user = getUserBody();

    prisma.user.create = vitest.fn().mockReturnValueOnce(user);

    const res = await app.inject({
      method: 'POST',
      url: '/users',
      payload: user
    })

    const json = await res.json();

    expect(json).toStrictEqual(user);
    expect(res.statusCode).toBe(200)
  })

  test('get user by email', async () => {
    const user = getUserResponse();

    prisma.user.findFirst = vitest.fn().mockReturnValueOnce(user);

    const res = await app.inject({
      method: 'GET',
      url: `/users/${user.email}`
    })

    const json = await res.json();

    expect(json).toStrictEqual(user);
    expect(res.statusCode).toBe(200)
  })

  test('create notification token by user', async () => {
    const token = "123456FFF";
    const user_id = randomUUID();
    const createdToken = getValidNotificationToken(user_id, token);

    prisma.notificationToken.create = vitest.fn().mockReturnValueOnce(createdToken);

    const res = await app.inject({
      method: 'POST',
      url: `/token`,
      payload: {
        token,
        user_id
      }
    })

    const json = await res.json();

    expect(json).toStrictEqual(createdToken);
    expect(res.statusCode).toBe(200)
  })

  test('get token by token string', async () => {
    const token = "123456FFF";
    const findedToken = getValidNotificationToken(randomUUID(), token);

    prisma.notificationToken.findFirst = vitest.fn().mockReturnValueOnce(findedToken);

    const res = await app.inject({
      method: 'GET',
      url: `/token`,
      query: {
        token
      }
    })

    const json = await res.json();

    expect(json).toStrictEqual(findedToken);
    expect(res.statusCode).toBe(200)
  })

  function getUserBody() {
    return {
      email: "jou.098olo@gmail.com"
    }
  }

  function getUserResponse() {
    const user_id = randomUUID();
    return {
      id: user_id,
      email: "jou.098olo@gmail.com",
      color: {
        id: randomUUID(),
        color_1: '#fff',
        color_2: '#fff',
        color_3: '#fff',
        color_4: '#fff',
        color_5: '#fff',
        user_id
      }
    }
  }

  function getValidNotificationToken(user_id: string, token: string) {
    return {
      id: randomUUID(),
      user_id,
      token
    }
  }
})