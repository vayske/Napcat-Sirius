import { NCWebsocket } from "node-napcat-ts";
import { logger } from "./logger.js";

const PLUGIN_NAME = "debug";

function setupDebug(napcat: NCWebsocket) {
  logger.info(`[${PLUGIN_NAME}]:\t注册消息调试事件...`);
  napcat.on("message.group", context => {
    logger.info(`[${PLUGIN_NAME}]:\t[${context.group_id}][${context.sender.card}(${context.sender.user_id})] -> ${JSON.stringify(context.message)}`);
  });
  napcat.on("message_sent.group", context => {
    logger.info(`[${PLUGIN_NAME}]:\t[${context.group_id}][${context.sender.card}(${context.sender.user_id})] <- ${JSON.stringify(context.message)}`);
  });
}

export { setupDebug };
