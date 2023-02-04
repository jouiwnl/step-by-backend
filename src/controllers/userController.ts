import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma"
import { z } from "zod"

export async function userController(app: FastifyInstance) {
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