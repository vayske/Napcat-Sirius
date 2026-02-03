import { NCWebsocket, SendMessageSegment, Structs } from "node-napcat-ts";
import axios from "axios";
import * as cheerio from "cheerio";
import { previewTweet } from "./twitter/index.js";
import { getMiniAppURL } from "./mini-app/index.js";
import { isRegistered, listenForRegister } from "../../utils/whitelist.js";
import { logger } from "../../utils/logger.js";
import Preview from "./definition.js";

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
            // Check Twitter
            let preview: Preview = await previewTweet(url);
            if (isEmptyPreview(preview)) preview = await fetchPreviewData(url);
            const builtMsg = buildMessage(preview);
            builtMsg.forEach(async m => {
              logger.info(`[${PLUGIN_NAME}]: sending preview for [${url}] ...`);
              await napcat.send_group_msg({ group_id: context.group_id, message: m });
            })
          } catch (error) {
            logger.error(`[${PLUGIN_NAME}]: Error during fetching url [${JSON.stringify(error)}]`);
          }
        }
      }
    });
  });
  // mini app
  napcat.on("message.group", async (context) => {
    const message = context.message;
    message.forEach(async (msg) => {
      if (msg.type === "json") {
        const url = getMiniAppURL(msg.data.data);
        if (!url) return;
        let preview = await fetchPreviewData(url);
        const builtMsg = buildMessage(preview);
        builtMsg.forEach( async m => {
          await napcat.send_group_msg({group_id: context.group_id, message: m});
        })
      }
    });
  });
}

function buildMessage(preview: Preview) {
  let message: SendMessageSegment[] = [];
  let videoMessage: SendMessageSegment[] = [];
  preview["text"].forEach(text => message.push(Structs.text(text)));
  preview["picture"].forEach(picture => message.push(Structs.image(picture)));
  preview["video"].forEach(video => videoMessage.push(Structs.video(video)));
  return [message, videoMessage];
}

async function fetchPreviewData(url: string, noURL: boolean = false) {
  const preview: Preview = {
    text: [],
    picture: [],
    video: []
  };
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
    preview["picture"].push(image);
  }
  if (title) preview["text"].push(`${title} ${noURL ? "" : link}`);
  return preview;
}

function isEmptyPreview(preview: Preview) {
  return Object.values(preview).every(arr => !arr || arr.length === 0);
}

export { PLUGIN_NAME, linkPreview as initPlugin };
