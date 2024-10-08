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
import { isAdmin, sendError, sendSuccess } from "../../utils";

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
      if (id == "archive") interaction.message.delete();
      if (id.startsWith("rmrol:")) {
        const roleID = id.replace("rmrol:", "");
        del(await extraData.getRole(roleID));
      }
      return;
    }

    if (!interaction.isCommandInteraction()) return;
    if (interaction.data.name != "rm") return;

    const task = extraData.logger.createTask(
      "rm",
      "Initializing rm request from",
      interaction.user.id,
    );

    interaction.defer();

    if (!(await isAdmin(interaction.member!.id, extraData.defaultData.guild)))
      return sendError(
        interaction,
        [
          "Insufficient permission",
          "You don't have the permission to remove entries",
        ],
        task,
      );

    const role = interaction.data.options.getRole("role", true);
    if (
      !queries.listFindRole.get(role.id) &&
      !queries.archiveFindRole.get(role.id)
    )
      return sendError(
        interaction,
        [
          "Invalid Role",
          "The anime associated with this role could not be found. Maybe this is not an anime role?",
        ],
        task,
      );

    const name = role.name;
    del(role);

    sendSuccess(
      interaction,
      [
        "Entry Removed",
        name + " and the associated data has been successfully wiped",
      ],
      task,
    );
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
            style: ButtonStyles.PRIMARY,
            customID: "archive",
            emoji: { name: "🗄️" },
            label: "Confirm archive",
          },
          {
            type: ComponentTypes.BUTTON,
            style: ButtonStyles.DANGER,
            customID: "rmrol:" + doc.role,
            emoji: { name: "🗑️" },
            label: "Remove",
          },
        ],
        type: ComponentTypes.ACTION_ROW,
      },
    ],
  });
  role.edit({ color: 0x151f2e });
  modChannel.guild.editRolePositions([
    { id: role.id, position: modChannel.guild.roles.size },
  ]);
  queries.toArchive1.run(doc.id);
  queries.toArchive2.run(doc.id);
}
