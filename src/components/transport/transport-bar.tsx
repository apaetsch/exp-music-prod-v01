"use client";

interface TransportBarProps {
  isPlaying: boolean;
  onPlayToggle: () => void;
  bpm: number;
  musicalKey: string;
}

export function TransportBar({
  isPlaying,
  onPlayToggle,
  bpm,
  musicalKey,
}: TransportBarProps) {
  return (
    <div className="h-12 bg-[var(--bg-secondary)] border-b border-[var(--border)] flex items-center px-4 gap-6">
      {/* Play/Stop */}
      <button
        onClick={onPlayToggle}
        className="w-8 h-8 rounded flex items-center justify-center bg-[var(--bg-tertiary)] border border-[var(--border)] hover:border-[var(--accent-dim)] transition-colors"
      >
        {isPlaying ? (
          <div className="w-3 h-3 bg-[var(--text-primary)] rounded-sm" />
        ) : (
          <div
            className="w-0 h-0 ml-0.5 border-l-[10px] border-l-[var(--text-primary)] border-y-[6px] border-y-transparent"
          />
        )}
      </button>

      {/* Session info */}
      <div className="flex gap-4 text-xs text-[var(--text-secondary)]">
        {bpm > 0 && (
          <span>
            <span className="text-[var(--text-primary)]">{bpm}</span> bpm
          </span>
        )}
        {musicalKey && (
          <span>
            <span className="text-[var(--text-primary)]">{musicalKey}</span>
          </span>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Title */}
      <span className="text-xs text-[var(--text-secondary)] opacity-40">
        exp music prod
      </span>
    </div>
  );
}
