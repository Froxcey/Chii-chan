import {
  ApplicationCommandOptionTypes,
  ApplicationCommandTypes,
  InteractionContextTypes,
  InteractionTypes,
  type Client,
} from "oceanic.js";
import { sendError, sendSuccess } from "../utils";

export default function drop(client: Client, extraData: ExtraData) {
  console.info("Registering drop command");

  client.application.createGlobalCommand({
    type: ApplicationCommandTypes.CHAT_INPUT,
    name: "drop",
    description: "Stop getting notified for an anime",
    options: [
      {
        type: ApplicationCommandOptionTypes.ROLE,
        name: "role",
        description: "Anime to drop",
        required: true,
      },
    ],
    contexts: [InteractionContextTypes.GUILD],
  });

  client.on("interactionCreate", async (interaction) => {
    if (interaction.type != InteractionTypes.APPLICATION_COMMAND) return;
    if (interaction.data.name != "drop") return;

    const role = interaction.data.options.getRole("role", true);

    if (
      !extraData.database.queries.listFindRole.get(role.id) &&
      !extraData.database.queries.archiveFindRole.get(role.id)
    )
      return sendError(interaction, [
        "Invalid role",
        "This role is not associated with an anime entry. If you think this is a mistake, please contact Froxcey.",
      ]);

    interaction.defer(64);

    await interaction.member?.removeRole(role.id);

    sendSuccess(interaction, [
      "Entry Dropped",
      `Removed ${role.mention} from your following list.`,
    ]);
  });
}
