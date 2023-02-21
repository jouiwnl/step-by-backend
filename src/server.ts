import Fastify from 'fastify'
import cors from '@fastify/cors'
import { appRoutes } from "./routes"

const server = Fastify()
  .register(cors)
  .register(appRoutes)

export { server };
