"use client";

import { Layer } from "@/types/session";

interface LayerRowProps {
  layer: Layer;
  onToggleMute: () => void;
  onToggleSolo: () => void;
  onVolumeChange: (volume: number) => void;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-[var(--text-secondary)]",
  generating: "bg-[var(--generating)]",
  ready: "bg-[var(--ready)]",
  error: "bg-[var(--error)]",
};

export function LayerRow({
  layer,
  onToggleMute,
  onToggleSolo,
  onVolumeChange,
}: LayerRowProps) {
  return (
    <div className="flex items-center gap-3 bg-[var(--bg-secondary)] border border-[var(--border)] rounded px-3 py-2">
      {/* Status indicator */}
      <div
        className={`w-2 h-2 rounded-full ${STATUS_COLORS[layer.status]} ${
          layer.status === "generating" ? "animate-pulse" : ""
        }`}
      />

      {/* Name + instrument */}
      <div className="min-w-[120px]">
        <div className="text-sm text-[var(--text-primary)]">{layer.name}</div>
        <div className="text-xs text-[var(--text-secondary)]">
          {layer.instrumentType}
        </div>
      </div>

      {/* Waveform placeholder */}
      <div className="flex-1 h-8 bg-[var(--bg-tertiary)] rounded border border-[var(--border)] flex items-center justify-center">
        {layer.status === "generating" && (
          <span className="text-xs text-[var(--generating)]">generating...</span>
        )}
        {layer.status === "ready" && (
          <div className="w-full h-full px-1 flex items-center">
            {/* Placeholder waveform bars */}
            <div className="flex items-center gap-[1px] w-full h-full">
              {Array.from({ length: 60 }).map((_, i) => (
                <div
                  key={i}
                  className="flex-1 bg-[var(--accent-dim)] rounded-sm"
                  style={{
                    height: `${20 + Math.random() * 60}%`,
                    opacity: layer.isMuted ? 0.2 : 0.6,
                  }}
                />
              ))}
            </div>
          </div>
        )}
        {layer.status === "error" && (
          <span className="text-xs text-[var(--error)]">error</span>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleSolo}
          className={`w-6 h-6 rounded text-xs font-medium ${
            layer.isSoloed
              ? "bg-[var(--accent)] text-[var(--bg-primary)]"
              : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          S
        </button>
        <button
          onClick={onToggleMute}
          className={`w-6 h-6 rounded text-xs font-medium ${
            layer.isMuted
              ? "bg-[var(--error)] text-[var(--bg-primary)]"
              : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          M
        </button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={layer.volume}
          onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
          className="w-16 accent-[var(--accent-dim)]"
        />
        {layer.versions.length > 1 && (
          <span className="text-xs text-[var(--text-secondary)]">
            v{layer.versions.length}
          </span>
        )}
      </div>
    </div>
  );
}
