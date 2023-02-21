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

		const possibleHabits = await prisma.habit.findMany({
			where: {
				created_at: {
					lte: date,
				},
				weekDays: {
					some: {
						week_day: weekDay,
					}
				},
				user_id
			},
		})

		const day = await prisma.day.findFirst({
			where: {
				date: date,
				user_id
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
}