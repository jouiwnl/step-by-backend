import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma"
import { z } from "zod"

export async function summaryController(app: FastifyInstance) {
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
}