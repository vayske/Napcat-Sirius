import { NCWebsocket, Structs } from "node-napcat-ts";
import { isSubscribed, listenForSubscription } from "../../utils/whitelist.js";

const PLUGIN_NAME = "emojiToImage";

function emojiToImage(npacat: NCWebsocket) {
  listenForSubscription(npacat, PLUGIN_NAME);
  npacat.on("message.group", async (context) => {
    const subscribed = await isSubscribed(PLUGIN_NAME, context.group_id);
    if (!subscribed) return;
    const message = context.message;
    if (message[0].type === "reply") {
      const lastElement = message.at(-1);
      if (lastElement && lastElement.type === "text" && lastElement.data.text.trim() === "转图片") {
        const replyId = parseInt(message[0].data.id);
        const targetMsg = await npacat.get_msg({message_id: replyId});
        targetMsg.message.forEach(async (msg) => {
          if (msg.type === "image") {
            await npacat.send_group_msg({
              group_id: context.group_id,
              message: [Structs.image(msg.data.file,"", 0)]
            });
          }
        });
      }
    }
  });
}

export { PLUGIN_NAME, emojiToImage as initPlugin };
