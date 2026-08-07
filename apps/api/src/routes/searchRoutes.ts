import type { FastifyInstance } from "fastify";
import { searchQuerySchema } from "@graphsphere/shared";
import type { AppContext } from "../context.js";
import { parseQuery } from "../http.js";

export async function registerSearchRoutes(app: FastifyInstance, context: AppContext): Promise<void> {
  app.get("/search", { preHandler: app.authenticate }, async (request) => {
    const query = parseQuery(searchQuerySchema, request);
    return context.searchService.search(query);
  });
}
