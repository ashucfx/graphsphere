import type { AppConfig } from "./config.js";
import type { AuthService } from "./auth/authService.js";
import type { CacheClient } from "./cache/cache.js";
import type { DomainStore } from "./domain/store.js";
import type { GraphService } from "./graph/graphService.js";
import type { Neo4jGraphService } from "./graph/neo4jService.js";
import type { SearchService } from "./search/searchService.js";
import type { OpenSearchService } from "./search/openSearchService.js";
import type { ObjectStorage } from "./storage/objectStorage.js";
import type { DocumentProcessor } from "./worker/documentProcessor.js";

export type AppContext = {
  config: AppConfig;
  store: DomainStore;
  authService: AuthService;
  searchService: SearchService | OpenSearchService;
  graphService: GraphService | Neo4jGraphService;
  cache: CacheClient;
  objectStorage: ObjectStorage;
  documentProcessor: DocumentProcessor;
};
