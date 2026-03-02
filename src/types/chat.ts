import { InstrumentType } from "./session";

export type MessageRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  action?: ChatAction;
}

// Structured actions Claude returns alongside natural language
export type ChatAction =
  | GenerateLayerAction
  | RefineLayerAction
  | RemoveLayerAction
  | UpdateContextAction
  | NoAction;

export interface GenerateLayerAction {
  type: "generate_layer";
  layerId?: string; // set server-side
  layer: {
    name: string;
    instrumentType: InstrumentType;
    taskType: "lego" | "complete";
    caption: string;
    lyrics: string;
    bpm: number;
    key: string;
    duration: number;
    trackClasses?: string[];
    coverStrength?: number;
  };
  conditionOnLayers?: string[];
  musicalContext: {
    key?: string;
    bpm?: number;
    mood?: string;
    genre?: string;
    timeSignature?: string;
    energy?: string;
  };
  reply: string;
}

export interface RefineLayerAction {
  type: "refine_layer";
  layerId: string;
  layer: {
    caption: string;
    lyrics: string;
    taskType: "lego" | "complete";
    trackClasses?: string[];
    coverStrength?: number;
  };
  conditionOnLayers?: string[];
  promptHistoryEntry: string;
  reply: string;
}

export interface RemoveLayerAction {
  type: "remove_layer";
  layerId: string;
  reply: string;
}

export interface UpdateContextAction {
  type: "update_context";
  musicalContext: {
    key?: string;
    bpm?: number;
    mood?: string;
    genre?: string;
    timeSignature?: string;
    energy?: string;
  };
  reply: string;
}

export interface NoAction {
  type: "no_action";
  reply: string;
}
