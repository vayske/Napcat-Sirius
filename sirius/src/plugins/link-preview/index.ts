import { NCWebsocket, SendMessageSegment, Structs } from "node-napcat-ts";
import axios from "axios";
import * as cheerio from "cheerio";
import { previewTweet } from "./twitter/index.js";
import { isRegistered, listenForRegister } from "../../utils/whitelist.js";
import { logger } from "../../utils/logger.js";

const PLUGIN_NAME = "linkPreview";

function linkPreview(napcat: NCWebsocket) {
  listenForRegister(napcat, PLUGIN_NAME);
  napcat.on("message.group", async (context) => {
    const register = await isRegistered(PLUGIN_NAME, context.group_id);
    if (!register ) return;
    const message = context.message;
    message.forEach(async (msg) => {
      if (msg.type === "text") {
        const text = msg.data.text;
        const result = text.match(/^(https?:\/\/)?(www\.)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(:\d{1,5})?(\/[a-zA-Z0-9-._~:/?#\[\]@!$&'()*+,;=%]*)?$/);
        if (result) {
          try {
            const url = result[0];
            logger.info(`[${PLUGIN_NAME}]: Detected URL [${url}], rendering preview...`);
            let preview = await previewTweet(url);
            if (preview.length == 0) preview = await fetchPreviewData(url);
            if (preview.length > 0) {
              logger.info(`[${PLUGIN_NAME}]: sending preview for [${url}] ...`);
              await napcat.send_group_msg({ group_id: context.group_id, message: preview });
            }
          } catch (error) {
            logger.error(`[${PLUGIN_NAME}]: Error during fetching url [${JSON.stringify(error)}]`);
          }
        }
      }
    });
  });
}

async function fetchPreviewData(url: string) {
  const preview: SendMessageSegment[] = [];
  const response = await axios<string>({
    method: "get",
    url,
  });
  const html = response.data;
  const $ = cheerio.load(html);
  const title = $("meta[property='og:title']").attr("content");
  const link = $("meta[property='og:url']").attr("content");
  let image = $("meta[property='og:image']").attr("content");
  if (image) {
    // Bilibili
    if (image.startsWith("//")) {
      image = "https:" + image.split("@")[0];
    }
    preview.push(Structs.image(image));
  }
  if (title) preview.push(Structs.text(`${title} ${link}`));
  return preview;
}

export { PLUGIN_NAME, linkPreview as initPlugin };
