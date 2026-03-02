# exp music prod v01

Experimental music production tool that replaces the traditional DAW with a conversational interface. Describe what you want, hear it, refine with words, and stack layers that are musically coherent with each other.

## How it works

```
You: "dark minimal techno kick, 120bpm, lots of space"
  → Claude interprets → ACE-Step generates drums → plays in browser

You: "less hi-hat, more sub on the kick"
  → Claude refines caption → ACE-Step regenerates → new version plays

You: "add a deep sub bass"
  → Claude writes bass prompt conditioned on drums → bass fits the drums
  → Both layers play together. Solo/mute each.
```

## Roadmap

| Feature | V1 | Midterm | Vision |
|---------|:--:|:------:|:------:|
| **Generation** | | | |
| Text description → isolated layer (Lego mode) | x | x | x |
| Layer-by-layer building with conditioning (Complete mode) | x | x | x |
| Conversational refinement per layer | x | x | x |
| Hum/sing → melody reference (CREPE/basic-pitch) | | x | x |
| Upload audio → use as conditioning source | | x | x |
| Style transfer from reference tracks | | | x |
| Real-time generation (streaming audio as it generates) | | | x |
| **Playback & mixing** | | | |
| Stem playback controls (solo/mute/volume) | x | x | x |
| Synchronized multi-layer playback | x | x | x |
| Waveform display per layer | | x | x |
| Loop regions / arrangement timeline | | x | x |
| Per-layer EQ / effects (reverb, delay, compression) | | | x |
| Export / bounce to WAV/MP3 | | x | x |
| **Session & intelligence** | | | |
| Session brain maintaining musical context (key, bpm, mood) | x | x | x |
| Version history per layer | x | x | x |
| Claude picks lego vs complete mode automatically | x | x | x |
| Session persistence (localStorage) | | x | x |
| Cloud persistence (database) | | | x |
| Undo / redo across session | | | x |
| Claude suggests next steps ("try adding a pad here") | | x | x |
| **Input & interaction** | | | |
| Chat-based text input | x | x | x |
| Keyboard shortcuts (space = play/stop) | | x | x |
| Voice input (speech-to-text → chat) | | | x |
| Drag-and-drop audio import | | x | x |
| MIDI input for melody sketching | | | x |
| **Collaboration & sharing** | | | |
| Shareable session links | | | x |
| Real-time collaborative editing | | | x |
| Export project as stems | | x | x |
| Publish to streaming platforms | | | x |

## Architecture

```
Frontend (Next.js + React + Tailwind)
├── Chat panel ←→ POST /api/chat (Claude API)
├── Layer stack (solo/mute/volume per layer)
├── Transport bar (play/stop)
└── Web Audio API engine (synchronized multi-layer playback)

Backend (Next.js API routes)
├── POST /api/chat       → Claude → structured action (generate/refine layer)
├── POST /api/generate   → ACE-Step Gradio API → background generation
└── GET  /api/generate/[jobId] → poll job status

ACE-Step 1.5 (RunPod GPU server)
└── Gradio API on port 7860
    ├── text2music → generate from caption
    ├── lego       → isolated stem generation
    └── complete   → conditioned on existing layers
```

## Data model

```
Session → musicalContext (key, bpm, mood, genre) + layers[] + chatHistory[]
Layer   → name, instrumentType, status, versions[], isMuted, isSoloed, volume
Version → audioUrl, captionUsed, taskType (lego|complete), conditionedOnLayerIds
```

## Tech stack

- **Frontend:** Next.js 16 (App Router), React, Tailwind CSS
- **Audio:** Web Audio API (AudioContext + GainNode graph)
- **LLM:** Claude API (Anthropic SDK) with tool_use for structured output
- **Generation:** ACE-Step 1.5 via @gradio/client on RunPod
- **State:** In-memory session store

## Setup

```bash
# Prerequisites: Node.js 18+, Anthropic API key, RunPod account

# Install
npm install

# Configure
cp .env.example .env.local
# Set ANTHROPIC_API_KEY and ACESTEP_BASE_URL (RunPod pod URL, port 7860)

# Run
npm run dev
```

### RunPod setup

1. Create a pod using the `valyriantech/ace-step-1.5:latest` Docker template
2. Pick a GPU with 24GB+ VRAM (RTX 3090 at ~$0.46/hr works)
3. Once running, grab the port 7860 proxy URL from the Connect tab
4. The model needs initialization on first use (happens via the Gradio UI or API)

## Build phases

| Phase | Status | What |
|-------|--------|------|
| 1. Skeleton + static UI | Done | Next.js app, types, two-panel layout, chat, layer stack, transport |
| 2. Claude integration | Done | Session brain prompt, /api/chat, structured actions, frontend wiring |
| 3. ACE-Step generation | Done | Gradio client, /api/generate, job polling, audio download |
| 4. Audio playback | Done | useAudioEngine hook, synchronized playback, solo/mute/volume |
| 5. Complete mode | Pending | Multi-layer conditioning (new layers aware of existing ones) |
| 6. Refinement loop | Pending | Refine layer action, version history, audio buffer swapping |
| 7. Polish | Pending | Error handling, loading states, localStorage, keyboard shortcuts |

## Key files

| File | Purpose |
|------|---------|
| `src/components/app-shell.tsx` | Main orchestrator — wires chat, layers, audio, generation |
| `src/lib/claude-client.ts` | Claude API with tool_use |
| `src/prompts/session-brain.ts` | System prompt for how Claude reasons about layers |
| `src/lib/ace-step-client.ts` | ACE-Step Gradio API client (@gradio/client) |
| `src/hooks/use-audio-engine.ts` | Web Audio API multi-layer playback |
| `src/app/api/generate/route.ts` | Generation endpoint — submits to ACE-Step, saves audio |
| `src/app/api/chat/route.ts` | Chat endpoint — Claude interprets user intent |
| `src/types/session.ts` | Data model (Session, Layer, LayerVersion, MusicalContext) |

## Risks and notes

- **ACE-Step Complete mode quality** — conditioned generation may not cohere perfectly. Fallback: generate full mix then use Extract mode to isolate stems.
- **Prompt engineering** — translating natural language refinements into ACE-Step captions is where most iteration goes.
- **Layer count** — 6+ layers may sound muddy. May need periodic "bounce" (mix all → single conditioning input).
- **RunPod costs** — GPU pod runs at ~$0.46/hr. Stop the pod when not in use.
