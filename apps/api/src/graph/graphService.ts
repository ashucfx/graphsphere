import type {
  EntityType,
  ExpertGraphQuery,
  ExpertGraphResult,
  GraphPathStep,
  RelationshipSummary
} from "@graphsphere/shared";
import type { CacheClient } from "../cache/cache.js";
import type { DomainStore, DomainSnapshot } from "../domain/store.js";
import { notFound } from "../errors.js";

export class GraphService {
  public constructor(
    private readonly store: DomainStore,
    private readonly cache: CacheClient
  ) {}

  public async findExperts(query: ExpertGraphQuery): Promise<ExpertGraphResult[]> {
    const key = `graph:experts:${JSON.stringify(query)}`;
    const cached = await this.cache.get<ExpertGraphResult[]>(key);
    if (cached) {
      return cached;
    }

    const snapshot = await this.store.snapshot();
    const role = query.role.toLowerCase();
    const projectDomain = query.projectDomain.toLowerCase();
    const collaboratorSkill = query.collaboratorSkill.toLowerCase();

    const projectsById = indexById(snapshot.projects);
    const employeesById = indexById(snapshot.employees);
    const skillsById = indexById(snapshot.skills);

    const requiredSkillIds = new Set(
      snapshot.skills
        .filter((skill) => skill.name.toLowerCase().includes(collaboratorSkill))
        .map((skill) => skill.id)
    );

    const collaboratorsWithSkill = new Set(
      snapshot.employeeSkills
        .filter((assignment) => requiredSkillIds.has(assignment.skillId))
        .map((assignment) => assignment.employeeId)
    );

    const results: ExpertGraphResult[] = [];
    for (const employee of snapshot.employees) {
      if (query.organizationId && employee.organizationId !== query.organizationId) {
        continue;
      }
      if (!employee.title.toLowerCase().includes(role)) {
        continue;
      }

      const projectAssignments = snapshot.employeeProjects.filter((assignment) => assignment.employeeId === employee.id);
      for (const assignment of projectAssignments) {
        const project = projectsById.get(assignment.projectId);
        if (!project || !project.domain.toLowerCase().includes(projectDomain)) {
          continue;
        }

        const peerAssignments = snapshot.employeeProjects.filter(
          (peer) => peer.projectId === project.id && peer.employeeId !== employee.id
        );

        for (const peerAssignment of peerAssignments) {
          if (!collaboratorsWithSkill.has(peerAssignment.employeeId)) {
            continue;
          }
          const collaborator = employeesById.get(peerAssignment.employeeId);
          if (!collaborator) {
            continue;
          }
          const skillAssignment = snapshot.employeeSkills.find(
            (candidate) => candidate.employeeId === collaborator.id && requiredSkillIds.has(candidate.skillId)
          );
          const skill = skillAssignment ? skillsById.get(skillAssignment.skillId) : undefined;
          if (!skill) {
            continue;
          }
          results.push({
            employee,
            project,
            collaborator,
            collaboratorSkill: skill,
            path: [
              step("employee", employee.id, employee.fullName, null),
              step("project", project.id, project.name, "WORKED_ON"),
              step("employee", collaborator.id, collaborator.fullName, "WORKED_WITH"),
              step("skill", skill.id, skill.name, "HAS_SKILL")
            ]
          });
        }
      }
    }

    await this.cache.set(key, results, 60);
    return results;
  }

  public async relationships(entityType: EntityType, id: string): Promise<RelationshipSummary> {
    const snapshot = await this.store.snapshot();
    const source = findStep(snapshot, entityType, id);
    if (!source) {
      throw notFound("Graph entity");
    }

    const targets: GraphPathStep[] = [];
    if (entityType === "employee") {
      for (const assignment of snapshot.employeeSkills.filter((item) => item.employeeId === id)) {
        const skill = snapshot.skills.find((item) => item.id === assignment.skillId);
        if (skill) {
          targets.push(step("skill", skill.id, skill.name, "HAS_SKILL"));
        }
      }
      for (const assignment of snapshot.employeeProjects.filter((item) => item.employeeId === id)) {
        const project = snapshot.projects.find((item) => item.id === assignment.projectId);
        if (project) {
          targets.push(step("project", project.id, project.name, "WORKED_ON"));
        }
      }
      const employee = snapshot.employees.find((item) => item.id === id);
      if (employee?.teamId) {
        const team = snapshot.teams.find((item) => item.id === employee.teamId);
        if (team) {
          targets.push(step("team", team.id, team.name, "MEMBER_OF"));
        }
      }
    }

    if (entityType === "project") {
      for (const assignment of snapshot.employeeProjects.filter((item) => item.projectId === id)) {
        const employee = snapshot.employees.find((item) => item.id === assignment.employeeId);
        if (employee) {
          targets.push(step("employee", employee.id, employee.fullName, "HAS_CONTRIBUTOR"));
        }
      }
    }

    if (entityType === "skill") {
      for (const assignment of snapshot.employeeSkills.filter((item) => item.skillId === id)) {
        const employee = snapshot.employees.find((item) => item.id === assignment.employeeId);
        if (employee) {
          targets.push(step("employee", employee.id, employee.fullName, "KNOWN_BY"));
        }
      }
    }

    return { source, targets };
  }
}

function step(entityType: EntityType, id: string, label: string, relationship: string | null): GraphPathStep {
  return { entityType, id, label, relationship };
}

function indexById<T extends { id: string }>(items: T[]): Map<string, T> {
  return new Map(items.map((item) => [item.id, item]));
}

function findStep(snapshot: DomainSnapshot, entityType: EntityType, id: string): GraphPathStep | null {
  if (entityType === "employee") {
    const item = snapshot.employees.find((candidate) => candidate.id === id);
    return item ? step("employee", item.id, item.fullName, null) : null;
  }
  if (entityType === "project") {
    const item = snapshot.projects.find((candidate) => candidate.id === id);
    return item ? step("project", item.id, item.name, null) : null;
  }
  if (entityType === "skill") {
    const item = snapshot.skills.find((candidate) => candidate.id === id);
    return item ? step("skill", item.id, item.name, null) : null;
  }
  if (entityType === "team") {
    const item = snapshot.teams.find((candidate) => candidate.id === id);
    return item ? step("team", item.id, item.name, null) : null;
  }
  if (entityType === "department") {
    const item = snapshot.departments.find((candidate) => candidate.id === id);
    return item ? step("department", item.id, item.name, null) : null;
  }
  if (entityType === "organization") {
    const item = snapshot.organizations.find((candidate) => candidate.id === id);
    return item ? step("organization", item.id, item.name, null) : null;
  }
  if (entityType === "document") {
    const item = snapshot.documents.find((candidate) => candidate.id === id);
    return item ? step("document", item.id, item.title, null) : null;
  }
  return null;
}
