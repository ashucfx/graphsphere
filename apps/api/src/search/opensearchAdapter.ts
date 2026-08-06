import { Client } from "@opensearch-project/opensearch";
import type { SearchQuery, SearchResult, Paginated } from "@graphsphere/shared";

export class OpenSearchAdapter {
  private readonly client: Client;
  private readonly indexName = "graphsphere-entities";

  public constructor(url: string) {
    this.client = new Client({ node: url });
  }

  public async search(query: SearchQuery): Promise<Paginated<SearchResult>> {
    const from = (query.page - 1) * query.pageSize;
    const filters = query.entityType ? [{ term: { entityType: query.entityType } }] : [];
    const response = await this.client.search({
      index: this.indexName,
      from,
      size: query.pageSize,
      body: {
        query: {
          bool: {
            must: query.query
              ? [
                  {
                    multi_match: {
                      query: query.query,
                      fields: ["title^4", "subtitle^2", "body", "tags"]
                    }
                  }
                ]
              : [{ match_all: {} }],
            filter: filters
          }
        }
      }
    });

    const hits = response.body.hits.hits as any[];
    return {
      items: hits.map((hit) => ({
        id: String(hit._source?.id),
        entityType: String(hit._source?.entityType) as SearchResult["entityType"],
        title: String(hit._source?.title ?? ""),
        subtitle: String(hit._source?.subtitle ?? ""),
        excerpt: String(hit._source?.body ?? "").slice(0, 280),
        updatedAt: String(hit._source?.updatedAt ?? new Date().toISOString()),
        score: hit._score ?? 0
      })),
      page: query.page,
      pageSize: query.pageSize,
      total: response.body.hits.total ? (typeof response.body.hits.total === "number" ? response.body.hits.total : response.body.hits.total.value) : 0
    };
  }
}
