"use client";

import { Layer } from "@/types/session";
import { LayerRow } from "./layer-row";

interface LayerStackProps {
  layers: Layer[];
  onToggleMute: (layerId: string) => void;
  onToggleSolo: (layerId: string) => void;
  onVolumeChange: (layerId: string, volume: number) => void;
}

export function LayerStack({
  layers,
  onToggleMute,
  onToggleSolo,
  onVolumeChange,
}: LayerStackProps) {
  return (
    <div className="h-full overflow-y-auto p-4">
      {layers.length === 0 && (
        <div className="text-[var(--text-secondary)] text-sm mt-8 text-center">
          <p>No layers yet.</p>
          <p className="text-xs opacity-60 mt-1">
            Describe a sound in the chat to create your first layer.
          </p>
        </div>
      )}
      <div className="space-y-2">
        {layers.map((layer) => (
          <LayerRow
            key={layer.id}
            layer={layer}
            onToggleMute={() => onToggleMute(layer.id)}
            onToggleSolo={() => onToggleSolo(layer.id)}
            onVolumeChange={(vol) => onVolumeChange(layer.id, vol)}
          />
        ))}
      </div>
    </div>
  );
}
