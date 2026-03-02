import Anthropic from "@anthropic-ai/sdk";
import { actionToolSchema } from "@/prompts/session-brain";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface ClaudeMessage {
  role: "user" | "assistant";
  content: string;
}

export async function callClaude(
  systemPrompt: string,
  messages: ClaudeMessage[]
): Promise<Record<string, unknown>> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    system: systemPrompt,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    tools: [
      {
        name: actionToolSchema.name,
        description: actionToolSchema.description,
        input_schema: actionToolSchema.input_schema,
      },
    ],
    tool_choice: { type: "tool", name: "music_action" },
  });

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Claude did not return a structured action");
  }

  return toolUse.input as Record<string, unknown>;
}
