import { AceStepRequest } from "@/types/ace-step";
import { Client } from "@gradio/client";

const GRADIO_URL = process.env.ACESTEP_BASE_URL || "http://localhost:7860";

// Reuse a single Gradio client instance
let gradioClient: Awaited<ReturnType<typeof Client.connect>> | null = null;

async function getClient() {
  if (!gradioClient) {
    gradioClient = await Client.connect(GRADIO_URL);
  }
  return gradioClient;
}

export interface GradioGenerationResult {
  audioUrl: string;
}

/**
 * Generate audio via the Gradio /generation_wrapper endpoint.
 * Uses the official @gradio/client to handle parameter serialization.
 *
 * This blocks until generation completes (typically 10-60s).
 */
export async function generateAudio(
  request: AceStepRequest
): Promise<GradioGenerationResult> {
  const client = await getClient();

  console.log("[ACE-Step] Starting generation with caption:", request.caption);

  const result = await client.predict("/generation_wrapper", {
    param_0: request.caption,                     // Music Caption
    param_1: request.lyrics || "[Instrumental]",   // Lyrics
    param_2: request.bpm || 120,                   // BPM
    param_3: request.key || "C major",             // KeyScale
    param_4: request.time_signature || "4/4",      // Time Signature
    param_5: "unknown",                            // Vocal Language
    param_6: 8,                                    // DiT Inference Steps (max 20)
    param_7: 7.0,                                  // DiT Guidance Scale
    param_8: true,                                 // Random Seed
    param_9: "-1",                                 // Seed
    param_10: null,                                // Reference Audio
    param_11: request.duration || 30,              // Audio Duration
    param_12: 1,                                   // Batch Size
    param_13: null,                                // Source Audio
    param_14: "",                                  // LM Codes Hints
    param_15: 0.0,                                 // Repainting Start
    param_16: -1,                                  // Repainting End
    param_17: "Fill the audio semantic mask based on the given conditions:",
    param_18: 1.0,                                 // LM Codes Strength
    param_19: "text2music",                        // Task Type
    param_20: false,                               // Use ADG
    param_21: 0.0,                                 // CFG Interval Start
    param_22: 1.0,                                 // CFG Interval End
    param_23: 3.0,                                 // Shift
    param_24: "ode",                               // Inference Method
    param_25: "",                                  // Custom Timesteps
    param_26: "mp3",                               // Audio Format
    param_27: 0.85,                                // LM Temperature
    param_28: false,                               // Think
    param_29: 2.0,                                 // LM CFG Scale
    param_30: 0,                                   // LM Top-K
    param_31: 0.9,                                 // LM Top-P
    param_32: "NO USER INPUT",                     // LM Negative Prompt
    param_33: true,                                // CoT Metas
    param_34: true,                                // CaptionRewrite
    param_35: true,                                // CoT Language
    param_37: false,                               // Constrained Decoding Debug
    param_38: true,                                // ParallelThinking
    param_39: false,                               // Auto Score
    param_40: false,                               // Auto LRC
    param_41: 0.5,                                 // Quality Score Sensitivity
    param_42: 8,                                   // LM Batch Chunk Size
    param_43: null,                                // Track Name
    param_44: [],                                  // Track Names
    param_45: false,                               // AutoGen
  });

  console.log("[ACE-Step] Generation complete");

  // Result is an array/tuple. Index 8 has the file list, index 10 has status.
  const data = result.data as unknown[];

  // Find the audio file — it's in index 8 as a list of file paths
  const filesResult = data[8];
  if (Array.isArray(filesResult) && filesResult.length > 0) {
    const filePath = filesResult[0];
    // Could be a string path or an object with url/path
    if (typeof filePath === "string") {
      return { audioUrl: filePath };
    }
    if (filePath && typeof filePath === "object") {
      const fileObj = filePath as { url?: string; path?: string };
      if (fileObj.url) {
        return { audioUrl: fileObj.url };
      }
      if (fileObj.path) {
        return { audioUrl: `${GRADIO_URL}/gradio_api/file=${fileObj.path}` };
      }
    }
  }

  // Check status message for debugging
  const status = data[10];
  console.error("[ACE-Step] No audio in result. Status:", status);
  console.error("[ACE-Step] Result[8]:", JSON.stringify(filesResult));

  throw new Error("ACE-Step generation produced no audio file");
}

/**
 * Download audio from a URL (Gradio file URL or local path).
 */
export async function downloadAudio(audioUrl: string): Promise<Buffer> {
  const res = await fetch(audioUrl);

  if (!res.ok) {
    throw new Error(`ACE-Step audio download failed (${res.status})`);
  }

  return Buffer.from(await res.arrayBuffer());
}
