import { z } from "zod";

export const uuidSchema = z.string().uuid();

export const roleSchema = z.enum(["ADMIN", "EDITOR", "VIEWER"]);
export type UserRole = z.infer<typeof roleSchema>;

export const entityTypeSchema = z.enum([
  "employee",
  "project",
  "skill",
  "team",
  "department",
  "organization",
  "document"
]);
export type EntityType = z.infer<typeof entityTypeSchema>;

export const projectStatusSchema = z.enum(["PLANNED", "ACTIVE", "COMPLETED", "ARCHIVED"]);
export type ProjectStatus = z.infer<typeof projectStatusSchema>;

export const proficiencySchema = z.enum(["FOUNDATIONAL", "WORKING", "ADVANCED", "EXPERT"]);
export type Proficiency = z.infer<typeof proficiencySchema>;

export const documentStatusSchema = z.enum(["UPLOADED", "PROCESSING", "INDEXED", "FAILED"]);
export type DocumentStatus = z.infer<typeof documentStatusSchema>;

export const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25)
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export const paginatedSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1),
    total: z.number().int().min(0)
  });

export type Paginated<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};

export const apiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  requestId: z.string().optional(),
  fieldErrors: z.record(z.string(), z.array(z.string())).optional()
});
export type ApiError = z.infer<typeof apiErrorSchema>;

export const authUserSchema = z.object({
  id: uuidSchema,
  email: z.string().email(),
  role: roleSchema,
  organizationId: uuidSchema.nullable()
});
export type AuthUser = z.infer<typeof authUserSchema>;

export const loginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(256)
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const loginResponseSchema = z.object({
  token: z.string(),
  user: authUserSchema
});
export type LoginResponse = z.infer<typeof loginResponseSchema>;

export const registerRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(256),
  role: roleSchema.default("VIEWER"),
  organizationId: uuidSchema.nullable().default(null)
});
export type RegisterRequest = z.infer<typeof registerRequestSchema>;

export const organizationSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  description: z.string(),
  createdAt: z.string(),
  updatedAt: z.string()
});
export type Organization = z.infer<typeof organizationSchema>;

export const upsertOrganizationSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(2000).default("")
});
export type UpsertOrganization = z.infer<typeof upsertOrganizationSchema>;

export const departmentSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  name: z.string(),
  description: z.string(),
  createdAt: z.string(),
  updatedAt: z.string()
});
export type Department = z.infer<typeof departmentSchema>;

export const upsertDepartmentSchema = z.object({
  organizationId: uuidSchema,
  name: z.string().min(2).max(120),
  description: z.string().max(2000).default("")
});
export type UpsertDepartment = z.infer<typeof upsertDepartmentSchema>;

export const teamSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  departmentId: uuidSchema,
  name: z.string(),
  description: z.string(),
  createdAt: z.string(),
  updatedAt: z.string()
});
export type Team = z.infer<typeof teamSchema>;

export const upsertTeamSchema = z.object({
  organizationId: uuidSchema,
  departmentId: uuidSchema,
  name: z.string().min(2).max(120),
  description: z.string().max(2000).default("")
});
export type UpsertTeam = z.infer<typeof upsertTeamSchema>;

export const skillSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  name: z.string(),
  category: z.string(),
  description: z.string(),
  createdAt: z.string(),
  updatedAt: z.string()
});
export type Skill = z.infer<typeof skillSchema>;

export const upsertSkillSchema = z.object({
  organizationId: uuidSchema,
  name: z.string().min(2).max(120),
  category: z.string().min(2).max(120),
  description: z.string().max(2000).default("")
});
export type UpsertSkill = z.infer<typeof upsertSkillSchema>;

export const projectSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  name: z.string(),
  domain: z.string(),
  description: z.string(),
  status: projectStatusSchema,
  startedAt: z.string().nullable(),
  endedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string()
});
export type Project = z.infer<typeof projectSchema>;

export const upsertProjectSchema = z.object({
  organizationId: uuidSchema,
  name: z.string().min(2).max(160),
  domain: z.string().min(2).max(120),
  description: z.string().max(4000).default(""),
  status: projectStatusSchema.default("ACTIVE"),
  startedAt: dateStringSchema.nullable().default(null),
  endedAt: dateStringSchema.nullable().default(null)
});
export type UpsertProject = z.infer<typeof upsertProjectSchema>;

export const employeeSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  departmentId: uuidSchema.nullable(),
  teamId: uuidSchema.nullable(),
  fullName: z.string(),
  title: z.string(),
  location: z.string(),
  summary: z.string(),
  createdAt: z.string(),
  updatedAt: z.string()
});
export type Employee = z.infer<typeof employeeSchema>;

export const upsertEmployeeSchema = z.object({
  organizationId: uuidSchema,
  departmentId: uuidSchema.nullable().default(null),
  teamId: uuidSchema.nullable().default(null),
  fullName: z.string().min(2).max(160),
  title: z.string().min(2).max(160),
  location: z.string().max(160).default(""),
  summary: z.string().max(4000).default("")
});
export type UpsertEmployee = z.infer<typeof upsertEmployeeSchema>;

export const employeeSkillSchema = z.object({
  employeeId: uuidSchema,
  skillId: uuidSchema,
  proficiency: proficiencySchema,
  source: z.string(),
  confidence: z.number().min(0).max(1),
  createdAt: z.string(),
  updatedAt: z.string()
});
export type EmployeeSkill = z.infer<typeof employeeSkillSchema>;

export const assignEmployeeSkillSchema = z.object({
  skillId: uuidSchema,
  proficiency: proficiencySchema.default("WORKING"),
  source: z.string().min(2).max(120).default("profile"),
  confidence: z.number().min(0).max(1).default(1)
});
export type AssignEmployeeSkill = z.infer<typeof assignEmployeeSkillSchema>;

export const employeeProjectSchema = z.object({
  employeeId: uuidSchema,
  projectId: uuidSchema,
  role: z.string(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  source: z.string(),
  createdAt: z.string(),
  updatedAt: z.string()
});
export type EmployeeProject = z.infer<typeof employeeProjectSchema>;

export const assignEmployeeProjectSchema = z.object({
  projectId: uuidSchema,
  role: z.string().min(2).max(160),
  startDate: dateStringSchema.nullable().default(null),
  endDate: dateStringSchema.nullable().default(null),
  source: z.string().min(2).max(120).default("assignment")
});
export type AssignEmployeeProject = z.infer<typeof assignEmployeeProjectSchema>;

export const documentLinkSchema = z.object({
  entityType: entityTypeSchema.exclude(["document"]),
  entityId: uuidSchema,
  relationship: z.string().min(2).max(80).default("related")
});
export type DocumentLink = z.infer<typeof documentLinkSchema>;

export const documentSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  title: z.string(),
  storageKey: z.string(),
  mimeType: z.string(),
  status: documentStatusSchema,
  failureReason: z.string().nullable(),
  textExcerpt: z.string(),
  links: z.array(documentLinkSchema),
  createdBy: uuidSchema.nullable(),
  createdAt: z.string(),
  updatedAt: z.string()
});
export type KnowledgeDocument = z.infer<typeof documentSchema>;

export const createDocumentSchema = z.object({
  organizationId: uuidSchema,
  title: z.string().min(2).max(180),
  mimeType: z.string().min(3).max(120).default("text/plain"),
  content: z.string().min(1).max(250_000),
  links: z.array(documentLinkSchema).max(20).default([])
});
export type CreateDocument = z.infer<typeof createDocumentSchema>;

export const searchQuerySchema = paginationQuerySchema.extend({
  query: z.string().min(0).max(200).default(""),
  entityType: entityTypeSchema.optional(),
  sort: z.enum(["relevance", "updatedAt", "title"]).default("relevance")
});
export type SearchQuery = z.infer<typeof searchQuerySchema>;

export const searchResultSchema = z.object({
  id: uuidSchema,
  entityType: entityTypeSchema,
  title: z.string(),
  subtitle: z.string(),
  excerpt: z.string(),
  score: z.number(),
  updatedAt: z.string()
});
export type SearchResult = z.infer<typeof searchResultSchema>;

export const expertGraphQuerySchema = z.object({
  role: z.string().min(2).max(160).default("ML Engineer"),
  projectDomain: z.string().min(2).max(120).default("drone"),
  collaboratorSkill: z.string().min(2).max(120).default("CUDA"),
  organizationId: uuidSchema.optional()
});
export type ExpertGraphQuery = z.infer<typeof expertGraphQuerySchema>;

export const graphPathStepSchema = z.object({
  entityType: entityTypeSchema,
  id: uuidSchema,
  label: z.string(),
  relationship: z.string().nullable()
});
export type GraphPathStep = z.infer<typeof graphPathStepSchema>;

export const expertGraphResultSchema = z.object({
  employee: employeeSchema,
  project: projectSchema,
  collaborator: employeeSchema,
  collaboratorSkill: skillSchema,
  path: z.array(graphPathStepSchema)
});
export type ExpertGraphResult = z.infer<typeof expertGraphResultSchema>;

export const relationshipSummarySchema = z.object({
  source: graphPathStepSchema,
  targets: z.array(graphPathStepSchema)
});
export type RelationshipSummary = z.infer<typeof relationshipSummarySchema>;

export const healthSchema = z.object({
  status: z.enum(["ok", "degraded", "error"]),
  service: z.string(),
  dependencies: z.record(z.string(), z.enum(["ok", "degraded", "error"]))
});
export type Health = z.infer<typeof healthSchema>;
