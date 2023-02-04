import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma"
import { z } from "zod"

export async function colorController(app: FastifyInstance) {
	app.post('/colors', async (request) => {
		const toggleBody = z.object({
			color_1: z.string(),
			color_2: z.string(),
			color_3: z.string(),
			color_4: z.string(),
			color_5: z.string(),
			user_id: z.string().uuid()
		})

		const { color_1, color_2, color_3, color_4, color_5, user_id } = toggleBody.parse(request.body);

		const colors = await prisma.color.create({
			data: {
				color_1,
				color_2,
				color_3,
				color_4,
				color_5,
				user_id
			}
		})

		return colors;
	})

	app.get('/colors/:user_id', async (request) => {
		const toggleParams = z.object({
			user_id: z.string().uuid()
		})

		const { user_id } = toggleParams.parse(request.params);

		const colors = await prisma.color.findFirst({
			where: {
				user_id
			}
		})

		return colors;
	})

	app.put('/colors/:id', async (request, reply) => {
		const toggleParams = z.object({
			id: z.string().uuid()
		})

		const toggleBody = z.object({
			color_1: z.string(),
			color_2: z.string(),
			color_3: z.string(),
			color_4: z.string(),
			color_5: z.string(),
		})

		const { color_1, color_2, color_3, color_4, color_5 } = toggleBody.parse(request.body);

		const { id } = toggleParams.parse(request.params);

		const colors = await prisma.color.findFirst({
			where: {
				id
			}
		})

		if (!colors) {
			reply.status(404).send({
        statusCode: 404,
        message: `Not found any color with id: ${id}`
      })
		}

		await prisma.color.update({
			where: {
				id
			},
			data: {
				color_1,
				color_2,
				color_3,
				color_4,
				color_5,
			}
		})
	})
}