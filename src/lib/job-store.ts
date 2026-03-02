/**
 * In-memory store for tracking generation jobs.
 * Maps jobId → job metadata so the frontend can poll.
 */

export interface GenerationJob {
  jobId: string;
  aceStepTaskId: string;
  sessionId: string;
  layerId: string;
  taskType: "lego" | "complete";
  caption: string;
  status: "queued" | "processing" | "completed" | "failed";
  audioUrl?: string;
  error?: string;
  createdAt: string;
}

const jobs = new Map<string, GenerationJob>();

export function createJob(job: GenerationJob): void {
  jobs.set(job.jobId, job);
}

export function getJob(jobId: string): GenerationJob | undefined {
  return jobs.get(jobId);
}

export function updateJob(
  jobId: string,
  updates: Partial<GenerationJob>
): void {
  const job = jobs.get(jobId);
  if (job) {
    Object.assign(job, updates);
  }
}
