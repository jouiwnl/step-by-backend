import dayjs from "dayjs"
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
      created_at: z.string()
    })

    const { title, weekDays, created_at } = createHabitBody.parse(request.body)

    const today = dayjs().startOf('day').toDate()

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
        }
      }
    })
  })

  app.get('/habits/by-year/:year', async (request) => {
    const toggleParams = z.object({
      year: z.coerce.number().min(1900).max(2999)
    })

    const { year } = toggleParams.parse(request.params);
    const endYear = dayjs().year(year).endOf('year');

    const habits = await prisma.habit.findMany({
      where: {
        created_at: {
          lte: endYear.toDate()
        }
      }
    });

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
    })

    const { date } = getDayParams.parse(request.query)

    const newDate = dayjs(date).add(3, 'hour');

    const parsedDate = dayjs(newDate).startOf('day');
    const weekDay = parsedDate.get('day')

    console.log(parsedDate.toDate())

    const possibleHabits = await prisma.habit.findMany({
      where: {
        created_at: {
          lte: parsedDate.toDate(),
        },
        weekDays: {
          some: {
            week_day: weekDay,
          }
        }
      },
    })

    const day = await prisma.day.findFirst({
      where: {
        date: parsedDate.toDate(),
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
      completedHabits,
    }
  })

  app.patch('/habits/:id/toggle', async (request) => {
    const toggleHabitParams = z.object({
      id: z.string().uuid()
    })

    const toggleHabitBody = z.object({
      date: z.string()
    })

    const { id } = toggleHabitParams.parse(request.params)
    const { date } = toggleHabitBody.parse(request.body)

    const today = dayjs(date).startOf('day').toDate()

    let day = await prisma.day.findUnique({
      where: {
        date: today
      }
    })

    if(!day) {
      day = await prisma.day.create({
        data: {
          date: today
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

  app.get('/summary/:year', async (request) => {

    const toggleParams = z.object({
      year: z.coerce.number().min(1900).max(2999)
    })

    const { year } = toggleParams.parse(request.params);

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
        ) as amount
      FROM days D
      WHERE to_char(D.date, 'YYYY')::int = ${year}
    `

    return summary
  })

  app.get('/years', async () => {
    const years = await prisma.year.findMany({
      orderBy: {
        year_number: 'asc'
      }
    });

    return years;
  })

  app.post('/years', async (request, reply) => {
    const toggleBody = z.object({
      year_number: z.number().min(1900).max(2999)
    })

    const { year_number } = toggleBody.parse(request.body);

    const exists = await prisma.year.findFirst({
      where: {
        year_number
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
        year_number
      }
    })

    return year;
  })

  app.get('/get-range-date/:year', async (request) => {
    const toggleParams = z.object({
      year: z.coerce.number().min(1900).max(2999)
    })

    const { year } = toggleParams.parse(request.params);

    const startDate = dayjs().year(year).startOf('year')
    const currentYear = dayjs().startOf('year').get('year');
    const isSameYear = currentYear === year;
    const endDate = isSameYear ? new Date() : dayjs().year(year).endOf('year').toDate();
  
    let dateRange = []
    let compareDate = startDate
  
    const weekDaysByStartDate = Array.from({ length: startDate.get('day') })
      .map((_, index) => {
        return {
          index: index,
          day_of_week: index + 1
        }
      });
  
    weekDaysByStartDate.reverse().forEach(day => {
      const newDate = startDate.subtract(day.day_of_week, 'day');
  
      dateRange.push({
        id: newDate.toISOString(),
        date: newDate.toDate(),
        day_of_week: startDate.get('day'),
        disabled: true
      })
    })
  
    while (compareDate.isBefore(endDate)) {
      dateRange.push({
        id: compareDate.toISOString(),
        date: compareDate.toDate(),
        day_of_week: compareDate.get('day'),
        disabled: false
      })
  
      compareDate = compareDate.add(1, 'day')
    }
  
    return dateRange
  })
}

