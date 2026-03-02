import { Session, createDefaultSession } from "@/types/session";
import { ChatMessage } from "@/types/chat";

// In-memory session store. Upgrade to DB later.
const sessions = new Map<string, Session>();
const chatHistories = new Map<string, ChatMessage[]>();

export function getSession(id: string): Session | undefined {
  return sessions.get(id);
}

export function getOrCreateSession(id: string): Session {
  let session = sessions.get(id);
  if (!session) {
    session = createDefaultSession(id);
    sessions.set(id, session);
  }
  return session;
}

export function updateSession(session: Session): void {
  sessions.set(session.id, session);
}

export function getChatHistory(sessionId: string): ChatMessage[] {
  return chatHistories.get(sessionId) ?? [];
}

export function appendChatMessages(
  sessionId: string,
  messages: ChatMessage[]
): void {
  const existing = chatHistories.get(sessionId) ?? [];
  chatHistories.set(sessionId, [...existing, ...messages]);
}
