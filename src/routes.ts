import { FastifyInstance } from "fastify"
import { colorController } from "./controllers/colorController";
import { dayController } from "./controllers/dayController";
import { habitController } from "./controllers/habitController";
import { summaryController } from "./controllers/summaryController";
import { userController } from "./controllers/userController"
import { yearController } from "./controllers/yearController";

export async function appRoutes(app: FastifyInstance) {
  app.register(userController);
  app.register(yearController);
  app.register(dayController);
  app.register(habitController);
  app.register(summaryController);
  app.register(colorController);
}