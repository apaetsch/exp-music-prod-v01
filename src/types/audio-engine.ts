export interface AudioEngineState {
  isPlaying: boolean;
  isLooping: boolean;
  masterVolume: number;
  currentTime: number;
  duration: number;
}

export interface AudioLayerNode {
  layerId: string;
  buffer: AudioBuffer | null;
  sourceNode: AudioBufferSourceNode | null;
  gainNode: GainNode;
  isMuted: boolean;
  isSoloed: boolean;
  volume: number;
}
