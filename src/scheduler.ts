import { getLimit } from "./utils";
import { scheduleApi } from "./features/schedule";
import { Err, Ok } from "ts-results-es";
import { softDelete } from "./features/modTools/rm";
import type { Task } from "./task-logger";

let started = false;

export default function scheduler(extraData: ExtraData, initTask: Task) {
  initTask.running("Initializing scheduler");

  const forum = extraData.defaultData.forum;
  const channel = extraData.defaultData.channel;
  const modChannel = extraData.defaultData.modChannel;

  if (started) return;
  started = true;

  initTask.running(
    "Found forum tags:",
    forum.availableTags.map((val) => `${val.name} - ${val.id}`).join("; "),
  );

  setInterval(async () => {
    const task = extraData.logger.createTask(
      "scheduler",
      "Scheduled task started",
    );
    const now = Date.now();

    if (getLimit().getTime() - now > 86400000 - 60000) {
      task.pending("Getting today's schedule from Anilist");
      const res = await scheduleApi(true);
      if (res.isOk()) {
        task.pending("Sending response as announcement");
        res.value.footer = {
          text: "This is an automated message sent everyday at 6am JST",
        };
        await channel.createMessage({ embeds: [res.value] });
        task.running("Schedule sent");
      }
    }

    for (let doc of extraData.database.queries.listAll.all() as ScheduleDoc[]) {
      if (doc.nextTime < now / 1000) {
        task.running(`${doc.title} is outdated`);
        check(doc, task);
      }

      if (Math.abs(doc.nextTime - 300 - now / 1000) < 30) {
        task.running(`${doc.title} is scheduled to air in 5 min`);
        check(doc, task);
      }

      if (Math.abs(doc.nextTime - now / 1000) < 30) {
        task.running("Sending airing notification for", doc.title);

        const role = (await extraData.getRole(doc.role))!;

        channel.createMessage({
          content: `> Episode \`${doc.nextEp}\` of ${role.mention} just aired\n`,
        });
        continue;
        task.running("Creating discussion forum");
        forum.startThread({
          name: `${doc.title} ep ${doc.nextEp} discussion`,
          message: {
            content: `**🔥🔥🔥 SPOIL AN INSTANT, FAMILY IN ACCIDENT 🔥🔥🔥** SPOILERS ARE STRICTLY FORBIDDEN.\nHello fellow ${role.mention} enjoyer, please discuss the latest episode of ${doc.title} here.`,
          },
          appliedTags: [process.env.FORUM_TAG!],
        });

        setTimeout(() => {
          check(doc, task);
        }, 300000);
      }
    }
    task.success("Scheduled task completed");
  }, 60000);

  async function check(doc: ScheduleDoc, task: Task) {
    task.running("Fetching Anilist id", doc.id.toString());
    const res = await airingApi(doc.id);
    if (res.isErr()) return task.running("Fetch failed, aborting check");
    const val = res.value;
    if (!val.nextAiringEpisode) {
      const role = await extraData.getRole(doc.role);
      task.running("Moving outdated entry to archive");
      softDelete(modChannel, doc, role);
    } else {
      task.running("Check passed");
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
