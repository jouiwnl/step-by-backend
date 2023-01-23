import _ from 'lodash';
import { prisma } from "../lib/prisma";
import axios from 'axios';
import { CronJob } from 'cron';

async function sendNotification() {
  const tokens = await prisma.notificationToken.findMany();

  const uniqueTokens = _.uniqBy(tokens, token => token.token)

  uniqueTokens.forEach(token => {
    axios.post('https://exp.host/--/api/v2/push/send', {
      to: token.token,
      title:"Opa!",
      body: "Não esqueça de preencher seus hábitos diários!"
    })
  })
}

const job = new CronJob('00 00 14 * * *', () => {
  sendNotification();
}, null, true, 'America/Sao_Paulo');

export { job }