import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import Fastify from "fastify";
import { randomUUID } from "node:crypto";
import { AuthService } from "./auth/authService.js";
import { registerAuth } from "./auth/fastifyAuth.js";
import { MemoryCache } from "./cache/cache.js";
import { RedisCache } from "./cache/redisCache.js";
import type { AppConfig } from "./config.js";
import { registerErrorHandler } from "./http.js";
import { DomainStore } from "./domain/store.js";
import { GraphService } from "./graph/graphService.js";
import { Neo4jGraphService } from "./graph/neo4jService.js";
import { registerMetrics } from "./observability/metrics.js";
import { registerAuthRoutes } from "./routes/authRoutes.js";
import { registerGraphRoutes } from "./routes/graphRoutes.js";
import { registerHealthRoutes } from "./routes/healthRoutes.js";
import { registerResourceRoutes } from "./routes/resourceRoutes.js";
import { registerSearchRoutes } from "./routes/searchRoutes.js";
import { createSeededStore } from "./seed/demoData.js";
import { SearchService } from "./search/searchService.js";
import { OpenSearchService } from "./search/openSearchService.js";
import { LocalObjectStorage, S3ObjectStorage, type ObjectStorage } from "./storage/objectStorage.js";
import { DocumentProcessor } from "./worker/documentProcessor.js";
import type { AppContext } from "./context.js";

export type CreateAppOptions = {
  config: AppConfig;
  store?: DomainStore;
  objectStorage?: ObjectStorage;
};

export async function createApp(options: CreateAppOptions) {
  const app = Fastify({
    logger: {
      level: options.config.LOG_LEVEL,
      redact: ["req.headers.authorization", "password", "token"]
    },
    genReqId: (request) => request.headers["x-request-id"]?.toString() ?? randomUUID()
  });

  await app.register(cors, {
    origin: options.config.CORS_ORIGIN,
    credentials: false
  });
  await app.register(helmet);
  await app.register(rateLimit, {
    max: options.config.RATE_LIMIT_MAX,
    timeWindow: options.config.RATE_LIMIT_WINDOW
  });

  const store = options.store ?? (await createSeededStore(options.config));
  const objectStorage = options.objectStorage ?? (
    options.config.OBJECT_STORAGE_ENDPOINT && options.config.OBJECT_STORAGE_ACCESS_KEY && options.config.OBJECT_STORAGE_SECRET_KEY
      ? new S3ObjectStorage(options.config)
      : new LocalObjectStorage()
  );
  const cache = options.config.REDIS_URL ? new RedisCache(options.config.REDIS_URL) : new MemoryCache();
  const authService = new AuthService(store, options.config);
  
  const searchService = options.config.OPENSEARCH_URL 
    ? new OpenSearchService(options.config.OPENSEARCH_URL)
    : new SearchService(store);
    
  const graphService = options.config.NEO4J_URI 
    ? new Neo4jGraphService(
        options.config.NEO4J_URI, 
        options.config.NEO4J_USER, 
        options.config.NEO4J_PASSWORD, 
        cache
      )
    : new GraphService(store, cache);
    
  const documentProcessor = new DocumentProcessor(store, objectStorage);

  const context: AppContext = {
    config: options.config,
    store,
    authService,
    searchService,
    graphService,
    cache,
    objectStorage,
    documentProcessor
  };

  app.decorate("context", context);

  registerAuth(app, authService);
  registerErrorHandler(app);
  registerMetrics(app);

  await registerHealthRoutes(app, context);
  await registerAuthRoutes(app, context);
  await registerResourceRoutes(app, context);
  await registerSearchRoutes(app, context);
  await registerGraphRoutes(app, context);

  return app;
}
