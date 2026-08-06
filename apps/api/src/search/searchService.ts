import type {
  EntityType,
  Paginated,
  SearchQuery,
  SearchResult
} from "@graphsphere/shared";
import type { DomainStore, DomainSnapshot } from "../domain/store.js";

export class SearchService {
  public constructor(private readonly store: DomainStore) {}

  public async search(query: SearchQuery): Promise<Paginated<SearchResult>> {
    const snapshot = await this.store.snapshot();
    const candidates = buildCandidates(snapshot).filter((candidate) =>
      query.entityType ? candidate.entityType === query.entityType : true
    );
    const normalized = query.query.trim().toLowerCase();
    const scored = candidates
      .map((candidate) => ({
        ...candidate,
        score: scoreCandidate(candidate, normalized)
      }))
      .filter((candidate) => (normalized ? candidate.score > 0 : true));

    scored.sort((a, b) => {
      if (query.sort === "title") {
        return a.title.localeCompare(b.title);
      }
      if (query.sort === "updatedAt") {
        return b.updatedAt.localeCompare(a.updatedAt);
      }
      return b.score - a.score || b.updatedAt.localeCompare(a.updatedAt);
    });

    const start = (query.page - 1) * query.pageSize;
    return {
      items: scored.slice(start, start + query.pageSize),
      page: query.page,
      pageSize: query.pageSize,
      total: scored.length
    };
  }
}

function buildCandidates(snapshot: DomainSnapshot): SearchResult[] {
  return [
    ...snapshot.organizations.map((item) => result("organization", item.id, item.name, "Organization", item.description, item.updatedAt)),
    ...snapshot.departments.map((item) => result("department", item.id, item.name, "Department", item.description, item.updatedAt)),
    ...snapshot.teams.map((item) => result("team", item.id, item.name, "Team", item.description, item.updatedAt)),
    ...snapshot.skills.map((item) => result("skill", item.id, item.name, item.category, item.description, item.updatedAt)),
    ...snapshot.projects.map((item) => result("project", item.id, item.name, item.domain, item.description, item.updatedAt)),
    ...snapshot.employees.map((item) => result("employee", item.id, item.fullName, item.title, item.summary, item.updatedAt)),
    ...snapshot.documents.map((item) => result("document", item.id, item.title, item.status, item.textExcerpt, item.updatedAt))
  ];
}

function result(
  entityType: EntityType,
  id: string,
  title: string,
  subtitle: string,
  excerpt: string,
  updatedAt: string
): SearchResult {
  return {
    entityType,
    id,
    title,
    subtitle,
    excerpt,
    updatedAt,
    score: 0
  };
}

function scoreCandidate(candidate: SearchResult, query: string): number {
  if (!query) {
    return 1;
  }
  const title = candidate.title.toLowerCase();
  const subtitle = candidate.subtitle.toLowerCase();
  const excerpt = candidate.excerpt.toLowerCase();
  let score = 0;
  if (title === query) {
    score += 100;
  }
  if (title.includes(query)) {
    score += 40;
  }
  if (subtitle.includes(query)) {
    score += 20;
  }
  if (excerpt.includes(query)) {
    score += 10;
  }
  for (const token of query.split(/\s+/).filter(Boolean)) {
    if (title.includes(token)) {
      score += 8;
    }
    if (subtitle.includes(token)) {
      score += 4;
    }
    if (excerpt.includes(token)) {
      score += 2;
    }
  }
  return score;
}
