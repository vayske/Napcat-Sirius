import { NCWebsocket } from "node-napcat-ts";
import * as fs from "fs";
import path from 'path';
import { createInterface } from "readline/promises";
import { stdin as input, stdout as output } from "process";
import { setupWhiteList } from "@/utils/whitelist.js";
import { SiriusConfig } from "@/utils/definitions.js";
import { setupDebug } from "@/utils/debug.js";
import { logger } from "@/utils/logger.js";

const PLUGIN_NAME = "Sirius";
const CONFIG_FILENAME = "sirius.json";
const PLUGINS_DIR = path.join(path.dirname(import.meta.filename), "plugins");

async function promptInput(message: string) {
  const rl = createInterface({ input, output });
  const userInput = await rl.question(message);
  rl.close();
  return userInput;
}

async function createConfig() {
  const host = await promptInput("NapCat Host: ");
  const port = await promptInput("NapCat Port: ");
  const accessToken = await promptInput("NapCat accessToken: ");
  const config = {
    host,
    port: parseInt(port),
    accessToken,
    pluginWhiteList: {},
  };
  return config;
}

async function loadConfig() {
    try {
      const config: SiriusConfig = JSON.parse(fs.readFileSync(CONFIG_FILENAME, "utf-8"));
      logger.info(`[${PLUGIN_NAME}]: ✅ 配置文件加载成功。`);
      return config;
    } catch (readError) {
      if((readError as NodeJS.ErrnoException).code === "ENOENT") {
        logger.warn(`[${PLUGIN_NAME}]: ⚠️ 未找到配置文件，创建新默认配置...`);
        const config: SiriusConfig = await createConfig();
        try {
          fs.writeFileSync(CONFIG_FILENAME, JSON.stringify(config, null, 2), "utf-8");
        } catch (writeError) {
          logger.error(`[${PLUGIN_NAME}]: ❌ 无法写入默认配置文件: ${writeError}`);
          throw writeError;
        }
        return config;
      }
      logger.error(`[${PLUGIN_NAME}]: ❌ 加载配置时遇到非 ENOENT 错误: ${readError}`);
      throw readError;
    }
}

function loadPlugins(napcat: NCWebsocket) {
  logger.info(`[${PLUGIN_NAME}]: --- 🚀 开始加载所有插件 ---`);
  try {
    const plugins = fs.readdirSync(PLUGINS_DIR, {withFileTypes: true});
    if (plugins.length === 0) {
      logger.warn(`[${PLUGIN_NAME}]: 🤔 没有找到插件文件夹。`);
      return;
    }
    plugins.forEach(async (plugin) => {
      logger.info(`[${PLUGIN_NAME}]: ... 正在加载插件: ${plugin.name}`);
      const module = await import(path.join(PLUGINS_DIR, plugin.name));
      module.default(napcat);
    });
    logger.info(`[${PLUGIN_NAME}]: --- ✅ 所有插件加载完毕 ---`);
  } catch (err) {
     logger.error(`[${PLUGIN_NAME}]: 读取插件遇到未知错误：${err}`);
     throw err;
  }
}

async function main() {
  const config = await loadConfig();
  const napcat = new NCWebsocket({
    protocol: 'ws',
    host: config.host,
    port: config.port,
    accessToken: config.accessToken,
    throwPromise: true,
    reconnection: {
      enable: true,
      attempts: 10,
      delay: 5000
    }
  }, false);
  setupDebug(napcat);
  setupWhiteList(config);
  loadPlugins(napcat);
  logger.info(`[${PLUGIN_NAME}]: 正在与NapCat建立连接...`);
  await napcat.connect();
  logger.info(`[${PLUGIN_NAME}]: 连接成功，[${PLUGIN_NAME}] 加载完毕`);
}

main();
