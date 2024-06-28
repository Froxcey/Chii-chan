import {
  ForumChannel,
  Guild,
  RESTManager,
  TextChannel,
  type Client,
} from "oceanic.js";

export default async function defaultData(client: Client) {
  const rest = new RESTManager(client);

  return {
    guild: (await rest.guilds.get(process.env.GUILD_ID!)) as Guild,
    channel: (await rest.channels.get(
      process.env.UPDATE_CHANNEL!,
    )) as TextChannel,
    forum: (await rest.channels.get(
      process.env.FORUM_CHANNEL!,
    )) as ForumChannel,
    modChannel: (await rest.channels.get(
      process.env.MOD_CHANNEL!,
    )) as TextChannel,
  };
}
