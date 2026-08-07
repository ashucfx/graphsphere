import type { FastifyInstance } from "fastify";
import type { AppContext } from "../context.js";

export async function registerHealthRoutes(app: FastifyInstance, _context: AppContext): Promise<void> {
  app.get("/health/live", async () => ({
    status: "ok",
    service: "graphsphere-api",
    dependencies: {}
  }));

  app.get("/health/ready", async () => ({
    status: "ok",
    service: "graphsphere-api",
    dependencies: {
      datastore: "ok",
      graph: "ok",
      search: "ok",
      cache: "ok",
      objectStorage: "ok"
    }
  }));
}
