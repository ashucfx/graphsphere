import type { ObjectStorage } from "../storage/objectStorage.js";
import type { DomainStore, OutboxEvent } from "../domain/store.js";
import { workerEvents } from "../observability/metrics.js";

export class DocumentProcessor {
  public constructor(
    private readonly store: DomainStore,
    private readonly objectStorage: ObjectStorage
  ) {}

  public async processPending(limit = 25): Promise<{ processed: number; failed: number }> {
    let processed = 0;
    let failed = 0;
    for (const event of await this.store.pendingEvents(limit)) {
      const locked = await this.store.markEventProcessing(event.id);
      try {
        await this.processEvent(locked);
        await this.store.markEventCompleted(event.id);
        workerEvents.labels(event.eventType, "completed").inc();
        processed += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown processing error";
        await this.store.markEventFailed(event.id, message);
        workerEvents.labels(event.eventType, "failed").inc();
        failed += 1;
      }
    }
    return { processed, failed };
  }

  private async processEvent(event: OutboxEvent): Promise<void> {
    if (event.eventType !== "document.uploaded") {
      return;
    }
    const document = await this.store.getDocument(event.aggregateId);
    await this.store.updateDocumentProcessing(document.id, "PROCESSING");
    const content = await this.objectStorage.getText(document.storageKey);
    const normalized = content.replace(/\s+/g, " ").trim();
    await this.store.updateDocumentProcessing(document.id, "INDEXED", {
      textExcerpt: normalized.slice(0, 500),
      failureReason: null
    });
  }
}
