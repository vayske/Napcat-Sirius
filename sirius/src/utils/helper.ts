import { GroupMessage } from "node-napcat-ts";
function parseCommand(command: string, context: GroupMessage) {
  const args: string[] = [];
  context.message.forEach(msg => {
    if (msg.type === "text" && msg.data.text.includes(command)) {
      const parameters = msg.data.text.trim().split(" ");
      parameters.forEach(param => {
        if (param !== command) {
          args.push(param);
        }
      });
    }
  });
  return args;
}

export { parseCommand };
