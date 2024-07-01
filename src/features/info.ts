import {
  ApplicationCommandOptionTypes,
  ApplicationCommandTypes,
  ButtonStyles,
  ComponentTypes,
  InteractionContextTypes,
  InteractionTypes,
  type Client,
  type Embed,
  type EmbedField,
} from "oceanic.js";
import { Err, Ok } from "ts-results-es";
import { htmlToMd, randomAvatar, sendError, trimString } from "../utils";
import { getFollowRole } from "./follow";
import type { Task } from "../task-logger";

export default function info(client: Client, extraData: ExtraData) {
  client.application.createGlobalCommand({
    type: ApplicationCommandTypes.CHAT_INPUT,
    name: "info",
    description: "Get info for an anime",
    options: [
      {
        type: ApplicationCommandOptionTypes.INTEGER,
        name: "id",
        description: "Anilist ID to find",
        autocomplete: true,
        required: true,
      },
    ],
    contexts: [InteractionContextTypes.GUILD],
  });

  client.on("interactionCreate", async (interaction) => {
    if (interaction.type != InteractionTypes.APPLICATION_COMMAND) return;
    if (interaction.data.name != "info") return;

    const task = extraData.logger.createTask(
      "info",
      "Initializing info request from",
      interaction.user.id,
    );

    await interaction.defer();

    const id = interaction.data.options.getInteger("id", true);
    const res = await api(id, task);

    if (res.isErr()) return sendError(interaction, res.error, task);

    await interaction.createFollowup({
      embeds: [res.value],
      components: [
        {
          components: [
            {
              type: ComponentTypes.BUTTON,
              style: ButtonStyles.PRIMARY,
              customID: "follow:" + id.toString(),
              label: "Follow",
              emoji: { name: "💕" },
              disabled: (await getFollowRole(id, false, true)) == null,
            },
          ],
          type: ComponentTypes.ACTION_ROW,
        },
      ],
    });
    task.success("Info sent to " + interaction.user.id);
  });
}

export async function api(id: number, task: Task): AsyncRes<Embed> {
  task.pending("Requesting info from Anilist");
  type Media = {
    title: {
      english: string;
      native: string;
    };
    description: string;
    format:
      | "TV"
      | "TV_SHORT"
      | "MOVIE"
      | "SPECIAL"
      | "OVA"
      | "ONA"
      | "MUSIC"
      | "MANGA"
      | "NOVEL"
      | "ONE_SHOT";
    season: "WINTER" | "SPRING" | "SUMMER" | "FALL";
    seasonYear: number;
    episodes: number;
    source: string;
    trailer: {
      site: string;
      id: string;
    } | null;
    coverImage: {
      medium: string;
      color: `#${string}`;
    };
    genres: string[];
    meanScore: number;
    studios: {
      nodes: {
        name: string;
      }[];
    };
    isAdult: boolean;
    siteUrl: string;
    characters: {
      edges: [
        {
          node: { name: { full: string } };
          voiceActors: [
            {
              name: { full: string };
            },
          ];
        },
      ];
    };
    staff: {
      edges: [
        {
          role: "Director " | "Music" | string;
          node: {
            name: {
              full: string;
            };
          };
        },
      ];
    };
  } & (
    | {
        status: "RELEASING" | "NOT_YET_RELEASED";
        nextAiringEpisode: { timeUntilAiring: number };
      }
    | {
        status: "FINISHED" | "CANCELLED" | "HIATUS";
        nextAiringEpisode: null;
      }
  );
  const query = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      title {
        english
        native
      }
      description
      status
      format
      season
      seasonYear
      episodes
      trailer {
        site
  	  id
      }
      coverImage {
        medium
        color
      }
      genres
      meanScore
      source
      studios(isMain: true) {
        nodes {
          name
        }
      }
      isAdult
      nextAiringEpisode {
        timeUntilAiring
      }
      siteUrl
      characters(perPage: 6, role: MAIN) {
        edges {
          node {
            name {
              full
            }
          }
          voiceActors(language: JAPANESE) {
            name {
              full
            }
          }
        }
      }
      staff {
        edges {
          role
          node {
            name {
              full
            }
          }
        }
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

  task.pending("Processing response");

  if (!response.ok)
    return new Err([response.statusText, response.body?.toString()]);

  const info = (await response.json()).data.Media as Media;

  let fields: EmbedField[] = [
    { name: "Native Title", value: info.title.native, inline: true },
    {
      name: "Genres",
      value: `\`${info.genres.join("`, `")}\``,
      inline: true,
    },
    {
      name: "Description",
      value: trimString(htmlToMd(info.description)),
    },
  ];
  if (info.isAdult)
    fields.push({
      name: "NSFW 🔞",
      value: "This anime is not\nsafe for work",
      inline: true,
    });

  if (info.status == "RELEASING") {
    fields.push({
      name: "Next episode",
      value: `<t:${info.nextAiringEpisode!.timeUntilAiring}:R>`,
      inline: true,
    });
  } else
    fields.push({
      name: "Season",
      value: (info.season || "--") + " " + (info.seasonYear || "--"),
      inline: true,
    });

  fields.push(
    { name: "Format", value: info.format, inline: true },
    {
      name: "Source",
      value: info.source.toLowerCase().replaceAll("_", " "),
      inline: true,
    },
    {
      name: "Episodes",
      value: info.episodes?.toString() || "--",
      inline: true,
    },
    {
      name: "Studio",
      value: info.studios.nodes[0]?.name || "--",
      inline: true,
    },
    {
      name: "Rating",
      value: (info.meanScore || "--") + "%",
      inline: true,
    },

    {
      name: "Staffs",
      value: info.staff.edges
        .filter((s) => s.role.trim() == "Director" || s.role.trim() == "Music")
        .map((s) => `${s.role.trim()}: ${s.node.name.full}`)
        .join("\n"),
    },
    {
      name: "VAs",
      value: info.characters.edges
        .map(
          (c) =>
            `${c.node.name.full}: ${c.voiceActors.map((a) => a.name.full).join(", ") || "--"}`,
        )
        .join("\n"),
    },
    {
      name: "More info",
      value: `[[Open on Anilist](${info.siteUrl})]${
        info.trailer && info.trailer.site == "youtube"
          ? ` [[Watch Trailer](https://youtu.be/${info.trailer.id})]`
          : ""
      }`,
    },
  );

  return new Ok({
    title: `About: ${info.title.english || info.title.native}`,
    color: parseInt(info.coverImage.color.replace("#", ""), 16),
    thumbnail: { url: info.coverImage.medium },
    fields,
    url: info.siteUrl,
    author: {
      iconURL: randomAvatar(),
      name: "ちー bot",
    },
    footer: {
      text: "Provided by Anilist",
      iconURL:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/6/61/AniList_logo.svg/240px-AniList_logo.svg.png",
    },
  });
}
