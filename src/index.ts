import { Client } from "oceanic.js";
import registerCmd from "./features";
import betterLogging from "better-logging";
import { DateTime } from "luxon";
import db from "./init/db";
import defaultData from "./init/defaultData";
import scheduler from "./scheduler";

const client = new Client({
  auth: `Bot ${process.env.TOKEN}`,
  gateway: { intents: ["GUILDS"] },
});

client.on("ready", async () => {
  betterLogging(console, {
    saveToFile: `logs/${DateTime.now().toFormat("yyLLdd-HHmmss")}.log`,
  });
  console.log("Ready as", client.user.tag);

  const data = await defaultData(client);

  const extraData = {
    database: db(),
    defaultData: data,
    getRole: async function (id: string) {
      const roles = await data.guild.getRoles();
      return roles.findLast((r) => r.id == id)!;
    },
  };

  registerCmd(client, extraData);
  scheduler(extraData);
});

client.on("error", (err) => {
  console.error("Something Broke!", err);
});

client.connect();
