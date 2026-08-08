import type {
  AuthUser,
  Department,
  Employee,
  ExpertGraphResult,
  KnowledgeDocument,
  LoginResponse,
  Organization,
  Paginated,
  Project,
  RelationshipSummary,
  SearchResult,
  Skill,
  Team
} from "@graphsphere/shared";

const baseUrl = import.meta.env.PUBLIC_API_URL ?? import.meta.env.VITE_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiClient {
  public constructor(private readonly getToken: () => string | null) {}

  public async login(email: string, password: string): Promise<LoginResponse> {
    return this.request<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
  }

  public async register(email: string, password: string): Promise<LoginResponse> {
    return this.request<LoginResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
  }

  public me(): Promise<AuthUser> {
    return this.request<AuthUser>("/auth/me");
  }

  public organizations(): Promise<Paginated<Organization>> {
    return this.request<Paginated<Organization>>("/organizations?pageSize=50");
  }

  public departments(): Promise<Paginated<Department>> {
    return this.request<Paginated<Department>>("/departments?pageSize=50");
  }

  public teams(): Promise<Paginated<Team>> {
    return this.request<Paginated<Team>>("/teams?pageSize=50");
  }

  public employees(): Promise<Paginated<Employee>> {
    return this.request<Paginated<Employee>>("/employees?pageSize=50");
  }

  public employee(id: string): Promise<Employee & { skills: unknown[]; projects: unknown[] }> {
    return this.request<Employee & { skills: unknown[]; projects: unknown[] }>(`/employees/${id}`);
  }

  public skills(): Promise<Paginated<Skill>> {
    return this.request<Paginated<Skill>>("/skills?pageSize=50");
  }

  public projects(): Promise<Paginated<Project>> {
    return this.request<Paginated<Project>>("/projects?pageSize=50");
  }

  public documents(): Promise<Paginated<KnowledgeDocument>> {
    return this.request<Paginated<KnowledgeDocument>>("/documents?pageSize=50");
  }

  public uploadDocument(input: {
    organizationId: string;
    title: string;
    content: string;
    links: Array<{ entityType: "employee" | "project" | "skill" | "team" | "department" | "organization"; entityId: string }>;
  }): Promise<KnowledgeDocument> {
    return this.request<KnowledgeDocument>("/documents", {
      method: "POST",
      body: JSON.stringify({
        ...input,
        mimeType: "text/plain"
      })
    });
  }

  public search(params: URLSearchParams): Promise<Paginated<SearchResult>> {
    return this.request<Paginated<SearchResult>>(`/search?${params.toString()}`);
  }

  public expertQuery(params: URLSearchParams): Promise<ExpertGraphResult[]> {
    return this.request<ExpertGraphResult[]>(`/graph/query/experts?${params.toString()}`);
  }

  public relationships(entityType: string, id: string): Promise<RelationshipSummary> {
    return this.request<RelationshipSummary>(`/graph/entities/${entityType}/${id}/relationships`);
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set("content-type", "application/json");
    const token = this.getToken();
    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }

    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      throw new Error(payload?.message ?? `Request failed with ${response.status}`);
    }

    return response.json() as Promise<T>;
  }
}
