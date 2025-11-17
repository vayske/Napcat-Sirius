import { NCWebsocket } from "node-napcat-ts";
import { logger } from "@/utils/logger.js";

const PLUGIN_NAME = "Debug";

function setupDebug(napcat: NCWebsocket) {
  logger.info(`[${PLUGIN_NAME}]: 注册消息调试事件...`);
  napcat.on("message.group", context => {
      logger.info(`[${PLUGIN_NAME}]: [${context.group_id}][${context.sender.card}(${context.sender.user_id})] -> ${JSON.stringify(context.message)}`);
    });
    napcat.on("message_sent.group", context => {
      logger.info(`[${PLUGIN_NAME}]: [${context.group_id}][${context.sender.card}(${context.sender.user_id})] <- ${JSON.stringify(context.message)}`);
    });
}

export { setupDebug };
