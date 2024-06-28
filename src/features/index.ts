import type { Client } from "oceanic.js";
import autocomplete from "./autocomplete";
import schedule from "./schedule";
import info from "./info";
import follow from "./follow";
import drop from "./drop";
import modTools from "./modTools";
import about from "./about";

export default function cmd(client: Client, extraData: ExtraData) {
  console.info("Registering commands");
  about(client);
  schedule(client);
  info(client);
  follow(client, extraData);
  drop(client, extraData);
  modTools(client, extraData);
  autocomplete(client);
}
