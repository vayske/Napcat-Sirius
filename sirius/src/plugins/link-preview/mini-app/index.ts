import { logger } from "../../../utils/logger.js";

const PLUGIN_NAME = "linkPreview.miniapp";

function getMiniAppURL(data: string) {
  try {
    const dataObject = JSON.parse(data);
    const url: string = dataObject["meta"]["detail_1"]["qqdocurl"];
    return url;
  } catch (error) {
    logger.error(`[${PLUGIN_NAME}]:\terror [${error}]`)
    return "";
  }
}

export { getMiniAppURL };
