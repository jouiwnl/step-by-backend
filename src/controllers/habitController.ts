import dayjs from "dayjs"
import { FastifyInstance } from "fastify"
import { prisma } from "../lib/prisma"
import { z } from "zod"
import 'dayjs/locale/pt-br';
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.locale('pt-br');
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("America/Sao_Paulo");

const weekDaysNumbers = [0, 1, 2, 3, 4, 5, 6] // Sun: 0, Sat: 6

export async function habitController(app: FastifyInstance) {
  app.post('/habits', async (request) => {
    const createHabitBody = z.object({
      title: z.string(),
      weekDays: z.array(
        z.number().min(0).max(6)
      ),
      user_id: z.string().uuid(),
      created_at: z.coerce.date()
    })

    const { title, weekDays, created_at, user_id } = createHabitBody.parse(request.body)

    //redis.del(`stepby::summary::${user_id}::${created_at.getFullYear()}`);

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
        user_id: user_id
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

    const habits = await prisma.$queryRaw`
      select 
        habit.id,
        habit.title,
        habit.created_at,
        (
          select 
            string_agg(W.week_day::text, ',')
          from habit_week_days W
          where habit_id = habit.id
        ) as weekDays
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
    })

    const { id } = updateParams.parse(request.params);
    const { title, weekDays } = updateHabitBody.parse(request.body)

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
        }
      }
    })

    //redis.del(`stepby::summary::${habit.user_id}::${habit.created_at.getFullYear()}`);

    return habit;
  })

  app.delete('/habits/:id', async (request) => {
    const toggleParams = z.object({
      id: z.string()
    })

    const { id } = toggleParams.parse(request.params);

    await prisma.habitWeekDays.deleteMany({
      where: {
        habit_id: id
      }
    })

    await prisma.dayHabit.deleteMany({
      where: {
        habit_id: id
      }
    })

    const habit = await prisma.habit.findUnique({
      where: {
        id
      }
    })

    //redis.del(`stepby::summary::${habit?.user_id}::${habit?.created_at.getFullYear()}`);

    await prisma.habit.delete({
      where: {
        id
      }
    })
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

    //redis.del(`stepby::summary::${user_id}::${today.year()}`);

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

