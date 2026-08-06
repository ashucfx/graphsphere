import type {
  AssignEmployeeProject,
  AssignEmployeeSkill,
  AuthUser,
  Department,
  Employee,
  EmployeeProject,
  EmployeeSkill,
  KnowledgeDocument,
  Organization,
  Paginated,
  Project,
  Skill,
  Team,
  UpsertDepartment,
  UpsertEmployee,
  UpsertOrganization,
  UpsertProject,
  UpsertSkill,
  UpsertTeam,
  UserRole,
  DocumentStatus,
  ProjectStatus,
  Proficiency
} from "@graphsphere/shared";
import { conflict, notFound } from "../errors.js";
import { PrismaClient } from "@prisma/client";

export type StoredUser = AuthUser & {
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
};

export type OutboxEventStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

export type OutboxEvent = {
  id: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
  status: OutboxEventStatus;
  attempts: number;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DomainSnapshot = {
  organizations: Organization[];
  departments: Department[];
  teams: Team[];
  employees: Employee[];
  skills: Skill[];
  projects: Project[];
  employeeSkills: EmployeeSkill[];
  employeeProjects: EmployeeProject[];
  documents: KnowledgeDocument[];
};

export type ListOptions = {
  page?: number;
  pageSize?: number;
  organizationId?: string;
  query?: string;
};

export class DomainStore {
  public constructor(private readonly prisma: PrismaClient) {}

  public async snapshot(): Promise<DomainSnapshot> {
    const [organizations, departments, teams, employees, skills, projects, employeeSkills, employeeProjects, documents] = await Promise.all([
      this.prisma.organization.findMany(),
      this.prisma.department.findMany(),
      this.prisma.team.findMany(),
      this.prisma.employee.findMany(),
      this.prisma.skill.findMany(),
      this.prisma.project.findMany(),
      this.prisma.employeeSkill.findMany(),
      this.prisma.employeeProject.findMany(),
      this.prisma.document.findMany()
    ]);
    
    return {
      organizations: organizations.map(o => ({...o, createdAt: o.createdAt.toISOString(), updatedAt: o.updatedAt.toISOString()})),
      departments: departments.map(d => ({...d, createdAt: d.createdAt.toISOString(), updatedAt: d.updatedAt.toISOString()})),
      teams: teams.map(t => ({...t, createdAt: t.createdAt.toISOString(), updatedAt: t.updatedAt.toISOString()})),
      employees: employees.map(e => ({...e, createdAt: e.createdAt.toISOString(), updatedAt: e.updatedAt.toISOString()})),
      skills: skills.map(s => ({...s, createdAt: s.createdAt.toISOString(), updatedAt: s.updatedAt.toISOString()})),
      projects: projects.map(p => ({...p, status: p.status as ProjectStatus, startedAt: p.startedAt?.toISOString() ?? null, endedAt: p.endedAt?.toISOString() ?? null, createdAt: p.createdAt.toISOString(), updatedAt: p.updatedAt.toISOString()})),
      employeeSkills: employeeSkills.map(e => ({...e, proficiency: e.proficiency as Proficiency, createdAt: e.createdAt.toISOString(), updatedAt: e.updatedAt.toISOString()})),
      employeeProjects: employeeProjects.map(e => ({...e, startDate: e.startDate?.toISOString() ?? null, endDate: e.endDate?.toISOString() ?? null, createdAt: e.createdAt.toISOString(), updatedAt: e.updatedAt.toISOString()})),
      documents: documents.map(d => ({...d, status: d.status as DocumentStatus, links: [], createdAt: d.createdAt.toISOString(), updatedAt: d.updatedAt.toISOString()}))
    };
  }

  public async addUser(input: {
    email: string;
    passwordHash: string;
    role: UserRole;
    organizationId: string | null;
  }): Promise<StoredUser> {
    const existing = await this.prisma.user.findUnique({
      where: { email: input.email }
    });
    if (existing) {
      throw conflict("A user with this email already exists");
    }
    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        passwordHash: input.passwordHash,
        role: input.role,
        organizationId: input.organizationId
      }
    });
    return {
      ...user,
      role: user.role as UserRole,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString()
    };
  }

  public async findUserByEmail(email: string): Promise<StoredUser | undefined> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return undefined;
    return {
      ...user,
      role: user.role as UserRole,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString()
    };
  }

  public async findUserById(id: string): Promise<StoredUser | undefined> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) return undefined;
    return {
      ...user,
      role: user.role as UserRole,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString()
    };
  }

  public async createOrganization(input: UpsertOrganization): Promise<Organization> {
    const existing = await this.prisma.organization.findUnique({ where: { name: input.name } });
    if (existing) {
      throw conflict("An organization with this name already exists");
    }
    const org = await this.prisma.organization.create({
      data: {
        name: input.name,
        description: input.description
      }
    });
    const organization = {
      ...org,
      createdAt: org.createdAt.toISOString(),
      updatedAt: org.updatedAt.toISOString()
    };
    await this.emit("organization.upserted", "organization", organization.id, organization);
    return organization;
  }

  public async listOrganizations(options: ListOptions = {}): Promise<Paginated<Organization>> {
    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 25;
    const query = options.query?.trim() || undefined;

    const where = query ? {
      OR: [
        { name: { contains: query, mode: "insensitive" as const } },
        { description: { contains: query, mode: "insensitive" as const } }
      ]
    } : {};

    const [items, total] = await Promise.all([
      this.prisma.organization.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.organization.count({ where })
    ]);

    return {
      items: items.map(o => ({...o, createdAt: o.createdAt.toISOString(), updatedAt: o.updatedAt.toISOString()})),
      page,
      pageSize,
      total
    };
  }

  public async getOrganization(id: string): Promise<Organization> {
    const org = await this.prisma.organization.findUnique({ where: { id } });
    if (!org) throw notFound("Organization");
    return {
      ...org,
      createdAt: org.createdAt.toISOString(),
      updatedAt: org.updatedAt.toISOString()
    };
  }

  public async createDepartment(input: UpsertDepartment): Promise<Department> {
    await this.getOrganization(input.organizationId);
    const existing = await this.prisma.department.findFirst({
      where: {
        organizationId: input.organizationId,
        name: { equals: input.name, mode: "insensitive" }
      }
    });
    if (existing) {
      throw conflict("A department with this name already exists in the organization");
    }
    const dep = await this.prisma.department.create({
      data: {
        organizationId: input.organizationId,
        name: input.name,
        description: input.description
      }
    });
    const department = {
      ...dep,
      createdAt: dep.createdAt.toISOString(),
      updatedAt: dep.updatedAt.toISOString()
    };
    await this.emit("department.upserted", "department", department.id, department);
    return department;
  }

  public async listDepartments(options: ListOptions = {}): Promise<Paginated<Department>> {
    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 25;
    const query = options.query?.trim() || undefined;

    const where = {
      organizationId: options.organizationId,
      ...(query ? {
        OR: [
          { name: { contains: query, mode: "insensitive" as const } },
          { description: { contains: query, mode: "insensitive" as const } }
        ]
      } : {})
    };

    const [items, total] = await Promise.all([
      this.prisma.department.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.department.count({ where })
    ]);

    return {
      items: items.map(d => ({...d, createdAt: d.createdAt.toISOString(), updatedAt: d.updatedAt.toISOString()})),
      page,
      pageSize,
      total
    };
  }

  public async getDepartment(id: string): Promise<Department> {
    const dep = await this.prisma.department.findUnique({ where: { id } });
    if (!dep) throw notFound("Department");
    return {
      ...dep,
      createdAt: dep.createdAt.toISOString(),
      updatedAt: dep.updatedAt.toISOString()
    };
  }

  public async createTeam(input: UpsertTeam): Promise<Team> {
    await this.getOrganization(input.organizationId);
    const department = await this.getDepartment(input.departmentId);
    if (department.organizationId !== input.organizationId) {
      throw conflict("The team department must belong to the same organization");
    }
    const existing = await this.prisma.team.findFirst({
      where: {
        departmentId: input.departmentId,
        name: { equals: input.name, mode: "insensitive" }
      }
    });
    if (existing) {
      throw conflict("A team with this name already exists in the department");
    }
    const t = await this.prisma.team.create({
      data: {
        organizationId: input.organizationId,
        departmentId: input.departmentId,
        name: input.name,
        description: input.description
      }
    });
    const team = {
      ...t,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString()
    };
    await this.emit("team.upserted", "team", team.id, team);
    return team;
  }

  public async listTeams(options: ListOptions = {}): Promise<Paginated<Team>> {
    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 25;
    const query = options.query?.trim() || undefined;

    const where = {
      organizationId: options.organizationId,
      ...(query ? {
        OR: [
          { name: { contains: query, mode: "insensitive" as const } },
          { description: { contains: query, mode: "insensitive" as const } }
        ]
      } : {})
    };

    const [items, total] = await Promise.all([
      this.prisma.team.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.team.count({ where })
    ]);

    return {
      items: items.map(t => ({...t, createdAt: t.createdAt.toISOString(), updatedAt: t.updatedAt.toISOString()})),
      page,
      pageSize,
      total
    };
  }

  public async getTeam(id: string): Promise<Team> {
    const t = await this.prisma.team.findUnique({ where: { id } });
    if (!t) throw notFound("Team");
    return {
      ...t,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString()
    };
  }

  public async createSkill(input: UpsertSkill): Promise<Skill> {
    await this.getOrganization(input.organizationId);
    const existing = await this.prisma.skill.findFirst({
      where: {
        organizationId: input.organizationId,
        name: { equals: input.name, mode: "insensitive" }
      }
    });
    if (existing) {
      throw conflict("A skill with this name already exists in the organization");
    }
    const s = await this.prisma.skill.create({
      data: {
        organizationId: input.organizationId,
        name: input.name,
        category: input.category,
        description: input.description
      }
    });
    const skill = {
      ...s,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString()
    };
    await this.emit("skill.upserted", "skill", skill.id, skill);
    return skill;
  }

  public async listSkills(options: ListOptions = {}): Promise<Paginated<Skill>> {
    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 25;
    const query = options.query?.trim() || undefined;

    const where = {
      organizationId: options.organizationId,
      ...(query ? {
        OR: [
          { name: { contains: query, mode: "insensitive" as const } },
          { category: { contains: query, mode: "insensitive" as const } },
          { description: { contains: query, mode: "insensitive" as const } }
        ]
      } : {})
    };

    const [items, total] = await Promise.all([
      this.prisma.skill.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.skill.count({ where })
    ]);

    return {
      items: items.map(s => ({...s, createdAt: s.createdAt.toISOString(), updatedAt: s.updatedAt.toISOString()})),
      page,
      pageSize,
      total
    };
  }

  public async getSkill(id: string): Promise<Skill> {
    const s = await this.prisma.skill.findUnique({ where: { id } });
    if (!s) throw notFound("Skill");
    return {
      ...s,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString()
    };
  }

  public async createProject(input: UpsertProject): Promise<Project> {
    await this.getOrganization(input.organizationId);
    const existing = await this.prisma.project.findFirst({
      where: {
        organizationId: input.organizationId,
        name: { equals: input.name, mode: "insensitive" }
      }
    });
    if (existing) {
      throw conflict("A project with this name already exists in the organization");
    }
    const p = await this.prisma.project.create({
      data: {
        organizationId: input.organizationId,
        name: input.name,
        domain: input.domain,
        description: input.description,
        status: input.status,
        startedAt: input.startedAt ? new Date(input.startedAt) : null,
        endedAt: input.endedAt ? new Date(input.endedAt) : null
      }
    });
    const project = {
      ...p,
      status: p.status as ProjectStatus,
      startedAt: p.startedAt?.toISOString() ?? null,
      endedAt: p.endedAt?.toISOString() ?? null,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString()
    };
    await this.emit("project.upserted", "project", project.id, project);
    return project;
  }

  public async listProjects(options: ListOptions = {}): Promise<Paginated<Project>> {
    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 25;
    const query = options.query?.trim() || undefined;

    const where = {
      organizationId: options.organizationId,
      ...(query ? {
        OR: [
          { name: { contains: query, mode: "insensitive" as const } },
          { domain: { contains: query, mode: "insensitive" as const } },
          { description: { contains: query, mode: "insensitive" as const } }
        ]
      } : {})
    };

    const [items, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.project.count({ where })
    ]);

    return {
      items: items.map(p => ({
        ...p,
        status: p.status as ProjectStatus,
        startedAt: p.startedAt?.toISOString() ?? null,
        endedAt: p.endedAt?.toISOString() ?? null,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString()
      })),
      page,
      pageSize,
      total
    };
  }

  public async getProject(id: string): Promise<Project> {
    const p = await this.prisma.project.findUnique({ where: { id } });
    if (!p) throw notFound("Project");
    return {
      ...p,
      status: p.status as ProjectStatus,
      startedAt: p.startedAt?.toISOString() ?? null,
      endedAt: p.endedAt?.toISOString() ?? null,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString()
    };
  }

  public async createEmployee(input: UpsertEmployee): Promise<Employee> {
    await this.getOrganization(input.organizationId);
    if (input.departmentId) {
      const department = await this.getDepartment(input.departmentId);
      if (department.organizationId !== input.organizationId) {
        throw conflict("The employee department must belong to the same organization");
      }
    }
    if (input.teamId) {
      const team = await this.getTeam(input.teamId);
      if (team.organizationId !== input.organizationId) {
        throw conflict("The employee team must belong to the same organization");
      }
    }
    const e = await this.prisma.employee.create({
      data: {
        organizationId: input.organizationId,
        departmentId: input.departmentId,
        teamId: input.teamId,
        fullName: input.fullName,
        title: input.title,
        location: input.location,
        summary: input.summary
      }
    });
    const employee = {
      ...e,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString()
    };
    await this.emit("employee.upserted", "employee", employee.id, employee);
    return employee;
  }

  public async listEmployees(options: ListOptions & {
    skillId?: string;
    projectId?: string;
    teamId?: string;
  } = {}): Promise<Paginated<Employee>> {
    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 25;
    const query = options.query?.trim() || undefined;

    const where: any = {
      organizationId: options.organizationId,
      teamId: options.teamId
    };

    if (query) {
      where.OR = [
        { fullName: { contains: query, mode: "insensitive" } },
        { title: { contains: query, mode: "insensitive" } },
        { location: { contains: query, mode: "insensitive" } },
        { summary: { contains: query, mode: "insensitive" } }
      ];
    }

    if (options.skillId) {
      where.skills = { some: { skillId: options.skillId } };
    }
    if (options.projectId) {
      where.projects = { some: { projectId: options.projectId } };
    }

    const [items, total] = await Promise.all([
      this.prisma.employee.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.employee.count({ where })
    ]);

    return {
      items: items.map(e => ({...e, createdAt: e.createdAt.toISOString(), updatedAt: e.updatedAt.toISOString()})),
      page,
      pageSize,
      total
    };
  }

  public async getEmployee(id: string): Promise<Employee> {
    const e = await this.prisma.employee.findUnique({ where: { id } });
    if (!e) throw notFound("Employee");
    return {
      ...e,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString()
    };
  }

  public async assignEmployeeSkill(employeeId: string, input: AssignEmployeeSkill): Promise<EmployeeSkill> {
    const employee = await this.getEmployee(employeeId);
    const skill = await this.getSkill(input.skillId);
    if (employee.organizationId !== skill.organizationId) {
      throw conflict("The skill must belong to the employee organization");
    }
    const assignment = await this.prisma.employeeSkill.upsert({
      where: { employeeId_skillId: { employeeId, skillId: input.skillId } },
      update: {
        proficiency: input.proficiency,
        source: input.source,
        confidence: input.confidence
      },
      create: {
        employeeId,
        skillId: input.skillId,
        proficiency: input.proficiency,
        source: input.source,
        confidence: input.confidence
      }
    });
    const result = {
      ...assignment,
      proficiency: assignment.proficiency as Proficiency,
      createdAt: assignment.createdAt.toISOString(),
      updatedAt: assignment.updatedAt.toISOString()
    };
    await this.emit("employeeSkill.upserted", "employee", employeeId, result);
    return result;
  }

  public async listEmployeeSkills(employeeId: string): Promise<EmployeeSkill[]> {
    await this.getEmployee(employeeId);
    const assignments = await this.prisma.employeeSkill.findMany({ where: { employeeId } });
    return assignments.map(a => ({
      ...a,
      proficiency: a.proficiency as Proficiency,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString()
    }));
  }

  public async assignEmployeeProject(employeeId: string, input: AssignEmployeeProject): Promise<EmployeeProject> {
    const employee = await this.getEmployee(employeeId);
    const project = await this.getProject(input.projectId);
    if (employee.organizationId !== project.organizationId) {
      throw conflict("The project must belong to the employee organization");
    }
    const assignment = await this.prisma.employeeProject.upsert({
      where: { employeeId_projectId: { employeeId, projectId: input.projectId } },
      update: {
        role: input.role,
        startDate: input.startDate ? new Date(input.startDate) : null,
        endDate: input.endDate ? new Date(input.endDate) : null,
        source: input.source
      },
      create: {
        employeeId,
        projectId: input.projectId,
        role: input.role,
        startDate: input.startDate ? new Date(input.startDate) : null,
        endDate: input.endDate ? new Date(input.endDate) : null,
        source: input.source
      }
    });
    const result = {
      ...assignment,
      startDate: assignment.startDate?.toISOString() ?? null,
      endDate: assignment.endDate?.toISOString() ?? null,
      createdAt: assignment.createdAt.toISOString(),
      updatedAt: assignment.updatedAt.toISOString()
    };
    await this.emit("employeeProject.upserted", "employee", employeeId, result);
    return result;
  }

  public async listEmployeeProjects(employeeId: string): Promise<EmployeeProject[]> {
    await this.getEmployee(employeeId);
    const assignments = await this.prisma.employeeProject.findMany({ where: { employeeId } });
    return assignments.map(a => ({
      ...a,
      startDate: a.startDate?.toISOString() ?? null,
      endDate: a.endDate?.toISOString() ?? null,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString()
    }));
  }

  public async createDocument(input: Omit<KnowledgeDocument, "id" | "createdAt" | "updatedAt" | "status" | "failureReason" | "textExcerpt" | "links"> & { links?: any[] }): Promise<KnowledgeDocument> {
    await this.getOrganization(input.organizationId);
    const d = await this.prisma.document.create({
      data: {
        organizationId: input.organizationId,
        title: input.title,
        storageKey: input.storageKey,
        mimeType: input.mimeType,
        status: "UPLOADED",
        failureReason: null,
        textExcerpt: "",
        createdBy: input.createdBy
      }
    });
    const document = {
      ...d,
      status: d.status as DocumentStatus,
      links: [],
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString()
    };
    await this.emit("document.uploaded", "document", document.id, document);
    return document;
  }

  public async listDocuments(options: ListOptions & { status?: KnowledgeDocument["status"] } = {}): Promise<Paginated<KnowledgeDocument>> {
    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 25;
    const query = options.query?.trim() || undefined;

    const where: any = {
      organizationId: options.organizationId,
      status: options.status
    };

    if (query) {
      where.OR = [
        { title: { contains: query, mode: "insensitive" } },
        { textExcerpt: { contains: query, mode: "insensitive" } }
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.document.count({ where })
    ]);

    return {
      items: items.map(d => ({
        ...d,
        status: d.status as DocumentStatus,
        links: [],
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString()
      })),
      page,
      pageSize,
      total
    };
  }

  public async getDocument(id: string): Promise<KnowledgeDocument> {
    const d = await this.prisma.document.findUnique({ where: { id } });
    if (!d) throw notFound("Document");
    return {
      ...d,
      status: d.status as DocumentStatus,
      links: [],
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString()
    };
  }

  public async updateDocumentProcessing(
    id: string,
    status: KnowledgeDocument["status"],
    patch: { textExcerpt?: string; failureReason?: string | null } = {}
  ): Promise<KnowledgeDocument> {
    await this.getDocument(id);
    const data: any = { status };
    if (patch.textExcerpt !== undefined) data.textExcerpt = patch.textExcerpt;
    if (patch.failureReason !== undefined) data.failureReason = patch.failureReason;

    const d = await this.prisma.document.update({
      where: { id },
      data
    });
    const updated = {
      ...d,
      status: d.status as DocumentStatus,
      links: [],
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString()
    };
    await this.emit("document.statusChanged", "document", id, {
      id,
      status,
      failureReason: updated.failureReason
    });
    return updated;
  }

  public async pendingEvents(limit = 25): Promise<OutboxEvent[]> {
    const events = await this.prisma.outboxEvent.findMany({
      where: { status: { in: ["PENDING", "FAILED"] } },
      orderBy: { createdAt: 'asc' },
      take: limit
    });
    return events.map(e => ({
      ...e,
      payload: e.payload as Record<string, unknown>,
      status: e.status as OutboxEventStatus,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString()
    }));
  }

  public async markEventProcessing(id: string): Promise<OutboxEvent> {
    const e = await this.prisma.outboxEvent.update({
      where: { id },
      data: {
        status: "PROCESSING",
        attempts: { increment: 1 }
      }
    });
    return {
      ...e,
      payload: e.payload as Record<string, unknown>,
      status: e.status as OutboxEventStatus,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString()
    };
  }

  public async markEventCompleted(id: string): Promise<void> {
    await this.prisma.outboxEvent.update({
      where: { id },
      data: {
        status: "COMPLETED",
        lastError: null
      }
    });
  }

  public async markEventFailed(id: string, error: string): Promise<void> {
    const event = await this.prisma.outboxEvent.findUnique({ where: { id } });
    if (!event) return;
    await this.prisma.outboxEvent.update({
      where: { id },
      data: {
        status: event.attempts >= 3 ? "FAILED" : "PENDING",
        lastError: error.slice(0, 500)
      }
    });
  }

  private async emit(eventType: string, aggregateType: string, aggregateId: string, payload: Record<string, unknown>): Promise<void> {
    await this.prisma.outboxEvent.create({
      data: {
        eventType,
        aggregateType,
        aggregateId,
        payload: payload as any,
        status: "PENDING"
      }
    });
  }
}
