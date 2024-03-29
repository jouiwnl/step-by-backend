import { Habit, HabitType } from "@prisma/client";
import dayjs from "dayjs";
import 'dayjs/locale/pt-br';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { FastifyInstance } from "fastify";
import { z } from "zod";
import RedisService from "../lib/cache";
import { prisma } from "../lib/prisma";

dayjs.locale('pt-br');
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("America/Sao_Paulo");

const weekDaysNumbers = [0, 1, 2, 3, 4, 5, 6] // Sun: 0, Sat: 6

const HABIT_TYPE = {
  WEEKLY: HabitType.WEEKLY,
  SPECIFIC_DATE: HabitType.SPECIFIC_DATE
}

export async function habitController(app: FastifyInstance) {

  const redis = RedisService.redis();

  app.post('/habits', async (request) => {
    const createHabitBody = z.object({
      title: z.string(),
      weekDays: z.array(
        z.number().min(0).max(6)
      ),
      user_id: z.string().uuid(),
      created_at: z.coerce.date(),
      type: z.enum(["WEEKLY", "SPECIFIC_DATE"]),
      habit_date: z.coerce.date().optional()
    })

    const {
      title,
      weekDays,
      created_at,
      user_id,
      type,
      habit_date
    } = createHabitBody.parse(request.body)

    redis.del(`stepby::summary::${user_id}::${created_at.getFullYear()}`);

    redis.quit();

    await prisma.habit.create({
      data: {
        title,
        created_at,
        weekDays: {
          create: weekDays.map((weekDay) => {
            return {
              week_day: weekDay,
            }
          }),
        },
        user_id: user_id,
        type: HABIT_TYPE[type],
        habit_date: habit_date
      }
    })
  })

  app.get('/habits', async (request) => {
    const toggleParams = z.object({
      year: z.coerce.number().min(1900).max(2999),
      user_id: z.string().uuid()
    })

    const { year, user_id } = toggleParams.parse(request.query);
    const endYear = dayjs().year(year).endOf('year');

    const habits: Habit[] = await prisma.$queryRaw`
      select
        habit.id,
        habit.title,
        habit.created_at,
        habit.type,
        habit.habit_date,
        (
          select
            string_agg(W.week_day::text, ',')
          from habit_week_days W
          where habit_id = habit.id
        ) as weekDays,
        (
          case when deactivation_date is null then 'no'
          when deactivation_date is not null and activation_date is null then 'yes'
          when deactivation_date is not null and (activation_date is not null and deactivation_date > activation_date) then 'yes'
          else 'no' end
        ) as disabled
      from habits habit
      where date_trunc('day', habit.created_at) <= date_trunc('day', ${endYear.toDate()})
      and user_id = ${user_id}
      order by habit.created_at asc
    `;

    return habits;
  })

  app.get('/habits/:id', async (request) => {
    const toggleParams = z.object({
      id: z.string()
    })

    const { id } = toggleParams.parse(request.params);

    const habit = await prisma.habit.findUnique({
      where: {
        id: id
      },
      include: {
        weekDays: true
      }
    });

    return habit;
  })

  app.put('/habits/:id', async (request) => {
    const updateParams = z.object({
      id: z.string().uuid()
    })

    const updateHabitBody = z.object({
      title: z.string(),
      weekDays: z.array(
        z.number().min(0).max(6)
      ),
      type: z.enum(["WEEKLY", "SPECIFIC_DATE"]),
      habit_date: z.coerce.date().optional()
    })

    const { id } = updateParams.parse(request.params);
    const { title, weekDays, type, habit_date } = updateHabitBody.parse(request.body)

    await prisma.habitWeekDays.deleteMany({
      where: {
        habit_id: id
      }
    })

    weekDaysNumbers.forEach(async dayNumber => {
      if (weekDays.includes(dayNumber)) {
        return;
      }

      await prisma.dayHabit.deleteMany({
        where: {
          habit_id: id
        }
      })
    })

    const habit = await prisma.habit.update({
      where: {
        id: id
      },
      data: {
        title: title,
        weekDays: {
          create: weekDays.map((weekDay) => {
            return {
              week_day: weekDay,
            }
          }),
        },
        type: HABIT_TYPE[type],
        habit_date: habit_date
      }
    })

    redis.del(`stepby::summary::${habit.user_id}::${dayjs(habit.created_at).year()}`);

    redis.quit();

    return habit;
  })

  app.patch('/habits/:id/:operation', async (request) => {
    const toggleParams = z.object({
      id: z.string(),
      operation: z.string()
    })

    const { id, operation } = toggleParams.parse(request.params);

    /*await prisma.habitWeekDays.deleteMany({
      where: {
        habit_id: id
      }
    })

    await prisma.dayHabit.deleteMany({
      where: {
        habit_id: id
      }
    })*/

    const habit = await prisma.habit.findUnique({
      where: {
        id
      }
    })

    if (operation === 'DEACTIVE') {
      await prisma.habit.update({
        where: {
          id
        },
        data: {
          deactivation_date: new Date()
        }
      })

      return;
    }

    await prisma.habit.update({
      where: {
        id
      },
      data: {
        activation_date: new Date()
      }
    })

    redis.del(`stepby::summary::${habit?.user_id}::${dayjs(habit?.created_at).year()}`);

    redis.quit();
  })

  app.patch('/habits/:id/toggle', async (request) => {
    const toggleHabitParams = z.object({
      id: z.string().uuid()
    })

    const toggleHabitBody = z.object({
      date: z.string(),
      user_id: z.string().uuid()
    })

    const { id } = toggleHabitParams.parse(request.params)
    const { date, user_id } = toggleHabitBody.parse(request.body)

    const today = dayjs(date);

    redis.del(`stepby::summary::${user_id}::${today.year()}`);

    let day = await prisma.day.findUnique({
      where: {
        date_user_id: {
          date: today.toDate(),
          user_id
        }
      }
    })

    if (!day) {
      day = await prisma.day.create({
        data: {
          date: today.toDate(),
          user_id
        }
      })
    }

    const dayHabit = await prisma.dayHabit.findUnique({
      where: {
        day_id_habit_id: {
          day_id: day.id,
          habit_id: id
        }
      }
    })

    if (dayHabit) {
      await prisma.dayHabit.delete({
        where: {
          id: dayHabit.id
        }
      })
    } else {
      await prisma.dayHabit.create({
        data: {
          day_id: day.id,
          habit_id: id
        }
      })
    }
  })
}
