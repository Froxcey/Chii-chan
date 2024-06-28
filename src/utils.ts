import type {
  CommandInteraction,
  ComponentInteraction,
  Guild,
} from "oceanic.js";

export function currentSeason() {
  const now = new Date();
  const seasons = [
    "winter",
    "winter",
    "winter",
    "spring",
    "spring",
    "spring",
    "summer",
    "summer",
    "summer",
    "fall",
    "fall",
    "fall",
  ];
  return {
    year: now.getFullYear(),
    season: seasons[now.getMonth() - 1],
  };
}

/**
 * Get a date representing the end of the upcoming 30H airing schedule limit
 */
export function getLimit() {
  const now = new Date(),
    next = new Date();
  next.setUTCHours(21, 0, 0, 0);
  //next.setHours(14, 20, 0, 0);
  now >= next && next.setDate(now.getDate() + 1);
  return next;
}

export function htmlToMd(text: string) {
  return text
    .replaceAll("<br>", "")
    .replaceAll("<i>", "*")
    .replaceAll("</i>", "*");
}

export async function sendError(
  interaction: CommandInteraction | ComponentInteraction,
  info: MyErr,
) {
  const [title, msg] = info;
  console.error(title + ":", msg);
  interaction.createFollowup({
    embeds: [
      {
        color: 0xcc241d,
        title: "An error occured",
        fields: [{ name: title, value: msg || "" }],
        image: {
          url: await sorry(),
        },
      },
    ],
  });
  return;
}

async function sorry() {
  const response = await fetch("https://api.otakugifs.xyz/gif?reaction=sorry");
  return (await response.json()).url as string;
}

export async function isAdmin(memberID: string, guild: Guild) {
  return (await guild.getMember(memberID)).permissions.has("ADMINISTRATOR");
}

export async function sendSuccess(
  interaction: CommandInteraction | ComponentInteraction,
  info: MyErr,
) {
  const [title, msg] = info;
  interaction.createFollowup({
    embeds: [
      {
        color: 0x98971a,
        title: "Success!",
        fields: [{ name: title, value: msg || "" }],
      },
    ],
  });
  return;
}
