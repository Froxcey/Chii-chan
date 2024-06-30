import { type Client } from "oceanic.js";
import { getLimit } from "./utils";
import { scheduleApi } from "./features/schedule";
import { Err, Ok } from "ts-results-es";
import { softDelete } from "./features/modTools/rm";

let started = false;

export default function scheduler(extraData: ExtraData) {
  const forum = extraData.defaultData.forum;
  const channel = extraData.defaultData.channel;
  const modChannel = extraData.defaultData.modChannel;

  if (started) return;
  started = true;

  console.log(
    "Available forum tags:",
    forum.availableTags.map((val) => `${val.name} - ${val.id}`).join("; "),
  );

  setInterval(async () => {
    const now = Date.now();

    if (getLimit().getTime() - now > 86400000 - 60000) {
      const res = await scheduleApi(true);
      if (res.isOk()) {
        res.value.footer = {
          text: "This is an automated message sent everyday at 6am JST",
        };
        channel.createMessage({ embeds: [res.value] });
      }
    }

    for (let doc of extraData.database.queries.listAll.all() as ScheduleDoc[]) {
      if (doc.nextTime < now / 1000) {
        check(doc);
      }

      if (Math.abs(doc.nextTime - 300 - now / 1000) < 30) {
        console.log(`${doc.title} is scheduled to air in 5 min`);
        check(doc);
      }

      if (Math.abs(doc.nextTime - now / 1000) < 30) {
        const role = (await extraData.getRole(doc.role))!;

        channel.createMessage({
          content: `> Episode \`${doc.nextEp}\` of ${role.mention} just aired\n`,
        });
        return;
        forum.startThread({
          name: `${doc.title} ep ${doc.nextEp} discussion`,
          message: {
            content: `**🔥🔥🔥 SPOIL AN INSTANT, FAMILY IN ACCIDENT 🔥🔥🔥** SPOILERS ARE STRICTLY FORBIDDEN.\nHello fellow ${role.mention} enjoyer, please discuss the latest episode of ${doc.title} here.`,
          },
          appliedTags: [process.env.FORUM_TAG!],
        });

        setTimeout(() => {
          check(doc);
        }, 300000);
      }
    }
  }, 60000);

  async function check(doc: ScheduleDoc) {
    console.log("Checking", doc.id);
    const res = await airingApi(doc.id);
    if (res.isErr()) return;
    const val = res.value;
    if (!val.nextAiringEpisode) {
      const role = await extraData.getRole(doc.role);
      softDelete(modChannel, doc, role);
    } else {
      extraData.database.queries.listUpdate.run(
        doc.id,
        val.nextAiringEpisode.episode,
        val.nextAiringEpisode.airingAt,
        val.title.english || val.title.native,
      );
    }
  }
}

type Media = {
  title: {
    english: string;
    native: string;
  };
  nextAiringEpisode: {
    airingAt: number;
    episode: number;
  } | null;
};
async function airingApi(id: number): AsyncRes<Media> {
  const query = `
    query ($id: Int) {
      Media(id: $id, type: ANIME, isAdult: false) {
        title {
          english
          native
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
