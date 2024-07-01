import {
  ForumChannel,
  Guild,
  RESTManager,
  TextChannel,
  type Client,
} from "oceanic.js";
import type { Task } from "../task-logger";

export default async function defaultData(client: Client, task: Task) {
  const rest = new RESTManager(client);

  task.pending("Fetching guild");
  const guild = (await rest.guilds.get(process.env.GUILD_ID!)) as Guild;

  task.pending("Fetching channel");
  const channel = (await rest.channels.get(
    process.env.UPDATE_CHANNEL!,
  )) as TextChannel;

  task.pending("Fetching forum");
  const forum = (await rest.channels.get(
    process.env.FORUM_CHANNEL!,
  )) as ForumChannel;

  task.pending("Fetching mod channel");
  const modChannel = (await rest.channels.get(
    process.env.MOD_CHANNEL!,
  )) as TextChannel;

  return {
    guild,
    channel,
    forum,
    modChannel,
  };
}
