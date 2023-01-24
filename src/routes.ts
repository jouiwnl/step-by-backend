import { dayjs } from "./lib/dayjs"
import { FastifyInstance } from "fastify"
import { z } from "zod"
import { prisma } from "./lib/prisma"

const weekDaysNumbers = [0, 1, 2, 3, 4, 5, 6] // Sun: 0, Sat: 6

export async function appRoutes(app: FastifyInstance) {
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
    
    await prisma.habit.delete({
      where: {
        id
      }
    })
  })

  app.get('/day', async (request) => {
    const getDayParams = z.object({
      date: z.coerce.date(),
      user_id: z.string().uuid()
    })

    const { date, user_id } = getDayParams.parse(request.query)

    const parsedDate = dayjs.utc(date).tz('America/Sao_Paulo', true).startOf('day');
    const weekDay = dayjs(date).get('day')

    const possibleHabits = await prisma.habit.findMany({
      where: {
        created_at: {
          lte: parsedDate.toDate(),
        },
        weekDays: {
          some: {
            week_day: weekDay,
          }
        },
        user_id
      },
    })

    const day = await prisma.day.findUnique({
      where: {
        date_user_id: {
          date: parsedDate.toDate(),
          user_id
        } 
      },
      include: {
        dayHabits: true,
      }
    })

    const completedHabits = day?.dayHabits.map(dayHabit => {
      return dayHabit.habit_id
    })

    return {
      possibleHabits,
      completedHabits
    }
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

    const today = dayjs.utc(date).tz('America/Sao_Paulo').startOf('day');

    let day = await prisma.day.findUnique({
      where: {
        date_user_id: {
          date: today.toDate(),
          user_id
        }
      }
    })

    if(!day) {
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

    if(dayHabit) {
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

  app.get('/summary', async (request) => {

    const toggleParams = z.object({
      year: z.coerce.number().min(1900).max(2999),
      user_id: z.string().uuid()
    })

    const { year, user_id } = toggleParams.parse(request.query);

    const summary = await prisma.$queryRaw`
      SELECT 
        D.id, 
        D.date,
        (
          SELECT 
            cast(count(*) as float)
          FROM day_habits DH
          WHERE DH.day_id = D.id
        ) as completed,
        (
          SELECT
            cast(count(*) as float)
          FROM habit_week_days HDW
          JOIN habits H
            ON H.id = HDW.habit_id
          WHERE
            HDW.week_day = (to_char(D.date, 'D')::int) - 1
            AND date_trunc('day', H.created_at) <= date_trunc('day', D.date)
            AND H.user_id = ${user_id}
        ) as amount
      FROM days D
      WHERE to_char(D.date, 'YYYY')::int = ${year}
      and user_id = ${user_id}
    `

    return summary
  })

  app.get('/years', async (request) => {
    const toggleParams = z.object({
      user_id: z.string().uuid()
    })

    const { user_id } = toggleParams.parse(request.query);
    
    const years = await prisma.year.findMany({
      where: {
        user_id: user_id
      },
      orderBy: {
        year_number: 'asc'
      }
    });

    return years;
  })

  app.post('/years', async (request, reply) => {
    const toggleBody = z.object({
      year_number: z.number().min(1900).max(2999),
      user_id: z.string().uuid()
    })

    const { year_number, user_id } = toggleBody.parse(request.body);

    const exists = await prisma.year.findFirst({
      where: {
        year_number,
        user_id: user_id
      }
    })

    if (exists) {
      reply.status(422).send({
        statusCode: 422,
        message: `O ano ${year_number} já existe!`
      })

      return;
    }

    const year = await prisma.year.create({
      data: {
        year_number,
        user_id
      }
    })

    return year;
  })

  app.post('/users', async (request) => {
    const toggleUserBody = z.object({
      email: z.string().email()
    })

    const { email } = toggleUserBody.parse(request.body);

    const user = await prisma.user.create({
      data: {
        email
      }
    })

    return user;
  })

  app.get('/users/:email', async (request) => {
    const toggleParams = z.object({
      email: z.string().email()
    })

    const { email } = toggleParams.parse(request.params);

    const user = await prisma.user.findFirst({
      where: {
        email
      }
    })

    return user;
  })

  app.post('/token', async (request) => {
    const toggleBody = z.object({
      token: z.string(),
      user_id: z.string().uuid()
    })

    const { token, user_id } = toggleBody.parse(request.body);

    const created = await prisma.notificationToken.create({
      data: {
        token,
        user_id
      }
    })

    return created;
  })

  app.get('/token', async (request) => {
    const toggleParams = z.object({
      token: z.string()
    })

    const { token } = toggleParams.parse(request.query);

    const findedToken = await prisma.notificationToken.findFirst({
      where: {
        token
      }
    })

    return findedToken;
  })
}