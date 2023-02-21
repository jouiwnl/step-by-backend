import { describe, expect, test, vitest } from 'vitest';
import fastify from 'fastify';
import { appRoutes } from '../../routes';
import { prisma } from '../../lib/prisma';
import { randomUUID } from 'node:crypto';
import dayjs from 'dayjs';
import RedisService from '../../lib/cache';

const app = fastify();
app.register(appRoutes);

describe('habit controller test', () => {
  const redis = RedisService.redis();

  test('should create a valid habit', async () => {
    const user_id = randomUUID();
    const validBody = bodyHabit(user_id);

    prisma.habit.create = vitest.fn().mockReturnValueOnce(validBody);

    const res = await app.inject({
      method: 'POST',
      url: '/habits',
      payload: validBody
    });

    expect(res.statusCode).toBe(200);
  })

  test('should get all habits from an user', async () => {
    const user_id = randomUUID();
    const year = new Date().getFullYear();

    const validBody = bodyHabit(user_id);

    prisma.$queryRaw = vitest.fn().mockReturnValueOnce([validBody]);

    const res = await app.inject({
      method: 'GET',
      url: '/habits',
      query: {
        user_id,
        year: year.toString()
      }
    });

    const json = await res.json();

    expect(json).toStrictEqual([validBody]);
  })

  test('should get only one habit by id', async () => {
    const habit = responseHabit();

    prisma.habit.findUnique = vitest.fn().mockReturnValueOnce(habit);

    const res = await app.inject({
      method: 'GET',
      url: `/habits/${habit.id}`
    });

    const json = await res.json();

    expect(json).toStrictEqual(habit);
  })

  test('should update a habit', async () => {
    const habit = responseHabit();

    prisma.habit.findUnique = vitest.fn().mockReturnValueOnce(habit);
    prisma.habit.update = vitest.fn().mockReturnValueOnce(habit);
    prisma.habitWeekDays.deleteMany = vitest.fn().mockReturnValueOnce(null);
    prisma.dayHabit.deleteMany = vitest.fn().mockReturnValueOnce(null);
    redis.del = vitest.fn().mockImplementation(() => {});

    const res = await app.inject({
      method: 'PUT',
      url: `/habits/${habit.id}`,
      payload: habit
    });

    const json = await res.json();

    expect(json).toStrictEqual(habit);
  })

  test('should delete a habit', async () => {
    const habit = responseHabit();

    prisma.habit.findUnique = vitest.fn().mockReturnValueOnce(habit);
    prisma.habit.delete = vitest.fn().mockReturnValueOnce(null);
    prisma.habitWeekDays.deleteMany = vitest.fn().mockReturnValueOnce(null);
    prisma.dayHabit.deleteMany = vitest.fn().mockReturnValueOnce(null);
    redis.del = vitest.fn().mockImplementation(() => {});

    const res = await app.inject({
      method: 'DELETE',
      url: `/habits/${habit.id}`
    });

    expect(res.statusCode).toStrictEqual(200);
  })

  test('should toggle a habit with day', async () => {
    const habit = responseHabit();
    const date = dayjs().add(2, 'day').toDate();
    const day = getValidDay(date, habit.user_id, habit.id);
    const dayHabit = getValidDayHabit(habit.id, day.id);

    prisma.day.findUnique = vitest.fn().mockReturnValueOnce(day);
    prisma.day.create = vitest.fn().mockReturnValueOnce(day);
    prisma.dayHabit.findUnique = vitest.fn().mockReturnValueOnce(dayHabit);
    prisma.dayHabit.delete = vitest.fn().mockReturnValueOnce(null);
    prisma.dayHabit.create = vitest.fn().mockReturnValueOnce(null);
    redis.del = vitest.fn().mockImplementation(() => {});

    const res = await app.inject({
      method: 'PATCH',
      url: `/habits/${habit.id}/toggle`,
      payload: {
        date: date.toISOString(),
        user_id: habit.user_id
      }
    });

    expect(res.statusCode).toStrictEqual(200);
  })

  test('should toggle a habit without day', async () => {
    const habit = responseHabit();
    const date = dayjs().add(2, 'day').toDate();
    const day = getValidDay(date, habit.user_id, habit.id);

    prisma.day.findUnique = vitest.fn().mockReturnValueOnce(null);
    prisma.day.create = vitest.fn().mockReturnValueOnce(day);
    prisma.dayHabit.findUnique = vitest.fn().mockReturnValueOnce(null);
    prisma.dayHabit.delete = vitest.fn().mockReturnValueOnce(null);
    prisma.dayHabit.create = vitest.fn().mockReturnValueOnce(getValidDayHabit(habit.id, day.id));
    redis.del = vitest.fn().mockImplementation(() => {});

    const res = await app.inject({
      method: 'PATCH',
      url: `/habits/${habit.id}/toggle`,
      payload: {
        date: date.toISOString(),
        user_id: habit.user_id
      }
    });

    expect(res.statusCode).toStrictEqual(200);
  })

  function bodyHabit(user_id: string) {
    return {
      id: randomUUID(),
      title: "Any habit",
      created_at: dayjs().subtract(2, 'day').toISOString(),
      user_id,
      weekDays: [ 1,2,3 ]
    }
  }

  function responseHabit() {
    return {
      id: randomUUID(),
      title: "Any habit",
      created_at: dayjs().subtract(2, 'day').toISOString(),
      user_id: randomUUID(),
      weekDays: [ 1,2,3 ]
    }
  }

  function getValidDay(date: Date, user_id: string, habit_id: string) {
    const id = randomUUID();
    return {
      id,
      date,
      user_id,
      dayHabits: [
        {
          id: randomUUID(),
          day_id: id,
          habit_id
        }
      ]
    }
  }

  function getValidDayHabit(habit_id: string, day_id: string) {
    return {
      id: randomUUID(),
      habit_id,
      day_id
    }
  }
})