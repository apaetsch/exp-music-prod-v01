import { NextRequest, NextResponse } from "next/server";
import { generateAudio, downloadAudio } from "@/lib/ace-step-client";
import { createJob, updateJob } from "@/lib/job-store";
import { getSession, updateSession } from "@/lib/session-store";
import { AceStepLegoRequest } from "@/types/ace-step";
import { LayerVersion } from "@/types/session";
import { v4 as uuidv4 } from "uuid";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export async function POST(request: NextRequest) {
  try {
    const { sessionId, layerId, caption, lyrics, bpm, key, duration, taskType } =
      await request.json();

    if (!sessionId || !layerId) {
      return NextResponse.json(
        { error: "sessionId and layerId are required" },
        { status: 400 }
      );
    }

    // Update layer status to generating
    const session = getSession(sessionId);
    if (session) {
      const layer = session.layers.find((l) => l.id === layerId);
      if (layer) {
        layer.status = "generating";
        updateSession(session);
      }
    }

    // Build ACE-Step request
    const aceRequest: AceStepLegoRequest = {
      task_type: "lego",
      caption: caption || "",
      lyrics: lyrics || "[Instrumental]",
      bpm: bpm || 120,
      key: key || "C major",
      time_signature: "4/4",
      duration: duration || 30,
    };

    // Create a job to track this generation
    const jobId = uuidv4();
    createJob({
      jobId,
      aceStepTaskId: "", // No separate task ID with Gradio
      sessionId,
      layerId,
      taskType: taskType || "lego",
      caption: aceRequest.caption,
      status: "processing",
      createdAt: new Date().toISOString(),
    });

    // Fire off generation in background (don't await — let frontend poll)
    runGeneration(jobId, aceRequest, sessionId, layerId).catch((err) => {
      console.error("[Generate] Background generation failed:", err);
    });

    return NextResponse.json({ jobId, status: "processing" });
  } catch (error) {
    console.error("Generate API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * Run the actual generation in the background.
 * Calls the Gradio API (synchronous/blocking), then saves the audio file.
 */
async function runGeneration(
  jobId: string,
  aceRequest: AceStepLegoRequest,
  sessionId: string,
  layerId: string
) {
  try {
    // Call Gradio — this blocks until generation is complete
    const result = await generateAudio(aceRequest);

    // Download the audio from the Gradio file URL
    const audioBuffer = await downloadAudio(result.audioUrl);

    // Save locally
    const audioDir = join(process.cwd(), "public", "audio");
    await mkdir(audioDir, { recursive: true });

    const filename = `${layerId}-${Date.now()}.wav`;
    const filepath = join(audioDir, filename);
    await writeFile(filepath, audioBuffer);

    const audioUrl = `/audio/${filename}`;

    // Update job
    updateJob(jobId, { status: "completed", audioUrl });

    // Update layer in session
    const session = getSession(sessionId);
    if (session) {
      const layer = session.layers.find((l) => l.id === layerId);
      if (layer) {
        const version: LayerVersion = {
          id: uuidv4(),
          layerId: layer.id,
          audioUrl,
          captionUsed: aceRequest.caption,
          taskType: aceRequest.task_type,
          conditionedOnLayerIds: [],
          createdAt: new Date().toISOString(),
        };
        layer.versions.push(version);
        layer.currentVersionId = version.id;
        layer.status = "ready";
        updateSession(session);
      }
    }

    console.log(`[Generate] Job ${jobId} completed: ${audioUrl}`);
  } catch (error) {
    console.error(`[Generate] Job ${jobId} failed:`, error);
    updateJob(jobId, {
      status: "failed",
      error: error instanceof Error ? error.message : "Generation failed",
    });

    // Mark layer as error
    const session = getSession(sessionId);
    if (session) {
      const layer = session.layers.find((l) => l.id === layerId);
      if (layer) {
        layer.status = "error";
        updateSession(session);
      }
    }
  }
}
