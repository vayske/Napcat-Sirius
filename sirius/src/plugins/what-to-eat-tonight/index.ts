import { NCWebsocket, Structs } from "node-napcat-ts";
import { listenForSubscription, isSubscribed } from "../../utils/whitelist.js";
import { db } from "../../utils/database.js";
import { logger } from "../../utils/logger.js";
import { parseCommand } from "../../utils/helper.js";
import path from "path";

const PLUGIN_NAME = "whatToEatTonight";
const NO_RESULT_MSG = "吃…吃我一拳！";
const DIRNAME = path.dirname(import.meta.url);

function dinnerTime(napcat: NCWebsocket) {
  listenForSubscription(napcat, PLUGIN_NAME);
  napcat.on("message.group", async (context) => {
    const subscribed = await isSubscribed(PLUGIN_NAME, context.group_id)
    if(!subscribed) return;

    const { command, arg, rawText } = parseCommand(context);
    if (!command) {
      if(rawText.includes("吃啥") || rawText.includes("吃什么")) {
        await handleFind(napcat, context.group_id)
      }
      return;
    }

    switch (command) {
      case "/添加餐厅":
        handleAdd(napcat, context.group_id, arg);
        return;
      case "/移除餐厅":
        handleRemove(napcat, context.group_id, arg);
        return;
      case "/餐厅列表":
        handleList(napcat, context.group_id);
        return;
    }
  });
}


// handlers
async function handleAdd(napcat: NCWebsocket, group: number, restaurant: string) {
  if(!restaurant) {
    await napcat.send_group_msg({
      group_id: group,
      message: [Structs.text("请输入餐厅名字，例：/添加餐厅 麦当劳")]
    });
    return;
  }

  const success = await addRestaurant(group, restaurant);
  const reply = success ? `添加[${restaurant}]成功` : `添加[${restaurant}]失败（已存在）`;
  await napcat.send_group_msg({
    group_id: group,
    message: [Structs.text(reply)]
  });
}

async function handleRemove(napcat: NCWebsocket, group: number, restaurant: string) {
  if(!restaurant) {
    await napcat.send_group_msg({
      group_id: group,
      message: [Structs.text("请输入餐厅名字，例：/移除餐厅 麦当劳")]
    });
    return;
  }
  const success = await removeRestaurant(group, restaurant);
  const reply = success ? `移除[${restaurant}]成功` : `移除[${restaurant}]失败（没有找到该餐厅）`;
  await napcat.send_group_msg({
    group_id: group,
    message: [Structs.text(reply.trim())]
  });
}

async function handleList(napcat: NCWebsocket, group: number) {
  const result = await listAll(group);
  if (result.length === 0) {
    await napcat.send_group_msg({
      group_id: group,
      message: [Structs.text("餐厅列表为空")]
    });
    return;
  }
  let message = "";
  result.forEach(restaurant => {
    message += `${restaurant}\n`;
  });
  await napcat.send_group_msg({
    group_id: group,
    message: [Structs.text(message)]
  });
}

async function handleFind(napcat: NCWebsocket, group: number) {
  const restaurant = await pickRestaurant(group);
  await napcat.send_group_msg({
    group_id: group,
    message: [Structs.text(restaurant)]
  });

  if (restaurant === NO_RESULT_MSG) {
    try {
      await napcat.send_group_msg({
        group_id: group,
        message: [Structs.image(`${DIRNAME}/nekofist.jpg`)]
      });
    } catch (error) {
      logger.error(`${JSON.stringify(error)}`)
    }
  }
}

// DB services
async function addRestaurant(group: number, restaurant: string) {
  try {
    logger.info(`[${PLUGIN_NAME}]:\t[${group}]添加餐厅[${restaurant}]...`);
    const addedCount = await db.sAdd(`${PLUGIN_NAME}:${group}`, restaurant);
    return addedCount;
  } catch (error) {
    logger.error(`[${PLUGIN_NAME}]:\t[${group}]添加餐厅[${restaurant}]错误:\t[${error}]`);
    return 0;
  }
}

async function removeRestaurant(group: number, restaurant: string) {
  try {
    logger.info(`[${PLUGIN_NAME}]:\t[${group}]移除餐厅[${restaurant}]...`);
    const removedCount = await db.sRem(`${PLUGIN_NAME}:${group}`, restaurant);
    return removedCount;
  } catch (error) {
    logger.error(`[${PLUGIN_NAME}]:\t[${group}]移除餐厅[${restaurant}]错误:\t[${error}]`);
    return 0;
  }
}

async function listAll(group: number) {
  try {
    const result = await db.sMembers(`${PLUGIN_NAME}:${group}`);
    return result;
  } catch (error) {
    logger.error(`[${PLUGIN_NAME}]:\t[${group}]获取列表错误:\t[${error}]`);
    return [];
  }

}

async function pickRestaurant(group: number) {
  try {
    logger.info(`[${PLUGIN_NAME}]:\t[${group}]随机选择餐厅...`);
    const result = await db.sRandMember(`${PLUGIN_NAME}:${group}`);
    return result || NO_RESULT_MSG;
  } catch (error) {
    logger.error(`[${PLUGIN_NAME}]:\t[${group}]选择餐厅错误:\t[${error}]`);
    return NO_RESULT_MSG;
  }
}

export { PLUGIN_NAME, dinnerTime as initPlugin };
