import { FastifyInstance } from "fastify";
import { z } from "zod"
import SummaryService from "../services/summaryService";

export async function summaryController(app: FastifyInstance) {
	app.get('/summary', async (request) => {

    const toggleParams = z.object({
      year: z.coerce.number().min(1900).max(2999),
      user_id: z.string().uuid()
    })

    const { year, user_id } = toggleParams.parse(request.query);

    return SummaryService.getSummary(year, user_id);
  })
}