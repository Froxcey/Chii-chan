import {
  ApplicationCommandTypes,
  InteractionContextTypes,
  InteractionTypes,
  type Client,
} from "oceanic.js";

export default function about(client: Client) {
  console.info("Registering drop command");

  client.application.createGlobalCommand({
    type: ApplicationCommandTypes.CHAT_INPUT,
    name: "about",
    description: "About this bot",
    contexts: [InteractionContextTypes.GUILD],
  });

  client.on("interactionCreate", async (interaction) => {
    if (interaction.type != InteractionTypes.APPLICATION_COMMAND) return;
    if (interaction.data.name != "about") return;

    interaction.reply({
      embeds: [
        {
          title: "About me",
          description: "Just a simple anime Discord bot",
          color: 0x414b4c,
          fields: [
            {
              name: "Made by",
              value: "[Froxcey↗](https://github.com/Froxcey)",
              inline: true,
            },
            {
              name: "Source",
              value: "On [Github↗](https://github.com/Froxcey/Chii-chan)",
              inline: true,
            },
          ],
          footer: {
            iconURL:
              "https://media1.tenor.com/m/NOkXno0KD4AAAAAC/girls-last-tour-chito.gif",
            text: "A bit too simple innit?",
          },
        },
      ],
    });
  });
}