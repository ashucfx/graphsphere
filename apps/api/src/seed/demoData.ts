import { hash } from "bcryptjs";
import type { AppConfig } from "../config.js";
import { DomainStore } from "../domain/store.js";
import { prisma } from "../prisma.js";

export async function createSeededStore(config: AppConfig): Promise<DomainStore> {
  const store = new DomainStore(prisma);

  try {
    const existingOrg = await store.listOrganizations({ query: "Northstar Systems" });
    if (existingOrg.total > 0) return store; // Already seeded
  } catch (e) {
    // Ignore error if tables are empty or not ready
  }

  const organization = await store.createOrganization({
    name: "Northstar Systems",
    description: "Fictional enterprise engineering organization for knowledge discovery workflows."
  });

  const platformDepartment = await store.createDepartment({
    organizationId: organization.id,
    name: "Platform Engineering",
    description: "Builds shared systems for data, search, and operations."
  });

  const autonomyDepartment = await store.createDepartment({
    organizationId: organization.id,
    name: "Autonomy Programs",
    description: "Builds field systems for mapping and remote operations."
  });

  const graphTeam = await store.createTeam({
    organizationId: organization.id,
    departmentId: platformDepartment.id,
    name: "Knowledge Systems",
    description: "Maintains graph, search, and document discovery platforms."
  });

  const mappingTeam = await store.createTeam({
    organizationId: organization.id,
    departmentId: autonomyDepartment.id,
    name: "Aerial Mapping",
    description: "Delivers drone mapping and telemetry products."
  });

  const skills = {
    cuda: await store.createSkill({
      organizationId: organization.id,
      name: "CUDA",
      category: "Accelerated Computing",
      description: "GPU programming for high-throughput numerical workloads."
    }),
    vision: await store.createSkill({
      organizationId: organization.id,
      name: "Computer Vision",
      category: "Perception",
      description: "Image processing, feature detection, and visual data pipelines."
    }),
    graph: await store.createSkill({
      organizationId: organization.id,
      name: "Graph Databases",
      category: "Data Systems",
      description: "Modeling and querying highly connected enterprise data."
    }),
    search: await store.createSkill({
      organizationId: organization.id,
      name: "Search Relevance",
      category: "Information Retrieval",
      description: "Ranking, filtering, indexing, and query evaluation."
    }),
    security: await store.createSkill({
      organizationId: organization.id,
      name: "Secure API Design",
      category: "Security",
      description: "Authentication, authorization, validation, and audit controls."
    })
  };

  const mappingProject = await store.createProject({
    organizationId: organization.id,
    name: "Aerial Mapping Platform",
    domain: "drone",
    description: "Mapping platform that processes imagery, telemetry, and field operations data.",
    status: "ACTIVE",
    startedAt: "2025-02-01",
    endedAt: null
  });

  const searchProject = await store.createProject({
    organizationId: organization.id,
    name: "Enterprise Discovery Console",
    domain: "knowledge-search",
    description: "Internal system for entity search, relationship browsing, and document discovery.",
    status: "ACTIVE",
    startedAt: "2025-05-15",
    endedAt: null
  });

  const complianceProject = await store.createProject({
    organizationId: organization.id,
    name: "Access Review Automation",
    domain: "security",
    description: "Controls and reporting for least-privilege access reviews.",
    status: "COMPLETED",
    startedAt: "2024-04-01",
    endedAt: "2024-12-15"
  });

  const maya = await store.createEmployee({
    organizationId: organization.id,
    departmentId: autonomyDepartment.id,
    teamId: mappingTeam.id,
    fullName: "Maya Rao",
    title: "ML Engineer",
    location: "Seattle",
    summary: "Builds perception and mapping services for aerial systems."
  });

  const ethan = await store.createEmployee({
    organizationId: organization.id,
    departmentId: platformDepartment.id,
    teamId: graphTeam.id,
    fullName: "Ethan Park",
    title: "Principal Systems Engineer",
    location: "Austin",
    summary: "Specializes in accelerated processing, graph infrastructure, and operational reliability."
  });

  const lena = await store.createEmployee({
    organizationId: organization.id,
    departmentId: platformDepartment.id,
    teamId: graphTeam.id,
    fullName: "Lena Ortiz",
    title: "Search Engineer",
    location: "New York",
    summary: "Owns entity search quality, indexing pipelines, and relevance evaluation."
  });

  const omar = await store.createEmployee({
    organizationId: organization.id,
    departmentId: platformDepartment.id,
    teamId: graphTeam.id,
    fullName: "Omar Mensah",
    title: "Security Engineer",
    location: "Chicago",
    summary: "Reviews API controls, audit events, and secure deployment posture."
  });

  await store.assignEmployeeSkill(maya.id, {
    skillId: skills.vision.id,
    proficiency: "EXPERT",
    source: "profile",
    confidence: 0.96
  });
  await store.assignEmployeeSkill(maya.id, {
    skillId: skills.search.id,
    proficiency: "WORKING",
    source: "project-history",
    confidence: 0.71
  });
  await store.assignEmployeeSkill(ethan.id, {
    skillId: skills.cuda.id,
    proficiency: "EXPERT",
    source: "profile",
    confidence: 0.98
  });
  await store.assignEmployeeSkill(ethan.id, {
    skillId: skills.graph.id,
    proficiency: "ADVANCED",
    source: "project-history",
    confidence: 0.92
  });
  await store.assignEmployeeSkill(lena.id, {
    skillId: skills.search.id,
    proficiency: "EXPERT",
    source: "profile",
    confidence: 0.95
  });
  await store.assignEmployeeSkill(omar.id, {
    skillId: skills.security.id,
    proficiency: "EXPERT",
    source: "profile",
    confidence: 0.97
  });

  await store.assignEmployeeProject(maya.id, {
    projectId: mappingProject.id,
    role: "Perception Lead",
    startDate: "2025-02-01",
    endDate: null,
    source: "assignment"
  });
  await store.assignEmployeeProject(ethan.id, {
    projectId: mappingProject.id,
    role: "Compute Systems Advisor",
    startDate: "2025-03-01",
    endDate: null,
    source: "assignment"
  });
  await store.assignEmployeeProject(ethan.id, {
    projectId: searchProject.id,
    role: "Graph Platform Lead",
    startDate: "2025-05-15",
    endDate: null,
    source: "assignment"
  });
  await store.assignEmployeeProject(lena.id, {
    projectId: searchProject.id,
    role: "Search Lead",
    startDate: "2025-05-15",
    endDate: null,
    source: "assignment"
  });
  await store.assignEmployeeProject(omar.id, {
    projectId: complianceProject.id,
    role: "Security Reviewer",
    startDate: "2024-04-01",
    endDate: "2024-12-15",
    source: "assignment"
  });

  await store.addUser({
    email: config.ADMIN_EMAIL,
    passwordHash: await hash(config.ADMIN_PASSWORD, 12),
    role: "ADMIN",
    organizationId: organization.id
  });

  return store;
}
