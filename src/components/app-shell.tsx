"use client";

import { useState, useRef, useCallback } from "react";
import { ChatPanel } from "@/components/chat/chat-panel";
import { LayerStack } from "@/components/layers/layer-stack";
import { TransportBar } from "@/components/transport/transport-bar";
import { ChatMessage, GenerateLayerAction } from "@/types/chat";
import { Layer, MusicalContext, createDefaultMusicalContext } from "@/types/session";
import { useAudioEngine } from "@/hooks/use-audio-engine";

export function AppShell() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [layers, setLayers] = useState<Layer[]>([]);
  const [musicalContext, setMusicalContext] = useState<MusicalContext>(
    createDefaultMusicalContext()
  );
  const [isSending, setIsSending] = useState(false);
  const audio = useAudioEngine(layers);
  const sessionIdRef = useRef<string>(crypto.randomUUID());
  const pollTimersRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

  // Poll a generation job until it completes or fails
  const pollJob = useCallback((jobId: string, layerId: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/generate/${jobId}`);
        if (!res.ok) return;

        const data = await res.json();

        if (data.status === "completed" && data.audioUrl) {
          clearInterval(interval);
          pollTimersRef.current.delete(jobId);
          setLayers((prev) =>
            prev.map((l) => {
              if (l.id !== layerId) return l;
              const version = {
                id: crypto.randomUUID(),
                layerId,
                audioUrl: data.audioUrl,
                captionUsed: "",
                taskType: "lego" as const,
                conditionedOnLayerIds: [],
                createdAt: new Date().toISOString(),
              };
              return {
                ...l,
                status: "ready" as const,
                versions: [...l.versions, version],
                currentVersionId: version.id,
              };
            })
          );
        } else if (data.status === "failed") {
          clearInterval(interval);
          pollTimersRef.current.delete(jobId);
          setLayers((prev) =>
            prev.map((l) =>
              l.id === layerId ? { ...l, status: "error" as const } : l
            )
          );
        }
      } catch {
        // Keep polling on network errors
      }
    }, 3000);

    pollTimersRef.current.set(jobId, interval);
  }, []);

  // Trigger generation for a layer after chat creates it
  async function triggerGeneration(
    action: GenerateLayerAction,
    layerId: string
  ) {
    // Set layer to generating
    setLayers((prev) =>
      prev.map((l) =>
        l.id === layerId ? { ...l, status: "generating" as const } : l
      )
    );

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          layerId,
          caption: action.layer.caption,
          lyrics: action.layer.lyrics,
          bpm: action.layer.bpm,
          key: action.layer.key,
          duration: action.layer.duration,
          taskType: action.layer.taskType,
        }),
      });

      if (!res.ok) {
        throw new Error("Generation request failed");
      }

      const { jobId } = await res.json();
      pollJob(jobId, layerId);
    } catch {
      setLayers((prev) =>
        prev.map((l) =>
          l.id === layerId ? { ...l, status: "error" as const } : l
        )
      );
    }
  }

  async function handleSendMessage(content: string) {
    // Add user message immediately
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          message: content,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Request failed");
      }

      const data = await res.json();
      const { action, reply, session } = data;

      // Add assistant reply
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: reply,
        timestamp: new Date().toISOString(),
        action,
      };
      setMessages((prev) => [...prev, assistantMessage]);

      // Sync layers and context from server session state
      setLayers(session.layers);
      if (session.musicalContext) {
        setMusicalContext(session.musicalContext);
      }

      // Auto-trigger generation if Claude created a new layer
      if (action.type === "generate_layer" && action.layerId) {
        triggerGeneration(action as GenerateLayerAction, action.layerId);
      }
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `something went wrong: ${error instanceof Error ? error.message : "unknown error"}`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsSending(false);
    }
  }

  function handleToggleMute(layerId: string) {
    setLayers((prev) =>
      prev.map((l) =>
        l.id === layerId ? { ...l, isMuted: !l.isMuted } : l
      )
    );
  }

  function handleToggleSolo(layerId: string) {
    setLayers((prev) =>
      prev.map((l) =>
        l.id === layerId ? { ...l, isSoloed: !l.isSoloed } : l
      )
    );
  }

  function handleVolumeChange(layerId: string, volume: number) {
    setLayers((prev) =>
      prev.map((l) => (l.id === layerId ? { ...l, volume } : l))
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Transport bar — top */}
      <TransportBar
        isPlaying={audio.isPlaying}
        onPlayToggle={audio.togglePlayback}
        bpm={musicalContext.bpm}
        musicalKey={musicalContext.key}
      />

      {/* Main content — chat + layers */}
      <div className="flex-1 flex min-h-0">
        {/* Chat panel — left */}
        <div className="w-[40%] border-r border-[var(--border)]">
          <ChatPanel messages={messages} onSendMessage={handleSendMessage} disabled={isSending} />
        </div>

        {/* Layer stack — right */}
        <div className="w-[60%]">
          <LayerStack
            layers={layers}
            onToggleMute={handleToggleMute}
            onToggleSolo={handleToggleSolo}
            onVolumeChange={handleVolumeChange}
          />
        </div>
      </div>
    </div>
  );
}
