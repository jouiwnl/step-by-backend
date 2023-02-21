import { server } from "./server";
import { job14, job20 } from './scheduled/notification'

const port = Number(process.env.PORT)  || 3333;

server.listen({
  port,
  host: '0.0.0.0'
}).then(() => {
  console.log(`HTTP Server running on port ${port}!`);
  job14.start();
  job20.start();
})