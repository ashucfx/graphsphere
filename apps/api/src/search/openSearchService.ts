import { Client } from "@opensearch-project/opensearch";
import type { Paginated, SearchQuery, SearchResult } from "@graphsphere/shared";
import { searchOperations } from "../observability/metrics.js";
import type { SearchService } from "./searchService.js";

export class OpenSearchService {
  private readonly client: Client;
  private readonly indexName = "graphsphere_entities";

  public constructor(node: string, private readonly fallbackService: SearchService) {
    this.client = new Client({ node });
  }

  public async search(query: SearchQuery): Promise<Paginated<SearchResult>> {
    const from = (query.page - 1) * query.pageSize;
    const size = query.pageSize;

    const boolQuery: any = {
      must: []
    };

    if (query.query && query.query.trim().length > 0) {
      boolQuery.must.push({
        multi_match: {
          query: query.query,
          fields: ["title^3", "subtitle^2", "excerpt"],
          fuzziness: "AUTO"
        }
      });
    } else {
      boolQuery.must.push({ match_all: {} });
    }

    if (query.entityType) {
      boolQuery.filter = [{ term: { entityType: query.entityType } }];
    }

    let sort: any = [{ _score: "desc" }, { updatedAt: "desc" }];
    if (query.sort === "title") {
      sort = [{ "title.keyword": "asc" }];
    } else if (query.sort === "updatedAt") {
      sort = [{ updatedAt: "desc" }];
    }

    try {
      const response = await this.client.search({
        index: this.indexName,
        body: {
          from,
          size,
          query: { bool: boolQuery },
          sort
        }
      });

      const hits = response.body.hits?.hits || [];
      const totalObj = response.body.hits?.total;
      const total = typeof totalObj === 'number' ? totalObj : (totalObj?.value || 0);

      const items: SearchResult[] = hits.map((hit: any) => {
        const source = hit._source;
        return {
          entityType: source.entityType,
          id: source.id,
          title: source.title,
          subtitle: source.subtitle,
          excerpt: source.excerpt,
          updatedAt: source.updatedAt,
          score: hit._score || 0
        };
      });

      searchOperations.labels("search", "ok").inc();
      return {
        items,
        page: query.page,
        pageSize: query.pageSize,
        total
      };
    } catch (error) {
      searchOperations.labels("search", "error").inc();
      console.warn("OpenSearch failed, falling back to PostgreSQL tsvector", error);
      return this.fallbackService.search(query);
    }
  }
}
