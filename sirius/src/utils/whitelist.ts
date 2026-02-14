import { logger } from "./logger.js";
import { db } from "./database.js"
import { NCWebsocket, Structs } from "node-napcat-ts";

const PLUGIN_NAME = "whitelist";

async function subscribePlugin(plugin: string, group_id: number) {
  logger.info(`[${PLUGIN_NAME}] 群 [${group_id}] 开启插件 [${plugin}]`);
  const key = `${PLUGIN_NAME}:${plugin}`;
  await db.sAdd(key, group_id.toString());
}

async function unSubscribePlugin(plugin: string, group_id: number) {
  logger.info(`[${PLUGIN_NAME}] 群 [${group_id}] 移除插件 [${plugin}]`);
  const key = `${PLUGIN_NAME}:${plugin}`;
  await db.sRem(key, group_id.toString());
}

async function isSubscribed(plugin: string, group_id: number) {
  const key = `${PLUGIN_NAME}:${plugin}`;
  const status = await db.sIsMember(key, group_id.toString());
  return status;
}

async function getSubscribedGroups(plugin: string) {
  const key = `${PLUGIN_NAME}:${plugin}`;
  try {
    const members = await db.sMembers(key);
    return members.map(id => parseInt(id));
  } catch (error) {
    logger.error(`[${PLUGIN_NAME}]:\t获取[${plugin}]订阅列表失败: ${error}`);
    return [];
  }
}

function listenForSubscription(napcat: NCWebsocket, plugin: string) {
  napcat.on("message.group", async context => {
    const text = context.raw_message.trim();
    if (text === `/添加插件 ${plugin}`) {
      await subscribePlugin(plugin, context.group_id);
      await napcat.send_group_msg({
        group_id: context.group_id,
        message: [Structs.text(`已添加[${plugin}]插件`)]
      });
      return;
    }
    if (text === `/移除插件 ${plugin}`) {
      await unSubscribePlugin(plugin, context.group_id);
      await napcat.send_group_msg({
        group_id: context.group_id,
        message: [Structs.text(`已移除[${plugin}]插件`)]
      });
      return;
    }
  });
}

export { isSubscribed, listenForSubscription, getSubscribedGroups };
