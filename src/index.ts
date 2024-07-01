import { Client } from "oceanic.js";
import registerCmd from "./features";
import db from "./init/db";
import defaultData from "./init/defaultData";
import scheduler from "./scheduler";
import TaskLogger from "./task-logger";

const logger = new TaskLogger();
const initTask = logger.createTask("init", "Logging onto Discord");

const client = new Client({
  auth: `Bot ${process.env.TOKEN}`,
  gateway: { intents: ["GUILDS"] },
});

client.setMaxListeners(20);

client.on("ready", async () => {
  const data = await defaultData(client, initTask);

  const extraData = {
    database: db(),
    defaultData: data,
    logger,
    getRole: async function (id: string) {
      const roles = await data.guild.getRoles();
      return roles.findLast((r) => r.id == id)!;
    },
  };

  registerCmd(client, extraData, initTask);

  scheduler(extraData, initTask);

  initTask.success("Running as", client.user.tag);
});

client.connect();
