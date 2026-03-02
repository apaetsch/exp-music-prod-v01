import { NextRequest, NextResponse } from "next/server";
import { callClaude } from "@/lib/claude-client";
import {
  getOrCreateSession,
  updateSession,
  getChatHistory,
  appendChatMessages,
} from "@/lib/session-store";
import { buildSystemPrompt } from "@/prompts/session-brain";
import { ChatMessage, ChatAction } from "@/types/chat";
import { Layer, MusicalContext } from "@/types/session";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
  try {
    const { sessionId, message } = await request.json();

    if (!sessionId || !message) {
      return NextResponse.json(
        { error: "sessionId and message are required" },
        { status: 400 }
      );
    }

    // Get or create session
    const session = getOrCreateSession(sessionId);
    const chatHistory = getChatHistory(sessionId);

    // Build system prompt with current session state
    const systemPrompt = buildSystemPrompt(session);

    // Build messages for Claude (only user/assistant content, not actions)
    const claudeMessages = chatHistory.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));
    claudeMessages.push({ role: "user", content: message });

    // Call Claude
    const result = await callClaude(systemPrompt, claudeMessages);
    const action = result as unknown as ChatAction;

    // Process the action and update session state
    let newLayerId: string | undefined;

    if (action.type === "generate_layer") {
      const newLayer: Layer = {
        id: uuidv4(),
        sessionId,
        name: action.layer.name,
        instrumentType: action.layer.instrumentType,
        status: "pending",
        currentVersionId: null,
        versions: [],
        promptHistory: [message],
        isMuted: false,
        isSoloed: false,
        volume: 0.8,
      };
      session.layers.push(newLayer);
      newLayerId = newLayer.id;

      // Update musical context
      if (action.musicalContext) {
        session.musicalContext = {
          ...session.musicalContext,
          ...stripUndefined(action.musicalContext),
        };
      }
    }

    if (action.type === "refine_layer") {
      const layer = session.layers.find((l) => l.id === action.layerId);
      if (layer) {
        layer.promptHistory.push(action.promptHistoryEntry);
        layer.status = "pending";
      }
    }

    if (action.type === "remove_layer") {
      session.layers = session.layers.filter((l) => l.id !== action.layerId);
    }

    if (action.type === "update_context" && action.musicalContext) {
      session.musicalContext = {
        ...session.musicalContext,
        ...stripUndefined(action.musicalContext),
      };
    }

    updateSession(session);

    // Save chat messages
    const userMsg: ChatMessage = {
      id: uuidv4(),
      role: "user",
      content: message,
      timestamp: new Date().toISOString(),
    };
    const assistantMsg: ChatMessage = {
      id: uuidv4(),
      role: "assistant",
      content: action.reply,
      timestamp: new Date().toISOString(),
      action,
    };
    appendChatMessages(sessionId, [userMsg, assistantMsg]);

    return NextResponse.json({
      action: {
        ...action,
        ...(newLayerId ? { layerId: newLayerId } : {}),
      },
      reply: action.reply,
      session,
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

function stripUndefined(
  obj: Record<string, unknown>
): Partial<MusicalContext> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null && value !== "") {
      result[key] = value;
    }
  }
  return result as Partial<MusicalContext>;
}
