import type { FastifyInstance } from "fastify";
import { loginRequestSchema, registerRequestSchema } from "@graphsphere/shared";
import type { AppContext } from "../context.js";
import { parseBody } from "../http.js";

export async function registerAuthRoutes(app: FastifyInstance, context: AppContext): Promise<void> {
  app.post("/auth/login", async (request) => {
    const body = parseBody(loginRequestSchema, request);
    return context.authService.login(body);
  });

  app.post("/auth/register", async (request) => {
    const body = parseBody(registerRequestSchema, request);
    return context.authService.register(body);
  });

  app.get("/auth/me", { preHandler: app.authenticate }, async (request) => {
    return request.user;
  });
}
