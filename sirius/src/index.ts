import { NCWebsocket } from "node-napcat-ts";
import * as fs from "fs";
import path from 'path';
import { setupDebug } from "./utils/debug.js";
import { logger } from "./utils/logger.js";
import { db } from "./utils/database.js";

const PLUGIN_NAME = "sirius";
const PLUGINS_DIR = path.join(path.dirname(import.meta.filename), "plugins");


async function loadPlugins(napcat: NCWebsocket) {
  logger.info(`[${PLUGIN_NAME}]:\t正在加载插件...`);
  try {
    const plugins = fs.readdirSync(PLUGINS_DIR, {withFileTypes: true});
    if (plugins.length === 0) {
      logger.warn(`[${PLUGIN_NAME}]:\t没有找到插件文件夹`);
    }
    const loadAll = plugins.map(async (plugin) => {
      try {
        const module = await import(path.join(PLUGINS_DIR, plugin.name));
        if (module.PLUGIN_NAME) {
          logger.info(`[${PLUGIN_NAME}]:\t[${module.PLUGIN_NAME}] 加载中...`);
          if (module.initPlugin && typeof(module.initPlugin) === "function") {
            module.initPlugin(napcat);
          }
          logger.info(`[${PLUGIN_NAME}]:\t[${module.PLUGIN_NAME}] 加载完毕`);
        }
      } catch (error) {
        logger.error(`[${PLUGIN_NAME}]:\t[${plugin.name}]加载异常: [${error}]`);
      }
    });
    await Promise.all(loadAll);
    logger.info(`[${PLUGIN_NAME}]:\t插件加载完毕`);
  } catch (err) {
     logger.error(`[${PLUGIN_NAME}]:\t读取插件遇到未知错误：${err}`);
     throw err;
  }
}

async function main() {
  await db.connect();
  const napcat = new NCWebsocket({
    protocol: 'ws',
    host: "napcat",
    port: 3001,
    accessToken: "napcatToken",
    throwPromise: true,
    reconnection: {
      enable: true,
      attempts: 10,
      delay: 5000
    }
  }, false);
  setupDebug(napcat);
  await loadPlugins(napcat);
  logger.info(`[${PLUGIN_NAME}]:\t正在与NapCat建立连接...`);
  await napcat.connect();
  logger.info(`[${PLUGIN_NAME}]:\t连接成功，开始监听事件...`);
}

main();
