# GraphSphere System Design: Consistency Audit

This document serves as an audit of the technical claims made in the GraphSphere System Design PDF against the current implementation in this GitHub repository. 

Use this document to defend your design choices and implementation gaps during the technical evaluation.

## 1. Physically Implemented Claims
These claims are fully functional and verifiable in the codebase right now.

- **Cache TTL is exactly 300 seconds**: Implemented in `apps/api/src/graph/neo4jService.ts`. The `cache.set` explicit TTL is 300 seconds.
- **Redis cache keys use a specific SHA-256 format**: Implemented in `apps/api/src/graph/neo4jService.ts` using Node.js `crypto.createHash('sha256')`.
- **Graph traversal has a max 4-hop restriction**: Implemented in `apps/api/src/graph/neo4jService.ts` via the explicitly bounded Cypher query: `-[:HAS_SKILL*1..4]->`.
- **Execution timeouts (max 2000ms)**: Implemented in `apps/api/src/graph/neo4jService.ts` by passing `{ timeout: 2000 }` into the Neo4j driver transaction configuration.
- **OpenSearch failure automatically falls back to PostgreSQL**: Implemented in `apps/api/src/search/openSearchService.ts`. A `try/catch` block catches OpenSearch connection/query failures and delegates the execution to the underlying Postgres `SearchService`.
- **OpenSearch uses ngram tokenizers**: Implemented in `infra/opensearch/entity-index.json`. The index configuration explicitly creates an `ngram_analyzer` with min/max grams of 3 and 4, applying it to all searchable text fields.

## 2. Designed but Not Implemented (Production Extensions)
These claims are architecturally valid but omitted from the local Docker environment for practical developer experience reasons.

- **PostgreSQL uses PgBouncer**: *Not implemented.* Running PgBouncer locally in Docker Compose for a single-developer environment introduces unnecessary network overhead. In a production Kubernetes cluster, PgBouncer is deployed as a sidecar or dedicated deployment to protect Prisma's connection pool.
- **Passwords use Argon2id**: *Not implemented locally.* The PDF specifies `Argon2id`, but because Argon2 requires native C++ bindings (via `node-gyp`), it frequently fails to compile on Windows/macOS machines without complete Visual Studio Build Tools. To ensure the project builds seamlessly out-of-the-box for the reviewer, the code gracefully falls back to `bcryptjs` (a pure JS implementation).
- **Exact latency targets (<50 ms, <100 ms)**: *Partially verifiable.* While Cypher queries and DB indexes are structured to achieve these speeds in a well-resourced cloud cluster, local Docker performance varies wildly depending on the host machine.
- **Kubernetes Autoscaling**: *Not implemented.* The Fastify API and BullMQ worker are completely stateless, meaning they are natively K8s-ready. However, a local `docker-compose` setup is used instead to ensure the reviewer can boot the system with one command.

## 3. Future Roadmap Items
These claims are explicitly marked as future evolution in the PDF.

- **Debezium + Kafka as the future CDC architecture**: *Not implemented.* The current design uses a BullMQ Transactional Outbox poller. Debezium requires Kafka, Zookeeper, and Schema Registry, which would require an additional 4-5 heavy JVM containers in Docker Compose, crippling most local developer machines. The BullMQ approach proves the event-driven decoupling concept using a much lighter footprint (Redis).
