import type { Client } from "oceanic.js";
import rm from "./rm";

export default function modTools(client: Client, extraData: ExtraData) {
  rm(client, extraData);
}
