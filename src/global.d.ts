import type { Result } from "ts-results-es";
import { Database, Statement } from "bun:sqlite";
import type { ForumChannel, Guild, TextChannel } from "oceanic.js";
import type TaskLogger from "./task-logger";

export {};

declare global {
  type MyErr = [string, string | undefined];
  type AsyncRes<T> = Promise<Result<T, MyErr>>;
  type ScheduleDoc = {
    id: number;
    role: string;
    nextEp: number;
    nextTime: number;
    title: string;
  };
  type ArchivedDoc = {
    id: number;
    role: string;
  };
  type ExtraData = {
    database: {
      db: Database;
      queries: Record<
        | "listFind"
        | "listFindRole"
        | "listInsert"
        | "listAll"
        | "listUpdate"
        | "listDelRole"
        | "toArchive1"
        | "toArchive2"
        | "archiveFind"
        | "archiveFindRole"
        | "archiveInsert"
        | "archiveDelRole",
        Statement<any, any[]>
      >;
    };
    defaultData: {
      guild: Guild;
      channel: TextChannel;
      forum: ForumChannel;
      modChannel: TextChannel;
    };
    logger: TaskLogger;
    getRole: (id: string) => Promise<Role>;
  };
}
