import {
  ApplicationCommandOptionTypes,
  ApplicationCommandTypes,
  ButtonStyles,
  ComponentTypes,
  InteractionContextTypes,
  Role,
  TextChannel,
  type Client,
} from "oceanic.js";
import { sendError, sendSuccess } from "../../utils";

let queries: ExtraData["database"]["queries"];

export default function rm(client: Client, extraData: ExtraData) {
  queries = extraData.database.queries;

  client.application.createGlobalCommand({
    type: ApplicationCommandTypes.CHAT_INPUT,
    name: "rm",
    description: "Modtool: Remove an archived entry",
    options: [
      {
        type: ApplicationCommandOptionTypes.ROLE,
        name: "role",
        description: "Entry to delete",
        required: true,
      },
    ],
    contexts: [InteractionContextTypes.GUILD],
    defaultMemberPermissions: "8",
  });

  client.on("interactionCreate", async (interaction) => {
    if (interaction.isComponentInteraction()) {
      const id = interaction.data.customID;
      if (id == "dismiss") interaction.message.delete();
      if (id.startsWith("rmrol:")) {
        const roleID = id.replace("rmrol:", "");
        del(await extraData.getRole(roleID));
      }
      return;
    }

    if (!interaction.isCommandInteraction()) return;
    if (interaction.data.name != "rm") return;

    interaction.defer();

    const role = interaction.data.options.getRole("role", true);
    if (
      !queries.listFindRole.get(role.id) &&
      !queries.archiveFindRole.get(role.id)
    )
      return sendError(interaction, [
        "Invalid Role",
        "The anime associated with this role could not be found. Maybe this is not an anime role?",
      ]);

    const name = role.name;
    del(role);

    sendSuccess(interaction, [
      "Entry Removed",
      name + " and the associated data has been successfully wiped",
    ]);
  });
}

export async function del(role: Role) {
  queries.archiveDelRole.run(role.id);
  queries.listDelRole.run(role.id);
  role.delete();
}

export function softDelete(
  modChannel: TextChannel,
  doc: ScheduleDoc,
  role: Role,
) {
  modChannel.createMessage({
    content: `> ${doc.title} stopped airing after <t:${doc.nextTime}> and has been moved to archive. Remove ${role.mention}?`,
    components: [
      {
        components: [
          {
            type: ComponentTypes.BUTTON,
            style: ButtonStyles.DANGER,
            customID: "rmrol:" + doc.role,
            emoji: { name: "🗑️" },
            label: "Remove",
          },
          {
            type: ComponentTypes.BUTTON,
            style: ButtonStyles.SECONDARY,
            customID: "🗄️",
            label: "Archive",
          },
        ],
        type: ComponentTypes.ACTION_ROW,
      },
    ],
  });
  role.edit({ color: 0x151f2e });
  queries.toArchive.run(doc.id);
}
