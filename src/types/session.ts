export interface MusicalContext {
  key: string;
  bpm: number;
  mood: string;
  genre: string;
  timeSignature: string;
  energy: string;
}

export type InstrumentType =
  | "vocals"
  | "drums"
  | "bass"
  | "guitar"
  | "keyboard"
  | "percussion"
  | "strings"
  | "synth"
  | "fx"
  | "brass"
  | "woodwinds";

export type LayerStatus = "pending" | "generating" | "ready" | "error";

export interface Layer {
  id: string;
  sessionId: string;
  name: string;
  instrumentType: InstrumentType;
  status: LayerStatus;
  currentVersionId: string | null;
  versions: LayerVersion[];
  promptHistory: string[];
  isMuted: boolean;
  isSoloed: boolean;
  volume: number;
}

export interface LayerVersion {
  id: string;
  layerId: string;
  audioUrl: string;
  captionUsed: string;
  taskType: "lego" | "complete";
  conditionedOnLayerIds: string[];
  createdAt: string;
}

export interface Session {
  id: string;
  createdAt: string;
  musicalContext: MusicalContext;
  layers: Layer[];
}

export function createDefaultMusicalContext(): MusicalContext {
  return {
    key: "",
    bpm: 0,
    mood: "",
    genre: "",
    timeSignature: "4/4",
    energy: "",
  };
}

export function createDefaultSession(id: string): Session {
  return {
    id,
    createdAt: new Date().toISOString(),
    musicalContext: createDefaultMusicalContext(),
    layers: [],
  };
}
