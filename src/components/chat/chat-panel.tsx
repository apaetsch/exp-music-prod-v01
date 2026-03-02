"use client";

import { useRef, useEffect } from "react";
import { ChatMessage } from "@/types/chat";
import { ChatInput } from "./chat-input";

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (content: string) => void;
  disabled?: boolean;
}

export function ChatPanel({ messages, onSendMessage, disabled }: ChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="h-full flex flex-col">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-[var(--text-secondary)] text-sm mt-8 text-center">
            <p className="mb-2">Describe what you want to hear.</p>
            <p className="text-xs opacity-60">
              Try: &quot;dark minimal techno kick, 120bpm, lots of space&quot;
            </p>
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`text-sm ${
              msg.role === "user"
                ? "text-[var(--text-primary)]"
                : "text-[var(--accent)]"
            }`}
          >
            <span className="text-[var(--text-secondary)] text-xs mr-2">
              {msg.role === "user" ? "you" : "session"}
            </span>
            {msg.content}
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="border-t border-[var(--border)] p-3">
        <ChatInput onSend={onSendMessage} disabled={disabled} />
      </div>
    </div>
  );
}
