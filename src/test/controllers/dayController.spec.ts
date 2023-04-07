import { describe, expect, test, vitest } from 'vitest';
import fastify from 'fastify';
import { appRoutes } from '../../routes';
import { prisma } from '../../lib/prisma';
import { randomUUID } from 'node:crypto';
import dayjs from 'dayjs';

const app = fastify();
app.register(appRoutes);

describe('day controller test', () => {
  test('get day with habit active', async () => {
    const params = {
      date: dayjs("2023-04-07").toDate(),
      user_id: randomUUID()
    }

    const possibleHabit = getValidHabit(params.user_id);
    const day = getValidDay(params.date, params.user_id, possibleHabit.id);
    const validResponse = getValidCompleteDay([possibleHabit], day);

    prisma.$queryRaw = vitest.fn().mockReturnValueOnce([possibleHabit]);
    prisma.day.findFirst = vitest.fn().mockReturnValueOnce(day);
    prisma.habit.findUnique = vitest.fn().mockReturnValueOnce(possibleHabit);

    const res = await app.inject({
      method: 'GET',
      url: '/day',
      query: {
        date: params.date.toISOString(),
        user_id: params.user_id
      }
    });

    const json = await res.json();
  
    expect(json.completedHabits).toStrictEqual(validResponse.completedHabits);
    expect(json.possibleHabits).toEqual(validResponse.possibleHabits);
    expect(res.statusCode).toBe(200);
  })

  test('get day with habit without deactivation', async () => {
    const params = {
      date: new Date(),
      user_id: randomUUID()
    }

    const possibleHabit = getValidHabitActive(params.user_id);
    const day = getValidDay(params.date, params.user_id, possibleHabit.id);
    const validResponse = getValidCompleteDay([possibleHabit], day);

    prisma.$queryRaw = vitest.fn().mockReturnValueOnce([possibleHabit]);
    prisma.day.findFirst = vitest.fn().mockReturnValueOnce(day);
    prisma.habit.findUnique = vitest.fn().mockReturnValueOnce(possibleHabit);

    const res = await app.inject({
      method: 'GET',
      url: '/day',
      query: {
        date: params.date.toISOString(),
        user_id: params.user_id
      }
    });

    const json = await res.json();
  
    expect(json.completedHabits).toStrictEqual(validResponse.completedHabits);
    expect(json.possibleHabits).toEqual(validResponse.possibleHabits);
    expect(res.statusCode).toBe(200);
  })
})

function getValidCompleteDay(possibleHabits: any, day: any) {
  return {
    possibleHabits,
    completedHabits: day?.dayHabits.map((dayHabit: any) => {
			return dayHabit.habit_id
		})
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

function getValidHabit(user_id: string) {
  return {
    id: randomUUID(),
    title: "Any habit",
    activation_date: dayjs("2023-04-07").toISOString(),
    deactivation_date: dayjs("2023-04-06").toISOString(),
    created_at: dayjs().subtract(2, 'day').toISOString(),
    user_id
  }
}

function getValidHabitActive(user_id: string) {
  return {
    id: randomUUID(),
    title: "Any habit",
    created_at: dayjs().subtract(2, 'day').toISOString(),
    user_id
  }
}