import { NCWebsocket, Structs } from "node-napcat-ts";
import { listenForRegister, isRegistered } from "../../utils/whitelist.js";
import { db } from "../../utils/database.js";
import { logger } from "../../utils/logger.js";
import { parseCommand } from "../../utils/helper.js";
import path from "path";


const PLUGIN_NAME = "whatToEatTonight";
const NO_RESULT_MSG = "吃…吃我一拳！";
const DIRNAME = path.dirname(import.meta.url);

function dinnerTime(napcat: NCWebsocket) {
  listenForRegister(napcat, PLUGIN_NAME);
  napcat.on("message.group", async (context) => {
    if(!isRegistered(PLUGIN_NAME, context.group_id)) return;
    const restaurants = parseCommand("/添加餐厅", context);
    if(restaurants.length > 0) {
      let reply = "";
      const addAll = restaurants.map(async (name) => {
        if (await addRestaurant(context.group_id, name)) {
          reply += `添加[${name}]成功\n`;
        } else {
          reply += `添加[${name}]失败\n`;
        }
      });
      await Promise.all(addAll);
      await napcat.send_group_msg({
        group_id: context.group_id,
        message: [Structs.text(reply.trim())]
      });
    }
  });
  napcat.on("message.group", async (context) => {
    if(!isRegistered(PLUGIN_NAME, context.group_id)) return;
    const restaurants = parseCommand("/移除餐厅", context);
    if(restaurants.length > 0) {
      let reply = "";
      const addAll = restaurants.map(async (name) => {
        if (await removeRestaurant(context.group_id, name)) {
          reply += `移除[${name}]成功\n`;
        } else {
          reply += `移除[${name}]失败\n`;
        }
      });
      await Promise.all(addAll);
      await napcat.send_group_msg({
        group_id: context.group_id,
        message: [Structs.text(reply.trim())]
      });
    }
  });
  napcat.on("message.group", async (context) => {
    if(!isRegistered(PLUGIN_NAME, context.group_id)) return;
    if(context.message.length > 1 || context.message[0].type != "text") return;
    if(context.message[0].data.text.startsWith("/餐厅列表")) {
      const result = await db.lRange(`${PLUGIN_NAME}:${context.group_id}`, 0, -1);
      let message = "";
      result.forEach(restaurant => {
        message += `${restaurant}\n`;
      })
      if(message != "") {
        await napcat.send_group_msg({
          group_id: context.group_id,
          message: [Structs.text(message)]
        });
      }
    }
  });
  napcat.on("message.group", async (context) => {
    if(!isRegistered(PLUGIN_NAME, context.group_id)) return;
    if(context.raw_message.includes("吃啥") || context.raw_message.includes("吃什么")) {
      const restaurant = await findRestaurant(context.group_id);
      await napcat.send_group_msg({
        group_id: context.group_id,
        message: [Structs.text(restaurant)]
      });
      try {
        if (restaurant === NO_RESULT_MSG) {
          await napcat.send_group_msg({
            group_id: context.group_id,
            message: [Structs.image(`${DIRNAME}/nekofist.jpg`)]
          });
        }
      } catch (error) {
        console.log(`${JSON.stringify(error)}`)
      }
    }
  });
}

async function addRestaurant(group: number, restaurant: string) {
  try {
    const result = await db.lRange(`${PLUGIN_NAME}:${group}`, 0, -1);
    if (result.includes(restaurant)) {
      return false;
    }
    logger.info(`[${PLUGIN_NAME}]:\t[${group}]添加餐厅[${restaurant}]...`);
    await db.lPush(`${PLUGIN_NAME}:${group}`, restaurant);
    return true;
  } catch (error) {
    logger.info(`[${PLUGIN_NAME}]:\t[${group}]添加餐厅[${restaurant}]错误:\t[${error}]`);
    return false;
  }
}

async function removeRestaurant(group: number, restaurant: string) {
  try {
    logger.info(`[${PLUGIN_NAME}]:\t[${group}]移除餐厅[${restaurant}]...`);
    await db.lRem(`${PLUGIN_NAME}:${group}`, 0, restaurant);
    return true;
  } catch (error) {
    logger.info(`[${PLUGIN_NAME}]:\t[${group}]移除餐厅[${restaurant}]错误:\t[${error}]`);
    return false;
  }
}

async function findRestaurant(group: number) {
  try {
    logger.info(`[${PLUGIN_NAME}]:\t[${group}]选择餐厅...`);
    const result = await db.lRange(`${PLUGIN_NAME}:${group}`, 0, -1);
    if (result.length === 0) return NO_RESULT_MSG;
    const choice = Math.floor(Math.random() * result.length);
    return result[choice];
  } catch (error) {
    logger.info(`[${PLUGIN_NAME}]:\t[${group}]选择餐厅错误:\t[${error}]`);
    return NO_RESULT_MSG;
  }
}

export { PLUGIN_NAME, dinnerTime as initPlugin };
