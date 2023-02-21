import RedisService from "../lib/cache";
import { prisma } from "../lib/prisma";

export default class SummaryService {
  static async getSummary(year: number, user_id: string) {
    const redis = RedisService.redis();

    const summaryKey = `stepby::summary::${user_id}::${year}`;
  
    let summary = await redis.get(summaryKey);
  
    if (summary) {
      return JSON.parse(summary);
    }
  
    summary = await prisma.$queryRaw`
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
  
    redis.set(summaryKey, JSON.stringify(summary));
  
    return summary
  }
}