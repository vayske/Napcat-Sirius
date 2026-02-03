import { logger } from "../../../utils/logger.js";

const PLUGIN_NAME = "linkPreview.miniapp";

function getMiniAppURL(data: string) {
  let url = "";
  try {
    const dataObject = JSON.parse(data);
    url = dataObject["meta"]["detail_1"]["qqdocurl"];
  } catch (error) {
    logger.error(`[${PLUGIN_NAME}]:\terror [${error}]`)
  } finally {
    return url;
  }
}

export { getMiniAppURL };
