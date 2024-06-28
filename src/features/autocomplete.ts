import { Client, InteractionTypes } from "oceanic.js";

export default function autocomplete(client: Client) {
  console.info("Autocomplete registered");

  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isAutocompleteInteraction()) return;

    const option = interaction.data.options.getFocused(true);
    if (option.name != "id") return;

    const value = option.value;

    console.info("Responding to autocomplete with query:", value);
    interaction.result(value == "" ? [] : await api(value));
  });
}

async function api(data: string | number) {
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

  const content: Media[] = (await res.json()).data.Page.media;

  return content.map((doc) => ({
    name: doc.title.english || doc.title.native || "Unknown",
    value: doc.id.toString(),
  }));
}
