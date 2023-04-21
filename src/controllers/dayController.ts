import { FastifyInstance } from "fastify";
import dayjs from "dayjs"
import { prisma } from "../lib/prisma"
import { z } from "zod"
import 'dayjs/locale/pt-br';
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.locale('pt-br');
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("America/Sao_Paulo");

export async function dayController(app: FastifyInstance) {
  app.get('/day', async (request) => {
    const getDayParams = z.object({
      date: z.coerce.date(),
      user_id: z.string().uuid()
    })

    const { date, user_id } = getDayParams.parse(request.query)

    const weekDay = dayjs(date).get('day')

    const possibleHabits = await prisma.$queryRaw`
      select
        h.id,
        h.title,
        h.created_at,
        h.user_id String,
        h.deactivation_date,
        h.type,
        h.habit_date,
        h.activation_date
      from habits h
      where date_trunc('day', h.created_at) <= date_trunc('day', ${date})
      and (
        exists(select 1 from habit_week_days hwd where hwd.habit_id = h.id and hwd.week_day in (${weekDay})) 
        or (h.habit_date is not null and date_trunc('day', h.habit_date) = date_trunc('day', ${date}))
      )
      and (h.deactivation_date is null
        OR (h.deactivation_date is not null and date_trunc('day', h.deactivation_date) > date_trunc('day', ${date}))
        OR (h.activation_date is not null and h.deactivation_date < h.activation_date
          and date_trunc('day', h.activation_date) <= date_trunc('day', ${date})
        )
        OR (h.habit_date is not null and date_trunc('day', h.habit_date) = date_trunc('day', ${date}))
      )
      and h.user_id = ${user_id}
      order by created_at asc
    `

    const day = await prisma.day.findFirst({
      where: {
        date: date,
        user_id
      },
      include: {
        dayHabits: true,
      }
    })

    let completedHabits;

    if (day) {
      completedHabits = await Promise.all(day.dayHabits.map(async dayHabit => {
        const habit = await prisma.habit.findUnique({ where: { id: dayHabit.habit_id } });

        if (!habit?.deactivation_date || dayjs(habit.habit_date).isSame(date)) {
          return habit?.id;
        }

        if (habit.activation_date
          && dayjs(habit.deactivation_date).isBefore(habit.activation_date)
          && (dayjs(habit.activation_date).isBefore(date) || dayjs(habit.activation_date).isSame(date))) {
          return habit?.id;
        }
      }))
    }

    return {
      possibleHabits,
      completedHabits
    };
  })
}
