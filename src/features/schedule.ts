import {
  ApplicationCommandOptionTypes,
  ApplicationCommandTypes,
  InteractionContextTypes,
  InteractionTypes,
  type Client,
  type Embed,
} from "oceanic.js";
import { getLimit, randomAvatar, sendError } from "../utils";
import { Err, Ok } from "ts-results-es";
import { DateTime } from "luxon";
import type { Task } from "../task-logger";

export default function schedule(client: Client, extraData: ExtraData) {
  client.application.createGlobalCommand({
    type: ApplicationCommandTypes.CHAT_INPUT,
    name: "schedule",
    description: "View the airing schedule",
    options: [
      {
        type: ApplicationCommandOptionTypes.BOOLEAN,
        name: "today",
        description: "Limit schedule to today",
        required: false,
      },
    ],
    contexts: [InteractionContextTypes.GUILD],
  });

  client.on("interactionCreate", async (interaction) => {
    if (interaction.type != InteractionTypes.APPLICATION_COMMAND) return;
    if (interaction.data.name != "schedule") return;

    const task = extraData.logger.createTask(
      "schedule",
      "Initializing schedule request from",
      interaction.user.id,
    );

    await interaction.defer();
    const today = interaction.data.options.getBoolean("today", false) || false;
    const res = await scheduleApi(today, task);

    if (res.isErr()) return sendError(interaction, res.error, task);

    task.pending("Sending response");

    await interaction.createFollowup({
      embeds: [res.value],
    });

    task.success("Schedule sent to", interaction.user.id);
  });
}

export async function scheduleApi(today: boolean, task: Task): AsyncRes<Embed> {
  task.pending("Requesting schedule from Anilist");
  type Media = {
    airingAt: number;
    episode: number;
    media: {
      id: number;
      title: {
        english: string;
        native: string | null;
      };
      siteUrl: string;
      studios: {
        nodes: Array<{
          name: string;
        }>;
      };
    };
  };

  const limit = getLimit();

  const query = `{
    Page(perPage: 25) {
      airingSchedules(notYetAired: true${today ? `, airingAt_lesser: ${limit.getTime() / 1000}` : ""}) {
        airingAt
        episode
        media {
          title {
            english
            native
          }
          siteUrl
          studios(isMain: true) {
            nodes {
              name
            }
          }
        }
      }
    }
  }`;

  const res = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      query: query,
      variables: null,
    }),
  });

  task.pending("Processing response");

  const schedule: Media[] = (await res.json()).data.Page.airingSchedules;
  if (schedule.length == 0)
    return new Err([
      "Schedule not found",
      "Everything have finished airing for today, please come back tomorrow.",
    ]);
  const embed: Embed = {
    title: (today ? "Today's" : "Upcoming") + " airing schedule",
    description: today
      ? DateTime.now()
          .setZone("Asia/Tokyo")
          .minus({ hour: 6 })
          .toFormat("ccc LLL dd y")
      : undefined,
    fields: schedule.map((doc) => ({
      name: doc.media.title.native || doc.media.title.english,
      value: `
        En: \`${doc.media.title.english || "--"}\`
        Ep \`${doc.episode}\` airing <t:${doc.airingAt}:R>
        Studio: \`${doc.media.studios.nodes[0]?.name || "--"}\`
        [Open on Anilist ↗](${doc.media.siteUrl})`,
      inline: true,
    })),
    footer: {
      text: "Provided by Anilist",
      iconURL:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/6/61/AniList_logo.svg/240px-AniList_logo.svg.png",
    },
    author: {
      iconURL: randomAvatar(),
      name: "ちー bot",
    },
  };

  return new Ok(embed);
}
