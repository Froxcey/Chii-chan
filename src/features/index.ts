import type { Client } from "oceanic.js";
import autocomplete from "./autocomplete";
import schedule from "./schedule";
import info from "./info";
import follow from "./follow";
import drop from "./drop";
import modTools from "./modTools";
import about from "./about";
import type { Task } from "../task-logger";

export default function cmd(
  client: Client,
  extraData: ExtraData,
  initTask: Task,
) {
  initTask.running("Registering commands");

  about(client, extraData);
  schedule(client, extraData);
  info(client, extraData);
  follow(client, extraData);
  drop(client, extraData);
  modTools(client, extraData);
  autocomplete(client, extraData);
}
