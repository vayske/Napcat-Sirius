import { GroupMessage } from "node-napcat-ts";
function parseCommand(command: string, context: GroupMessage, split: boolean = false) {
  const args: string[] = [];
  context.message.forEach(msg => {
    if (msg.type === "text" && msg.data.text.includes(command)) {
      const text = msg.data.text.replace(command, "").trim();
      if (!split) {
        args.push(text);
      } else {
        text.split(" ").forEach(param => args.push(param));
      }
    }
  });
  return args;
}

export { parseCommand };
