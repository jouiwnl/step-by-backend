import { describe, expect, test, vitest } from 'vitest';
import fastify from 'fastify';
import { appRoutes } from '../../routes';
import { prisma } from '../../lib/prisma';
import { randomUUID } from 'node:crypto';
import dayjs from 'dayjs';

const app = fastify();
app.register(appRoutes);

describe('day controller test', () => {
  test('get day', async () => {
    const params = {
      date: new Date(),
      user_id: randomUUID()
    }

    const possibleHabit = getValidHabit(params.user_id);
    const day = getValidDay(params.date, params.user_id, possibleHabit.id);
    const validResponse = getValidCompleteDay([possibleHabit], day);

    prisma.habit.findMany = vitest.fn().mockReturnValueOnce([possibleHabit]);
    prisma.day.findFirst = vitest.fn().mockReturnValueOnce(day);

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
    created_at: dayjs().subtract(2, 'day').toISOString(),
    user_id
  }
}