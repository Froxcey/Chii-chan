import type { Client } from "oceanic.js";
import autocomplete from "./autocomplete";
import schedule from "./schedule";
import info from "./info";
import follow from "./follow";
import drop from "./drop";
import modTools from "./modTools";

export default function cmd(client: Client, extraData: ExtraData) {
  console.info("Registering commands");
  schedule(client);
  info(client);
  follow(client, extraData);
  drop(client, extraData);
  modTools(client, extraData);
  autocomplete(client);
}
