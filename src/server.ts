import Fastify from 'fastify'
import cors from '@fastify/cors'
import { appRoutes } from "./routes"

const app = Fastify()

app.register(cors)
app.register(appRoutes)

const port = Number(process.env.PORT);

app.listen({ port }).then(() => {
  console.log(`HTTP Server running on port ${port}!`)
})
