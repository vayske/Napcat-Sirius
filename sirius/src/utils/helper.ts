import { GroupMessage } from "node-napcat-ts";

interface CommandResult {
  command :string;
  arg: string;
  rawText: string;
}

function parseCommand(context: GroupMessage): CommandResult {
  const text = context.message.find(msg => msg.type === "text")?.data.text?.trim();
  const result: CommandResult = {
    command: "",
    arg: "",
    rawText: ""
  };
  if (!text) return result;
  result.rawText = text;
  if (!text.startsWith("/")) return result;

  const firstSpaceIndex = text.indexOf(" ");
  if (firstSpaceIndex === -1) {
    result.command = text;
    return result;
  }

  result.command = text.substring(0, firstSpaceIndex);
  result.arg = text.substring(firstSpaceIndex+1).trim();
  return result;
}

export { parseCommand };
