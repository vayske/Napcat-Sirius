import { NCWebsocket, SendMessageSegment, Structs } from "node-napcat-ts";
import axios from "axios";
import * as cheerio from "cheerio";
import { previewTweet } from "./twitter/index.js";
import { getMiniAppURL } from "./mini-app/index.js";
import { isSubscribed, listenForSubscription } from "../../utils/whitelist.js";
import { logger } from "../../utils/logger.js";
import Preview from "./definition.js";

const PLUGIN_NAME = "linkPreview";
const URL_REGEX = /(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/[^\s]+)/;

function linkPreview(napcat: NCWebsocket) {
  // plugin registration listener
  listenForSubscription(napcat, PLUGIN_NAME);
  napcat.on("message.group", async (context) => {
    const subscribed = await isSubscribed(PLUGIN_NAME, context.group_id);
    if (!subscribed ) return;

    const message = context.message;

    for (const msg of message) {
      let targetUrl = "";

      // get url
      if (msg.type === "text") {
        const match = msg.data.text.match(URL_REGEX);
        if (match) targetUrl = match[0];
      } else if (msg.type === "json") {
        // mini app
        const miniAppUrl = getMiniAppURL(msg.data.data);
        if (miniAppUrl) targetUrl = miniAppUrl;
      }

      if (!targetUrl) continue;

      // process url
      try {
        logger.info(`[${PLUGIN_NAME}]: Detected URL [${targetUrl}], rendering preview...`);
        let preview: Preview | null = null;
        let source: "twitter" | "general" = "general";
        const hostname = new URL(targetUrl).hostname;
        if (hostname.includes("twitter.com") || hostname.includes("x.com")) {
          // twitter
          preview = await previewTweet(targetUrl);
          source = "twitter";
        } else {
          preview = await fetchPreviewData(targetUrl);
          source = "general";
        }

        // send message
        if (preview) {
          const [textAndImages, videos] = buildMessage(preview, source);
          if (textAndImages.length > 0) {
            await napcat.send_group_msg({ group_id: context.group_id, message: textAndImages});
          }
          if (videos.length > 0) {
            await napcat.send_group_msg({ group_id: context.group_id, message: videos});
          }
        }
      } catch (error) {
        logger.error(`[${PLUGIN_NAME}]: Error during fetching url [${JSON.stringify(error)}]`);
      }
    }
  });
}


// -------------------------------------------------------



function buildMessage(preview: Preview, source: "twitter" | "general") {
  let message: SendMessageSegment[] = [];
  let videoMessage: SendMessageSegment[] = [];
  if (source == "general") {
    preview["picture"].forEach(picture => message.push(Structs.image(picture)));
    preview["text"].forEach(text => message.push(Structs.text(text)));
  } else {
    preview["text"].forEach(text => message.push(Structs.text(text)));
    preview["picture"].forEach(picture => message.push(Structs.image(picture)));
  }
  preview["video"].forEach(video => videoMessage.push(Structs.video(video)));
  return [message, videoMessage];
}

async function fetchPreviewData(url: string, noURL: boolean = false) {
  const preview: Preview = {
    text: [],
    picture: [],
    video: []
  };
  const response = await axios.get<string>(url, {
    headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"
      },
      timeout: 5000
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

export { PLUGIN_NAME, linkPreview as initPlugin };
