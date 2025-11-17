import { NCWebsocket, SendMessageSegment, Structs } from "node-napcat-ts";
import axios from "axios";
import * as cheerio from "cheerio";
import { previewTweet } from "./twitter/index.js";
import { sendGroupMsg } from "@/utils/whitelist.js";
import { logger } from "@/utils/logger.js";

const PLUGIN_NAME = "LinkPreview";

function linkPreview(napcat: NCWebsocket) {
  napcat.on("message.group", (context) => {
    const group = context.group_id;
    const message = context.message;
    message.forEach(async (msg) => {
      if (msg.type === "text") {
        const text = msg.data.text;
        const result = text.match(/^(https?:\/\/)?(www\.)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(:\d{1,5})?(\/[a-zA-Z0-9-._~:/?#\[\]@!$&'()*+,;=%]*)?$/);
        if (result) {
          const url = result[0];
          logger.info(`[${PLUGIN_NAME}]: Detected URL [${url}], rendering preview...`);
          let preview = await previewTweet(url);
          if (!preview) preview = await fetchPreviewData(url);
          if (preview.length > 0) {
            logger.info(`[${PLUGIN_NAME}]: sending preview for [${url}] ...`);
            await sendGroupMsg(napcat, PLUGIN_NAME, group, preview);
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
  const image = $("meta[property='og:image']").attr("content");
  if (image) preview.push(Structs.image(image));
  if (title) preview.push(Structs.text(title));
  if (link) preview.push(Structs.text(` ${link}`));
  return preview;
}

export default linkPreview;
