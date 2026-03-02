// ACE-Step 1.5 REST API types
// Docs: POST /release_task, GET /query_result?job_id=...

export interface AceStepLegoRequest {
  task_type: "lego";
  caption: string;
  lyrics: string;
  bpm: number;
  key: string;
  time_signature: string;
  duration: number;
}

export interface AceStepCompleteRequest {
  task_type: "complete";
  caption: string;
  lyrics: string;
  bpm: number;
  key: string;
  time_signature: string;
  duration: number;
  src_audio_path?: string;
  reference_audio_path?: string;
}

export type AceStepRequest = AceStepLegoRequest | AceStepCompleteRequest;

// All ACE-Step responses are wrapped in this envelope
export interface AceStepEnvelope<T> {
  data: T;
  code: number;
  error: string | null;
  timestamp: number;
  extra: unknown;
}

export interface AceStepReleaseData {
  task_id: string;
  status: string;
  queue_position: number;
}

// Raw result from query_result — result field is a JSON string
export interface AceStepRawResultItem {
  task_id: string;
  status: number;
  result: string; // JSON string: '[{"file":"...","wave":"...","status":2,...}]'
  [key: string]: unknown;
}

// Parsed inner result from the "result" JSON string
export interface AceStepResultItem {
  file: string;
  wave: string;
  status: number;
  error?: string;
  [key: string]: unknown;
}
