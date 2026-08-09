import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
import { loadConfig } from "@graphsphere/api/dist/config.js";
import { createSeededStore } from "@graphsphere/api/dist/seed/demoData.js";
import { LocalObjectStorage, S3ObjectStorage } from "@graphsphere/api/dist/storage/objectStorage.js";
import { DocumentProcessor } from "@graphsphere/api/dist/worker/documentProcessor.js";
import { Queue, Worker, type Job } from "bullmq";
import { Redis } from "ioredis";

const config = loadConfig();
const store = await createSeededStore(config);

const objectStorage =
  config.OBJECT_STORAGE_ENDPOINT && config.OBJECT_STORAGE_ACCESS_KEY && config.OBJECT_STORAGE_SECRET_KEY
    ? new S3ObjectStorage(config)
    : new LocalObjectStorage();

const processor = new DocumentProcessor(store, objectStorage);

let stopping = false;

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    stopping = true;
  });
}

// BullMQ Setup (only active if Redis is configured)
let syncQueue: Queue | null = null;
let syncWorker: Worker | null = null;

if (config.REDIS_URL) {
  const connection = new Redis(config.REDIS_URL, { maxRetriesPerRequest: null });
  syncQueue = new Queue("graphsphere-sync", { connection });

  syncWorker = new Worker(
    "graphsphere-sync",
    async (job: Job) => {
      console.log(`Processing job ${job.id} of type ${job.name}`);
      // Simulated processing of syncing to Neo4j/OpenSearch
      // Real integration would call OpenSearchService or Neo4jGraphService here
      await new Promise((resolve) => setTimeout(resolve, 50));
    },
    { connection }
  );

  syncWorker.on("completed", (job) => {
    console.log(`Job ${job.id} completed!`);
  });

  syncWorker.on("failed", (job, err) => {
    console.error(`Job ${job?.id} failed:`, err);
  });
}

// Main Polling Loop
while (!stopping) {
  const result = await processor.processPending(25);
  if (result.processed || result.failed) {
    console.log(JSON.stringify({ service: "graphsphere-worker", type: "document-processing", ...result }));
  }

  // Enqueue un-synced domain outbox events if queue exists
  if (syncQueue) {
    const pendingEvents = await store.pendingEvents(50);
    for (const event of pendingEvents) {
      if (event.eventType !== "document.created") { // Document creation handled by DocumentProcessor
        await syncQueue.add(event.eventType, event);
        await store.markEventProcessing(event.id);
        await store.markEventCompleted(event.id);
      }
    }
  }

  await delay(5000);
}

if (syncWorker) await syncWorker.close();
if (syncQueue) await syncQueue.close();

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
