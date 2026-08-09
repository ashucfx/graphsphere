# Engineering Decisions

## Modular Monorepo

- Decision: Use `apps/web`, `apps/api`, `apps/worker`, and `packages/shared`.
- Reason: The platform needs clear boundaries without the operational load of many services.
- Alternatives considered: single full-stack app, independent repositories, microservices.
- Trade-off: A monorepo needs discipline around package boundaries.
- Future scaling: API and worker can split when team ownership or deployment needs require it.

## PostgreSQL as System of Record

- Decision: Store authoritative business state in PostgreSQL.
- Reason: Core entities and assignments require transactions, constraints, indexes, and migrations.
- Alternatives considered: graph-first storage, search-first storage, document database.
- Trade-off: Multi-hop relationship queries are not PostgreSQL's strongest use case.
- Future scaling: Add read replicas, pooling, partitioning, and operational migration gates.

## Neo4j as Graph Projection

- Decision: Use Neo4j for relationship traversal only.
- Reason: Collaboration, skill, and project paths are graph-shaped.
- Alternatives considered: recursive SQL, application traversal, search-only approximation.
- Trade-off: Projection lag must be handled.
- Future scaling: Profile hot queries, add graph indexes, and shard by organization if justified.

## OpenSearch for Retrieval

- Decision: Use OpenSearch for entity and document search.
- Reason: The platform needs relevance, filtering, pagination, sorting, and document text retrieval.
- Alternatives considered: SQL pattern matching, PostgreSQL full-text only, hosted search.
- Trade-off: Search index maintenance adds operational work.
- Future scaling: Use aliases, bulk reindexing, shard planning, and relevance tuning.

## Narrow Redis Usage

- Decision: Cache only expensive graph query results and stable lookup metadata.
- Reason: Broad caching would create avoidable stale-data risk.
- Alternatives considered: no cache, cache all reads.
- Trade-off: Limited cache scope means fewer endpoints benefit.
- Future scaling: Add distributed cache metrics and tune TTLs by measured workload.

## Outbox Processing

- Decision: Commit domain changes and outbox events together, then project asynchronously.
- Reason: Derived stores can fail independently.
- Alternatives considered: synchronous projection in API requests, best-effort writes, scheduled rebuild only.
- Trade-off: Clients may see projection lag.
- Future scaling: Publish outbox events to a dedicated broker.

## Focused Graph APIs

- Decision: Implement validated query endpoints instead of raw graph query execution.
- Reason: Focused endpoints are easier to secure, test, tune, and explain.
- Alternatives considered: raw Cypher endpoint, visual arbitrary query builder.
- Trade-off: Fewer query shapes initially.
- Future scaling: Add a typed query DSL after common patterns are known.
