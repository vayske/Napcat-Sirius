import { logger } from "./logger.js";
import { db } from "./database.js"
import { NCWebsocket, Structs } from "node-napcat-ts";

const PLUGIN_NAME = "whitelist";

async function registerPlugin(plugin: string, group_id: number) {
  logger.info(`[${PLUGIN_NAME}] 群聊 [${group_id}] 添加插件 [${plugin}]`);
  await db.set(`${PLUGIN_NAME}:${group_id}:${plugin}`, '1');
}

async function unRegisterPlugin(plugin: string, group_id: number) {
  logger.info(`[${PLUGIN_NAME}] 群聊 [${group_id}] 移除插件 [${plugin}]`);
  await db.set(`${PLUGIN_NAME}:${group_id}:${plugin}`, '0');
}

async function isRegistered(plugin: string, group_id: number) {
  const status = await db.get(`${PLUGIN_NAME}:${group_id}:${plugin}`);
  return status === "1";
}

function listenForRegister(napcat: NCWebsocket, plugin: string) {
  napcat.on("message.group", async context => {
    if (context.raw_message.includes(`/添加插件 ${plugin}`)) {
      await registerPlugin(plugin, context.group_id);
      await napcat.send_group_msg({
        group_id: context.group_id,
        message: [Structs.text(`[${plugin}] 已加载`)]
      });
    }
  });
  napcat.on("message.group", async context => {
    if (context.raw_message.includes(`/移除插件 ${plugin}`)) {
      await unRegisterPlugin(plugin, context.group_id);
      await napcat.send_group_msg({
        group_id: context.group_id,
        message: [Structs.text(`[${plugin}] 已卸载`)]
      });
    }
  });
}

export { isRegistered, listenForRegister };
