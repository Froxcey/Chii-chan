import {
  ApplicationCommandOptionTypes,
  ApplicationCommandTypes,
  CommandInteraction,
  ComponentInteraction,
  Guild,
  InteractionContextTypes,
  InteractionTypes,
  type Client,
} from "oceanic.js";
import { Err, Ok } from "ts-results-es";
import { isAdmin, sendError, sendSuccess } from "../utils";
import { Task } from "../task-logger";

let queries: ExtraData["database"]["queries"];
let guild: Guild;

export default function follow(client: Client, extraData: ExtraData) {
  queries = extraData.database.queries;
  guild = extraData.defaultData.guild;

  client.application.createGlobalCommand({
    type: ApplicationCommandTypes.CHAT_INPUT,
    name: "follow",
    description: "Get notified when an anime gets updated",
    options: [
      {
        type: ApplicationCommandOptionTypes.INTEGER,
        name: "id",
        description: "Anime you wish follow",
        autocomplete: true,
        required: true,
      },
    ],
    contexts: [InteractionContextTypes.GUILD],
  });

  client.on("interactionCreate", async (interaction) => {
    if (interaction.type == InteractionTypes.MESSAGE_COMPONENT) {
      if (!interaction.data.customID.startsWith("follow:")) return;
      const task = extraData.logger.createTask(
        "flw(btn)",
        "Initializing follow request from",
        interaction.user.id,
      );
      await interaction.defer(64);
      const id = parseInt(interaction.data.customID.replace("follow:", ""));

      task.pending("Fetching role");
      const followRole = await getFollowRole(
        id,
        await isAdmin(interaction.user.id, interaction.guild!),
      );

      if (followRole == null) {
        sendError(
          interaction,
          [
            "Can't get following data",
            "Either you have insufficient permission or the api request failed.",
          ],
          task,
        );
      }

      followSuccess(interaction, followRole, task);
      return;
    }
    if (interaction.type != InteractionTypes.APPLICATION_COMMAND) return;
    if (interaction.data.name != "follow") return;

    const task = extraData.logger.createTask(
      "follow",
      "Initializing follow request from",
      interaction.user.id,
    );

    const id = interaction.data.options.getInteger("id", true);

    const dbRes: ArchivedDoc | null =
      extraData.database.queries.listFind.get(id) ||
      extraData.database.queries.archiveFind.get(id);
    if (dbRes) return followSuccess(interaction, dbRes.role, task);

    await interaction.defer(64);

    task.pending("Fetching role");

    const followRole = await getFollowRole(
      id,
      await isAdmin(interaction.user.id, interaction.guild!),
    );

    if (followRole == null) {
      sendError(
        interaction,
        [
          "Following data not found",
          "Insufficient permission or the api request failed.",
        ],
        task,
      );
    }

    followSuccess(interaction, followRole, task);
  });
}

export async function getFollowRole(id: number, admin: boolean, mock = false) {
  const listRes = queries.listFind.get(id);
  if (listRes) return listRes.role as string;
  const res = await api(id);
  if (res.isErr()) return null;
  const val = res.value;

  if (val.nextAiringEpisode) {
    return createEntry(id, val, admin, mock);
  }
  return queries.archiveFind.get(id)?.role;
}

async function createEntry(
  id: number,
  val: Media,
  admin: boolean,
  mock = false,
) {
  const franchiseRole = findFranchise(val.relations, []);
  if (franchiseRole) {
    if (val.nextAiringEpisode) {
      if (mock) return true;
      guild.editRole(franchiseRole, { color: 0x7bd555 });
      queries.listInsert(
        id,
        franchiseRole,
        val.nextAiringEpisode.episode,
        val.nextAiringEpisode.airingAt,
        val.title.english || val.title.native,
      );
    } else {
      queries.archiveInsert(id, franchiseRole);
    }
    return franchiseRole;
  }
  let name = val.title.english || val.title.native;
  if (val.hashtag) {
    name = val.hashtag
      .split(" ")
      .sort((a, b) => a.length - b.length)[0]
      .replace("#", "");
  }
  if (val.nextAiringEpisode) {
    if (mock) return true;
    const role = await guild.createRole({
      name,
      color: 0x7bd555,
      mentionable: false,
    });
    queries.listInsert.run(
      id,
      role.id,
      val.nextAiringEpisode!.episode,
      val.nextAiringEpisode!.airingAt,
      val.title.english || val.title.native,
    );
    return role.id;
  }
  if (!admin) return null;
  if (mock) return true;
  const role = await guild.createRole({
    name,
    color: 0x151f2e,
    mentionable: false,
  });
  queries.archiveInsert(id, role.id);
  return role.id;
}

export async function followSuccess(
  interaction: CommandInteraction | ComponentInteraction,
  role: string,
  task: Task,
) {
  await interaction.member?.addRole(role);

  sendSuccess(
    interaction,
    ["Entry Added", `Added <@&${role}> to your following list.`],
    task,
  );
}

function findFranchise(
  relation: Relation,
  found: Number[],
): string | undefined {
  if (!relation) return undefined;
  for (let edge of relation.edges) {
    if (edge.node.type != "ANIME") continue;
    if (
      edge.relationType == "CHARACTER" ||
      edge.relationType == "ADAPTATION" ||
      edge.relationType == "OTHER"
    )
      continue;
    const id = edge.node.id;
    if (found.includes(id)) continue;
    const dbRes = (queries.archiveFind.get(id) ||
      queries.listFind.get(id)) as ArchivedDoc;
    if (dbRes) return dbRes.role;
    found.push(id);
    const childRes = findFranchise(edge.node.relations, found);
    if (childRes) return childRes;
  }
}

type Relation = {
  edges: Array<{
    relationType: string;
    node: {
      id: number;
      type: "ANIME" | string;
      relations: Relation;
    };
  }>;
};
type Media = {
  title: {
    english: string;
    native: string;
  };
  hashtag: string;
  relations: Relation;
  nextAiringEpisode: {
    airingAt: number;
    episode: number;
  } | null;
};
async function api(id: number): AsyncRes<Media> {
  const query = `
    query ($id: Int) {
      Media(id: $id, type: ANIME, isAdult: false) {
        title {
          english
          native
        }
        hashtag
        relations {
          edges {
            relationType
            node {
              id
              type
              relations {
                edges {
            			relationType
                  node {
              			type
                    id
                  }
                }
              }
            }
          }
        }
        nextAiringEpisode {
          airingAt
          episode
        }
      }
    }`;

  const response = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: query,
      variables: {
        id: id,
      },
    }),
  });

  return response.ok
    ? new Ok((await response.json()).data.Media)
    : new Err([response.statusText, response.body?.toString()]);
}
