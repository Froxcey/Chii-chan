import { Client } from "oceanic.js";
import type { Task } from "../task-logger";

export default function autocomplete(client: Client, extraData: ExtraData) {
  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isAutocompleteInteraction()) return;

    const task = extraData.logger.createTask(
      "ac",
      "Initializing autocomplete request from",
      interaction.user.id,
    );

    const option = interaction.data.options.getFocused(true);
    if (option.name != "id") return;

    const value = option.value as string;

    task.running("Autocomplete data:", value);

    const result = value == "" ? [] : await api(value, task);

    task.running("Sending response to client");

    interaction
      .result(result)
      .then(() => {
        task.success("Autocomplete results sent to", interaction.user.id);
      })
      .catch((e: TypeError) => {
        task.error(e.name);
        task.writeError(e);
      });
  });
}

async function api(data: string | number, task: Task) {
  task.pending("Requesting autocomplete from Anilist");
  type Media = {
    id: number;
    title: {
      native: string;
      english: string;
    };
  };

  const query = `
  query ($search: String) {
    Page (perPage: 25) {
      media(search: $search, type: ANIME, isAdult: false) {
        id
        title {
          native
          english
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
      variables: {
        search: data,
      },
    }),
  });

  task.pending("Processing response");

  const content: Media[] = (await res.json()).data.Page.media;

  return content.map((doc) => ({
    name: doc.title.english || doc.title.native || "Unknown",
    value: doc.id.toString(),
  }));
}
