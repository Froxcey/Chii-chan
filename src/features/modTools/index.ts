import type { Client } from "oceanic.js";
import rm from "./rm";
import rename from "./rename";

export default function modTools(client: Client, extraData: ExtraData) {
  rename(client, extraData);
  rm(client, extraData);
}
