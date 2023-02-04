import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma"
import { z } from "zod"

export async function yearController(app: FastifyInstance) {
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
}