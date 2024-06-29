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
import { htmlToMd, isAdmin, randomAvatar, sendError } from "../utils";
import { getFollowRole, followSuccess } from "./follow";

export default function info(client: Client) {
  console.info("Registering info command");

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
    if (interaction.type == InteractionTypes.MESSAGE_COMPONENT) {
      if (!interaction.data.customID.startsWith("follow:")) return;
      interaction.defer(64);
      const id = parseInt(interaction.data.customID.replace("follow:", ""));
      const followRole = await getFollowRole(
        id,
        await isAdmin(interaction.user.id, interaction.guild!),
      );

      if (followRole == null) {
        sendError(interaction, [
          "Can't get following data",
          "Either you have insufficient permission or the api request failed.",
        ]);
      }

      followSuccess(interaction, followRole);
    }
    if (interaction.type != InteractionTypes.APPLICATION_COMMAND) return;
    if (interaction.data.name != "info") return;

    await interaction.defer();

    const id = interaction.data.options.getInteger("id", true);
    const res = await api(id);

    if (res.isErr()) return sendError(interaction, res.error);

    //get can follow

    interaction.createFollowup({
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
  });
}

export async function api(id: number): AsyncRes<Embed> {
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
      value: htmlToMd(info.description),
    },
  ];
  if (info.isAdult)
    fields.push({
      name: "NSFW 🔞",
      value: "This anime is not\nsafe for work",
      inline: true,
    });

  if (info.status == "RELEASING") {
    let daysLeft = Math.floor(info.nextAiringEpisode?.timeUntilAiring / 86400);
    fields.push({
      name: "Next episode",
      value: daysLeft == 0 ? "Today" : daysLeft + " Days",
      inline: true,
    });
  } else
    fields.push({
      name: "Season",
      value: info.season + " " + info.seasonYear,
      inline: true,
    });

  fields.push(
    { name: "Format", value: info.format, inline: true },
    {
      name: "Episodes",
      value: info.episodes?.toString() || "--",
      inline: true,
    },
    {
      name: "Studio",
      value: info.studios.nodes[0]?.name || "Unknown",
      inline: true,
    },
    {
      name: "Rating",
      value: info.meanScore + "%",
      inline: true,
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
