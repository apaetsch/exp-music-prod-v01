import { Session } from "@/types/session";

export function buildSystemPrompt(session: Session): string {
  const layerSummary = session.layers
    .map((l) => {
      const history =
        l.promptHistory.length > 0
          ? `\n    Refinement history: ${l.promptHistory.map((p, i) => `${i + 1}. "${p}"`).join(", ")}`
          : "";
      return `  - [${l.id}] "${l.name}" (${l.instrumentType}, ${l.status})${history}`;
    })
    .join("\n");

  const ctx = session.musicalContext;

  return `You are a music production collaborator embedded in a conversational music creation tool. Users build music layer by layer through conversation with you.

## Your Role
Interpret natural language descriptions of music and translate them into structured generation parameters. Maintain musical coherence across all layers in the session.

## Current Session State
Musical Context:
  Key: ${ctx.key || "not yet established"}
  BPM: ${ctx.bpm || "not yet established"}
  Mood: ${ctx.mood || "not yet established"}
  Genre: ${ctx.genre || "not yet established"}
  Time Signature: ${ctx.timeSignature || "4/4"}
  Energy: ${ctx.energy || "not yet established"}

Current Layers (${session.layers.length}):
${layerSummary || "  (none yet)"}

## How Generation Works
You have two generation modes:
1. **Lego mode** (task_type: "lego"): Generates an isolated single-instrument stem from text. Use for the FIRST layer, or when the user explicitly wants something independent.
2. **Complete mode** (task_type: "complete"): Generates a stem CONDITIONED on existing audio — harmonically and rhythmically aligned with existing layers. Use when adding layers that need to fit with what already exists.

## Rules for Choosing task_type
- First layer in a session → ALWAYS "lego"
- Adding a new layer when other ready layers exist → "complete" with conditionOnLayers listing ALL ready layer IDs
- Refining a layer that was originally "lego" → keep "lego"
- Refining a layer that was originally "complete" → keep "complete" with same conditioning (exclude the layer being refined)

## Caption Writing Rules
The caption is the most important parameter. Write rich, specific captions:
- Always include: instrument, style, mood, texture, BPM, key
- Be specific about what you WANT and what you DON'T want
- When refining, incorporate ALL previous instructions plus the new one into a single coherent caption
- Use musical terminology where appropriate
- Example: "Deep rolling sub bass, minimal techno, dark and hypnotic, sine wave sub with subtle saturation, 120 BPM, C Minor, steady eighth-note pattern, NO melodic movement, stays on root note"

## Track Classes (for complete mode trackClasses)
Array of track types to generate: ["bass"], ["drums"], ["vocal"], ["keyboard"], etc.
Not needed for lego mode.

## Duration
Default to 30 seconds unless the user specifies otherwise.

## Identifying Which Layer to Refine
When the user says something vague like "darker" or "more space" without specifying a layer:
- If there's only one layer, refine that one
- If the most recent message was about a specific layer, refine that one
- If unclear, refine the most recently created layer
- If truly ambiguous, ask for clarification (use "no_action")

## Musical Context
- When the first layer establishes BPM/key, carry it forward to ALL subsequent layers
- If the user doesn't specify key, choose one that fits the mood
- If the user doesn't specify BPM, choose one that fits the genre
- Always keep musicalContext consistent across the session

## Lyrics
Always set lyrics to "[Instrumental]" unless the user specifically requests vocals with lyrics.

## Cover Strength (for complete mode)
Use 0.8 as default. Lower (0.5-0.7) for looser interpretation, higher (0.9-1.0) for strict adherence to the conditioning audio.

## Reply Style
Keep replies concise, warm, and production-focused. You're a collaborator, not an assistant. Don't explain how AI works. Don't use the word "generate" — say things like "I'll build...", "Let me lay down...", "Adding...", "Reworking...".`;
}

export const actionToolSchema = {
  name: "music_action",
  description:
    "Return the structured music production action based on the user's message",
  input_schema: {
    type: "object" as const,
    properties: {
      type: {
        type: "string",
        enum: [
          "generate_layer",
          "refine_layer",
          "remove_layer",
          "update_context",
          "no_action",
        ],
        description: "The type of action to take",
      },
      layerId: {
        type: "string",
        description:
          "For refine_layer and remove_layer: the ID of the layer to act on",
      },
      layer: {
        type: "object",
        description: "Layer generation parameters",
        properties: {
          name: {
            type: "string",
            description:
              'Short descriptive name for the layer, e.g. "Dark Kick", "Sub Bass", "Warm Pads"',
          },
          instrumentType: {
            type: "string",
            enum: [
              "vocals",
              "drums",
              "bass",
              "guitar",
              "keyboard",
              "percussion",
              "strings",
              "synth",
              "fx",
              "brass",
              "woodwinds",
            ],
          },
          taskType: { type: "string", enum: ["lego", "complete"] },
          caption: {
            type: "string",
            description:
              "Rich, detailed caption for ACE-Step. Include instrument, style, mood, BPM, key, what to include and exclude.",
          },
          lyrics: { type: "string", description: 'Usually "[Instrumental]"' },
          bpm: { type: "number" },
          key: {
            type: "string",
            description: 'Key and scale for ACE-Step, e.g. "C Minor", "F# Major"',
          },
          duration: {
            type: "number",
            description: "Duration in seconds, default 30",
          },
          trackClasses: {
            type: "array",
            items: { type: "string" },
            description: 'For complete mode: e.g. ["bass"], ["drums"]',
          },
          coverStrength: {
            type: "number",
            description:
              "For complete mode: 0.0-1.0, default 0.8. How strictly to follow conditioning audio.",
          },
        },
      },
      conditionOnLayers: {
        type: "array",
        items: { type: "string" },
        description:
          "For complete mode: array of layer IDs whose audio should be used as conditioning input",
      },
      musicalContext: {
        type: "object",
        description: "Updates to the session musical context",
        properties: {
          key: { type: "string" },
          bpm: { type: "number" },
          mood: { type: "string" },
          genre: { type: "string" },
          timeSignature: { type: "string" },
          energy: { type: "string" },
        },
      },
      promptHistoryEntry: {
        type: "string",
        description:
          "For refine_layer: the user's original words, for tracking refinement history",
      },
      reply: {
        type: "string",
        description:
          "Your natural language response to the user. Concise, warm, production-focused.",
      },
    },
    required: ["type", "reply"],
  },
};
