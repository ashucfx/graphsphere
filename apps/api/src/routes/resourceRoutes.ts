import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import {
  assignEmployeeProjectSchema,
  assignEmployeeSkillSchema,
  createDocumentSchema,
  documentStatusSchema,
  paginationQuerySchema,
  upsertDepartmentSchema,
  upsertEmployeeSchema,
  upsertOrganizationSchema,
  upsertProjectSchema,
  upsertSkillSchema,
  upsertTeamSchema,
  uuidSchema
} from "@graphsphere/shared";
import type { AppContext } from "../context.js";
import { forbidden } from "../errors.js";
import { parseBody, parseParams, parseQuery, sendCreated } from "../http.js";
import { requireRoles } from "../auth/fastifyAuth.js";

const idParamsSchema = z.object({ id: uuidSchema });
const employeeIdParamsSchema = z.object({ employeeId: uuidSchema });
const listQuerySchema = paginationQuerySchema.extend({
  organizationId: uuidSchema.optional(),
  query: z.string().max(200).optional()
});
const employeeListQuerySchema = listQuerySchema.extend({
  skillId: uuidSchema.optional(),
  projectId: uuidSchema.optional(),
  teamId: uuidSchema.optional()
});
const documentListQuerySchema = listQuerySchema.extend({
  status: documentStatusSchema.optional()
});

export async function registerResourceRoutes(app: FastifyInstance, context: AppContext): Promise<void> {
  app.get("/organizations", { preHandler: app.authenticate }, async (request) => {
    const query = parseQuery(listQuerySchema, request);
    return await context.store.listOrganizations({ ...query, organizationId: visibleOrganizationId(request, query.organizationId) });
  });

  app.post(
    "/organizations",
    { preHandler: [app.authenticate, requireRoles(["ADMIN"])] },
    async (request, reply) => {
      const body = parseBody(upsertOrganizationSchema, request);
      const organization = await context.store.createOrganization(body);
      await context.cache.deleteByPrefix("graph:");
      sendCreated(reply, organization);
    }
  );

  app.get("/organizations/:id", { preHandler: app.authenticate }, async (request) => {
    const { id } = parseParams(idParamsSchema, request);
    const organization = await context.store.getOrganization(id);
    requireOrganizationAccess(request, organization.id);
    return organization;
  });

  app.get("/departments", { preHandler: app.authenticate }, async (request) => {
    const query = parseQuery(listQuerySchema, request);
    return await context.store.listDepartments({ ...query, organizationId: visibleOrganizationId(request, query.organizationId) });
  });

  app.post(
    "/departments",
    { preHandler: [app.authenticate, requireRoles(["ADMIN", "EDITOR"])] },
    async (request, reply) => {
      const body = parseBody(upsertDepartmentSchema, request);
      requireOrganizationAccess(request, body.organizationId);
      const department = await context.store.createDepartment(body);
      await context.cache.deleteByPrefix("graph:");
      sendCreated(reply, department);
    }
  );

  app.get("/teams", { preHandler: app.authenticate }, async (request) => {
    const query = parseQuery(listQuerySchema, request);
    return await context.store.listTeams({ ...query, organizationId: visibleOrganizationId(request, query.organizationId) });
  });

  app.post("/teams", { preHandler: [app.authenticate, requireRoles(["ADMIN", "EDITOR"])] }, async (request, reply) => {
    const body = parseBody(upsertTeamSchema, request);
    requireOrganizationAccess(request, body.organizationId);
    const team = await context.store.createTeam(body);
    await context.cache.deleteByPrefix("graph:");
    sendCreated(reply, team);
  });

  app.get("/skills", { preHandler: app.authenticate }, async (request) => {
    const query = parseQuery(listQuerySchema, request);
    return await context.store.listSkills({ ...query, organizationId: visibleOrganizationId(request, query.organizationId) });
  });

  app.post("/skills", { preHandler: [app.authenticate, requireRoles(["ADMIN", "EDITOR"])] }, async (request, reply) => {
    const body = parseBody(upsertSkillSchema, request);
    requireOrganizationAccess(request, body.organizationId);
    const skill = await context.store.createSkill(body);
    await context.cache.deleteByPrefix("graph:");
    sendCreated(reply, skill);
  });

  app.get("/projects", { preHandler: app.authenticate }, async (request) => {
    const query = parseQuery(listQuerySchema, request);
    return await context.store.listProjects({ ...query, organizationId: visibleOrganizationId(request, query.organizationId) });
  });

  app.post("/projects", { preHandler: [app.authenticate, requireRoles(["ADMIN", "EDITOR"])] }, async (request, reply) => {
    const body = parseBody(upsertProjectSchema, request);
    requireOrganizationAccess(request, body.organizationId);
    const project = await context.store.createProject(body);
    await context.cache.deleteByPrefix("graph:");
    sendCreated(reply, project);
  });

  app.get("/projects/:id", { preHandler: app.authenticate }, async (request) => {
    const { id } = parseParams(idParamsSchema, request);
    const project = await context.store.getProject(id);
    requireOrganizationAccess(request, project.organizationId);
    return project;
  });

  app.get("/employees", { preHandler: app.authenticate }, async (request) => {
    const query = parseQuery(employeeListQuerySchema, request);
    return await context.store.listEmployees({ ...query, organizationId: visibleOrganizationId(request, query.organizationId) });
  });

  app.post("/employees", { preHandler: [app.authenticate, requireRoles(["ADMIN", "EDITOR"])] }, async (request, reply) => {
    const body = parseBody(upsertEmployeeSchema, request);
    requireOrganizationAccess(request, body.organizationId);
    const employee = await context.store.createEmployee(body);
    await context.cache.deleteByPrefix("graph:");
    sendCreated(reply, employee);
  });

  app.get("/employees/:id", { preHandler: app.authenticate }, async (request) => {
    const { id } = parseParams(idParamsSchema, request);
    const employee = await context.store.getEmployee(id);
    requireOrganizationAccess(request, employee.organizationId);
    return {
      ...employee,
      skills: await context.store.listEmployeeSkills(id),
      projects: await context.store.listEmployeeProjects(id)
    };
  });

  app.post(
    "/employees/:employeeId/skills",
    { preHandler: [app.authenticate, requireRoles(["ADMIN", "EDITOR"])] },
    async (request, reply) => {
      const { employeeId } = parseParams(employeeIdParamsSchema, request);
      const employee = await context.store.getEmployee(employeeId);
      requireOrganizationAccess(request, employee.organizationId);
      const body = parseBody(assignEmployeeSkillSchema, request);
      const assignment = await context.store.assignEmployeeSkill(employeeId, body);
      await context.cache.deleteByPrefix("graph:");
      sendCreated(reply, assignment);
    }
  );

  app.post(
    "/employees/:employeeId/projects",
    { preHandler: [app.authenticate, requireRoles(["ADMIN", "EDITOR"])] },
    async (request, reply) => {
      const { employeeId } = parseParams(employeeIdParamsSchema, request);
      const employee = await context.store.getEmployee(employeeId);
      requireOrganizationAccess(request, employee.organizationId);
      const body = parseBody(assignEmployeeProjectSchema, request);
      const assignment = await context.store.assignEmployeeProject(employeeId, body);
      await context.cache.deleteByPrefix("graph:");
      sendCreated(reply, assignment);
    }
  );

  app.get("/documents", { preHandler: app.authenticate }, async (request) => {
    const query = parseQuery(documentListQuerySchema, request);
    return await context.store.listDocuments({ ...query, organizationId: visibleOrganizationId(request, query.organizationId) });
  });

  app.post("/documents", { preHandler: [app.authenticate, requireRoles(["ADMIN", "EDITOR"])] }, async (request, reply) => {
    const body = parseBody(createDocumentSchema, request);
    requireOrganizationAccess(request, body.organizationId);
    const storageKey = `${body.organizationId}/${Date.now()}-${slug(body.title)}.txt`;
    await context.objectStorage.putText(storageKey, body.content, body.mimeType);
    const document = await context.store.createDocument({
      organizationId: body.organizationId,
      title: body.title,
      mimeType: body.mimeType,
      storageKey,
      links: body.links,
      createdBy: request.user?.id ?? null
    });
    setTimeout(() => {
      void context.documentProcessor.processPending(10);
    }, 0);
    sendCreated(reply, document);
  });

  app.get("/documents/:id", { preHandler: app.authenticate }, async (request) => {
    const { id } = parseParams(idParamsSchema, request);
    const document = await context.store.getDocument(id);
    requireOrganizationAccess(request, document.organizationId);
    return document;
  });
}

function visibleOrganizationId(request: FastifyRequest, requestedOrganizationId?: string): string | undefined {
  if (!request.user) {
    return undefined;
  }
  if (request.user.role === "ADMIN") {
    return requestedOrganizationId ?? request.user.organizationId ?? undefined;
  }
  return request.user.organizationId ?? undefined;
}

function requireOrganizationAccess(request: FastifyRequest, organizationId: string): void {
  if (!request.user) {
    throw forbidden();
  }
  if (request.user.role !== "ADMIN" && request.user.organizationId !== organizationId) {
    throw forbidden("This resource belongs to a different organization");
  }
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}
