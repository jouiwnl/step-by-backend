import Fastify from 'fastify'
import cors from '@fastify/cors'
import { appRoutes } from "./routes"

const app = Fastify()

app.register(cors)
app.register(appRoutes)

const port: string | undefined = process.env.PORT;

app.listen({
  port: Number(port) || 3333,
}).then(() => {
  console.log('HTTP Server running!')
})
