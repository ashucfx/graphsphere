import type { AuthUser, UserRole } from "@graphsphere/shared";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { AuthService } from "./authService.js";
import { forbidden, unauthorized } from "../errors.js";

export function registerAuth(app: FastifyInstance, authService: AuthService): void {
  app.decorateRequest("user", null);

  app.decorate("authenticate", async (request: FastifyRequest) => {
    const header = request.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      throw unauthorized();
    }
    request.user = await authService.verifyToken(header.slice("Bearer ".length));
  });
}

export function requireRoles(roles: UserRole[]) {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    if (!request.user) {
      throw unauthorized();
    }
    if (!roles.includes(request.user.role)) {
      throw forbidden();
    }
  };
}

declare module "fastify" {
  interface FastifyRequest {
    user: AuthUser | null;
  }

  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
