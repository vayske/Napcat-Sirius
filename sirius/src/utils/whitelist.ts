import { NCWebsocket, SendMessageSegment } from "node-napcat-ts";
import * as fs from "fs";
import { logger } from "@/utils/logger.js";
import { SiriusConfig } from "@/utils/definitions.js";

const CONFIG_FILENAME = "sirius.json";
const PLUGIN_NAME = "Whitelist";

let config!: SiriusConfig;

function setupWhiteList(cfg: SiriusConfig) {
  logger.info(`[${PLUGIN_NAME}]: 配置插件白名单...`);
  config = cfg;
}

function registerPlugin(plugin: string, group_id: number) {
  logger.info(`[${PLUGIN_NAME}] Registering Plugin[${plugin}] to Group[${group_id}]`);
  const whitelist = config.pluginWhiteList;
  if (!whitelist[plugin]) {
    whitelist[plugin] = [group_id];
  } else {
    whitelist[plugin].push(group_id);
  }
  config.pluginWhiteList = whitelist;
  saveConfig();
}

function isRegistered(plugin: string, group_id: number) {
  const whitelist = config.pluginWhiteList;
  return (whitelist[plugin] && whitelist[plugin].includes(group_id));
}

async function sendGroupMsg(napcat: NCWebsocket, plugin: string, group_id: number, message: SendMessageSegment[]) {
  if (!isRegistered(plugin, group_id)) return;
  await napcat.send_group_msg({group_id, message});
}

function saveConfig() {
  fs.writeFileSync(CONFIG_FILENAME, JSON.stringify(config, null, 2), "utf-8");
}

export { registerPlugin, setupWhiteList, sendGroupMsg };
