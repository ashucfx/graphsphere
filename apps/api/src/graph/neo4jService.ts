import neo4j, { type Driver, type Session } from "neo4j-driver";
import type { ExpertGraphQuery, ExpertGraphResult, RelationshipSummary, EntityType } from "@graphsphere/shared";
import type { CacheClient } from "../cache/cache.js";
import { notFound } from "../errors.js";
import { graphOperations } from "../observability/metrics.js";
import { createHash } from "node:crypto";

export class Neo4jGraphService {
  private readonly driver: Driver;

  public constructor(
    uri: string,
    user?: string,
    password?: string,
    private readonly cache?: CacheClient
  ) {
    this.driver = neo4j.driver(uri, user && password ? neo4j.auth.basic(user, password) : undefined);
  }

  public async close(): Promise<void> {
    await this.driver.close();
  }

  public async findExperts(query: ExpertGraphQuery): Promise<ExpertGraphResult[]> {
    const hash = createHash('sha256').update(JSON.stringify(query)).digest('hex');
    const key = `cache:graph:expert:${hash}`;
    if (this.cache) {
      const cached = await this.cache.get<ExpertGraphResult[]>(key);
      if (cached) return cached;
    }

    const session = this.driver.session();
    try {
      const result = await session.readTransaction((tx) => {
        return tx.run(
          `
          MATCH (e:Employee)-[:WORKED_ON]->(p:Project)
          MATCH (p)<-[:WORKED_ON]-(collaborator:Employee)-[:HAS_SKILL*1..4]->(s:Skill)
          WHERE toLower(e.title) CONTAINS toLower($role)
            AND toLower(p.domain) CONTAINS toLower($projectDomain)
            AND toLower(s.name) CONTAINS toLower($collaboratorSkill)
            AND ($organizationId IS NULL OR e.organizationId = $organizationId)
            AND e.id <> collaborator.id
          RETURN e, p, collaborator, s
          LIMIT 50
          `,
          {
            role: query.role,
            projectDomain: query.projectDomain,
            collaboratorSkill: query.collaboratorSkill,
            organizationId: query.organizationId ?? null
          }
        );
      }, { timeout: 2000 });

      const experts: ExpertGraphResult[] = result.records.map((record) => {
        const e = record.get("e").properties;
        const p = record.get("p").properties;
        const c = record.get("collaborator").properties;
        const s = record.get("s").properties;

        return {
          employee: {
            id: e.id,
            organizationId: e.organizationId,
            departmentId: e.departmentId,
            teamId: e.teamId,
            fullName: e.fullName,
            title: e.title,
            location: e.location,
            summary: e.summary,
            createdAt: e.createdAt,
            updatedAt: e.updatedAt
          },
          project: {
            id: p.id,
            organizationId: p.organizationId,
            name: p.name,
            domain: p.domain,
            description: p.description,
            status: p.status,
            startedAt: p.startedAt,
            endedAt: p.endedAt,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt
          },
          collaborator: {
            id: c.id,
            organizationId: c.organizationId,
            departmentId: c.departmentId,
            teamId: c.teamId,
            fullName: c.fullName,
            title: c.title,
            location: c.location,
            summary: c.summary,
            createdAt: c.createdAt,
            updatedAt: c.updatedAt
          },
          collaboratorSkill: {
            id: s.id,
            organizationId: s.organizationId,
            name: s.name,
            category: s.category,
            description: s.description,
            createdAt: s.createdAt,
            updatedAt: s.updatedAt
          },
          path: [
            { entityType: "employee", id: e.id, label: e.fullName, relationship: null },
            { entityType: "project", id: p.id, label: p.name, relationship: "WORKED_ON" },
            { entityType: "employee", id: c.id, label: c.fullName, relationship: "WORKED_WITH" },
            { entityType: "skill", id: s.id, label: s.name, relationship: "HAS_SKILL" }
          ]
        };
      });

      graphOperations.labels("findExperts", "ok").inc();
      if (this.cache) {
        await this.cache.set(key, experts, 300);
      }
      return experts;
    } catch (error) {
      graphOperations.labels("findExperts", "error").inc();
      throw error;
    } finally {
      await session.close();
    }
  }

  public async relationships(entityType: EntityType, id: string): Promise<RelationshipSummary> {
    const session = this.driver.session();
    try {
      const nodeLabel = capitalize(entityType);
      const result = await session.readTransaction((tx) => {
        return tx.run(
          `
          MATCH (source:${nodeLabel} {id: $id})
          OPTIONAL MATCH (source)-[r]-(target)
          RETURN source, type(r) as relationship, target, labels(target) as targetLabels
          LIMIT 100
          `,
          { id }
        );
      });

      const sourceNode = result.records[0]?.get("source");
      if (!sourceNode) {
        throw notFound("Graph entity");
      }

      const sourceProps = sourceNode.properties;
      const source = {
        entityType,
        id: sourceProps.id,
        label: sourceProps.name || sourceProps.fullName || sourceProps.title || "Unknown",
        relationship: null
      };

      const targets = result.records
        .filter((record) => record.get("target") !== null)
        .map((record) => {
          const targetProps = record.get("target").properties;
          const targetLabels = record.get("targetLabels") as string[];
          const type = (targetLabels[0] || "").toLowerCase() as EntityType;
          return {
            entityType: type,
            id: targetProps.id,
            label: targetProps.name || targetProps.fullName || targetProps.title || "Unknown",
            relationship: record.get("relationship")
          };
        });

      graphOperations.labels("relationships", "ok").inc();
      return { source, targets };
    } catch (error) {
      if (error instanceof Error && error.message.includes("Graph entity")) {
        throw error;
      }
      graphOperations.labels("relationships", "error").inc();
      throw error;
    } finally {
      await session.close();
    }
  }
}

function capitalize(s: string): string {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}
