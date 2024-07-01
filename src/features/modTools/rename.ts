import {
  ApplicationCommandOptionTypes,
  ApplicationCommandTypes,
  InteractionContextTypes,
  type Client,
} from "oceanic.js";
import { isAdmin, sendError, sendSuccess } from "../../utils";

export default function rename(client: Client, extraData: ExtraData) {
  client.application.createGlobalCommand({
    type: ApplicationCommandTypes.CHAT_INPUT,
    name: "rename",
    description: "Modtool: Rename an entry quickly",
    options: [
      {
        type: ApplicationCommandOptionTypes.ROLE,
        name: "role",
        description: "Entry to rename",
        required: true,
      },
      {
        type: ApplicationCommandOptionTypes.STRING,
        name: "name",
        description: "Name to apply",
        required: true,
      },
    ],
    contexts: [InteractionContextTypes.GUILD],
    defaultMemberPermissions: "8",
  });

  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommandInteraction()) return;
    if (interaction.data.name != "rename") return;

    const task = extraData.logger.createTask(
      "rename",
      "Initializing rename request from",
      interaction.user.id,
    );

    interaction.defer();

    if (!(await isAdmin(interaction.member!.id, extraData.defaultData.guild)))
      return sendError(
        interaction,
        [
          "Insufficient permission",
          "Insufficient permission to remove this entry",
        ],
        task,
      );

    const role = interaction.data.options.getRole("role", true);
    const name = interaction.data.options.getString("name", true);

    const oldName = role.name;

    await role.edit({ name: name });

    sendSuccess(
      interaction,
      ["Entry renamed", oldName + " has been renamed to " + name],
      task,
    );
  });
}
