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
        author: {
          iconURL: randomAvatar(),
          name: "ちー bot",
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
        author: {
          iconURL: randomAvatar(),
          name: "ちー bot",
        },
      },
    ],
  });
  return;
}

export function randomAvatar() {
  const list = [
    "https://media1.tenor.com/m/uHZqHZ6Az5kAAAAC/chito-girls-last-tour.gif",
    "https://media1.tenor.com/m/DfSSCH359IUAAAAC/girls-last.gif",
    "https://media1.tenor.com/m/l3_3giS_gOwAAAAC/girls-last.gif",
    "https://media1.tenor.com/m/vz9evNg6pNoAAAAC/glt-girls-last-tour.gif",
    "https://media1.tenor.com/m/Qr3RDQwE0o0AAAAC/girls-last-tour-shoujo-shuumatsu-ryokou.gif",
    "https://media.tenor.com/maQP4uWiYGIAAAAM/girls-last-tour-shojo-shumatsu-ryoko.gif",
    "https://media.tenor.com/k2v-p3IT3IkAAAAM/shoujo-shuumatsu-ryokou-girls-last-tour.gif",
    "https://media.tenor.com/IyNEwxYXDY4AAAAM/nuko-cut.gif",
    "https://media.tenor.com/JbLFDKdAwq0AAAAM/ok.gif",
    "https://media.tenor.com/uKVf2mPx7swAAAAM/shoujo-shuumatsu-ryokou-girls-last-tour.gif",
    "https://media.tenor.com/wuaoWQYaOxIAAAAM/dab-off-dabbing.gif",
    "https://media.tenor.com/vtnTPecZ-2oAAAAM/girls-last.gif",
    "https://media.tenor.com/Y_aIkljw-dIAAAAM/shoujo-shuumatsu.gif",
    "https://media.tenor.com/Zi2uijzcUAoAAAAM/nuko-girls-last-tour.gif",
    "https://media1.tenor.com/m/X857uqEegLcAAAAC/girls-last-tour-yuuri-nuko-rub-girls-last-tour.gif",
    "https://media1.tenor.com/m/QIWhINf2HfEAAAAC/memowies-girls-last-tour.gif",
  ];
  return list[Math.round(Math.random() * (list.length - 1)) + 1];
}
