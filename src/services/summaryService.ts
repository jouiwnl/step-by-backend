import dayjs from "dayjs";
import RedisService from "../lib/cache";
import _ from 'lodash';

import { prisma } from "../lib/prisma";
import { generateRangeDatesFromYearStart } from "../utils/dateUtils";

export default class SummaryService {
  static async getSummary(year: number, user_id: string) {
    const redis = RedisService.redis();

    const summaryKey = `stepby::summary::${user_id}::${year}`;
    const daysKey = `stepby::days::${user_id}::${year}`;
  
    let summary = await redis.get(summaryKey);
    let days: any = await redis.get(daysKey);

    if (summary) {
      summary = JSON.parse(summary);
    } else {
      summary = await prisma.$queryRaw`
        SELECT 
          D.id, 
          D.date,
          (
            SELECT 
              cast(count(*) as float)
            FROM day_habits DH
            JOIN habits H
              ON H.id = DH.habit_id
            WHERE DH.day_id = D.id
            AND (
              H.deactivation_date is null
              OR (H.deactivation_date is not null and date_trunc('day', H.deactivation_date) > date_trunc('day', D.date))
              OR (H.activation_date is not null and H.deactivation_date < H.activation_date
                  and date_trunc('day', H.activation_date) <= date_trunc('day', D.date)
                )
            )
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
              AND (
                H.deactivation_date is null
                OR (H.deactivation_date is not null and date_trunc('day', H.deactivation_date) > date_trunc('day', D.date))
                OR (H.activation_date is not null and H.deactivation_date <  H.activation_date
                    and date_trunc('day', H.activation_date) <= date_trunc('day', D.date)
                  )
              )
          ) as amount
        FROM days D
        WHERE to_char(D.date, 'YYYY')::int = ${year}
        and user_id = ${user_id}
      `
    }

    if (days) {
      days = JSON.parse(days);
    } else {
      days = await this.getDaysFromYear(year);
    }
  
    redis.set(summaryKey, JSON.stringify(summary));
    redis.set(daysKey, JSON.stringify(days));

    redis.quit();

    return {
      summary,
      days
    }
  }

  static async getDaysFromYear(year: number) {
    const today = dayjs();
    const fromYearStart = generateRangeDatesFromYearStart(year);

    const grouped = await Promise.all(Object.entries(_.groupBy(fromYearStart, c => c.month)).map(entry => {
      const key = entry[0];
      const values = entry[1];
      
      return {
        month: key,
        days: values.map(day => {
          return {
            id: day.id,
            date: day.date,
            day_of_week: day.day_of_week,
            month:  day.month,
            disabled: day.disabled,
            passed_or_today: dayjs(day.date).isAfter(today)
          }
        })
      }
    }))

    return grouped;
  }
}