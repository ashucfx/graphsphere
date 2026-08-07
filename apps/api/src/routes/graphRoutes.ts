import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { entityTypeSchema, expertGraphQuerySchema, uuidSchema } from "@graphsphere/shared";
import type { AppContext } from "../context.js";
import { parseParams, parseQuery } from "../http.js";

const graphEntityParamsSchema = z.object({
  entityType: entityTypeSchema,
  id: uuidSchema
});

export async function registerGraphRoutes(app: FastifyInstance, context: AppContext): Promise<void> {
  app.get("/graph/query/experts", { preHandler: app.authenticate }, async (request) => {
    const query = parseQuery(expertGraphQuerySchema, request);
    return context.graphService.findExperts({
      ...query,
      organizationId: query.organizationId ?? request.user?.organizationId ?? undefined
    });
  });

  app.get("/graph/entities/:entityType/:id/relationships", { preHandler: app.authenticate }, async (request) => {
    const params = parseParams(graphEntityParamsSchema, request);
    return context.graphService.relationships(params.entityType, params.id);
  });
}
