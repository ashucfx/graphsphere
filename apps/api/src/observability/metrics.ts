import type { FastifyInstance } from "fastify";
import client from "prom-client";

const register = new client.Registry();
client.collectDefaultMetrics({ register });

export const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request latency by route and status",
  labelNames: ["method", "route", "statusCode"],
  buckets: [0.005, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5]
});

export const cacheOperations = new client.Counter({
  name: "cache_operations_total",
  help: "Cache operations by result",
  labelNames: ["operation", "result"]
});

export const workerEvents = new client.Counter({
  name: "worker_events_total",
  help: "Worker event processing outcomes",
  labelNames: ["eventType", "status"]
});

export const graphOperations = new client.Counter({
  name: "graph_operations_total",
  help: "Neo4j graph operations by result",
  labelNames: ["operation", "result"]
});

export const searchOperations = new client.Counter({
  name: "search_operations_total",
  help: "OpenSearch operations by result",
  labelNames: ["operation", "result"]
});

register.registerMetric(httpRequestDuration);
register.registerMetric(cacheOperations);
register.registerMetric(workerEvents);
register.registerMetric(graphOperations);
register.registerMetric(searchOperations);

export function registerMetrics(app: FastifyInstance): void {
  app.addHook("onRequest", async (request) => {
    request.startTime = process.hrtime.bigint();
  });

  app.addHook("onResponse", async (request, reply) => {
    const start = request.startTime;
    if (!start) {
      return;
    }
    const seconds = Number(process.hrtime.bigint() - start) / 1_000_000_000;
    httpRequestDuration
      .labels(request.method, request.routeOptions.url ?? "unknown", String(reply.statusCode))
      .observe(seconds);
  });

  app.get("/metrics", async (_request, reply) => {
    reply.header("content-type", register.contentType);
    return register.metrics();
  });
}

declare module "fastify" {
  interface FastifyRequest {
    startTime?: bigint;
  }
}
