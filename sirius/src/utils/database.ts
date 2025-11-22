import { createClient, RedisClientType } from "redis";
import { logger } from "./logger.js";

const PLUGIN_NAME = "Redis"
const db: RedisClientType = createClient({
  url: "redis://db:6379"
});

db.on("error", error => {
  logger.info(`[${PLUGIN_NAME}]:\tclient error:\t${JSON.stringify(error)}`);
})
export { db };
