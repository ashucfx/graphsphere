import {
  Building2,
  FileText,
  GitBranch,
  KeyRound,
  Layers3,
  LogOut,
  Network,
  Search,
  ShieldCheck,
  Users
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type {
  Department,
  Employee,
  ExpertGraphResult,
  KnowledgeDocument,
  Organization,
  Project,
  SearchResult,
  Skill,
  Team
} from "@graphsphere/shared";
import { ApiClient } from "./lib/api";
import { RelationshipMap } from "./components/RelationshipMap";
import "./styles/app.css";

type Tab = "employees" | "projects" | "skills" | "organization" | "documents" | "search" | "graph";

type AppData = {
  organizations: Organization[];
  departments: Department[];
  teams: Team[];
  employees: Employee[];
  skills: Skill[];
  projects: Project[];
  documents: KnowledgeDocument[];
};

const emptyData: AppData = {
  organizations: [],
  departments: [],
  teams: [],
  employees: [],
  skills: [],
  projects: [],
  documents: []
};

export default function App() {
  const [token, setToken] = useState(() => sessionStorage.getItem("graphsphere.token"));
  const [activeTab, setActiveTab] = useState<Tab>("employees");
  const [data, setData] = useState<AppData>(emptyData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const api = useMemo(() => new ApiClient(() => token), [token]);

  useEffect(() => {
    if (!token) {
      return;
    }
    void loadData();
  }, [token]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [me, organizations, departments, teams, employees, skills, projects, documents] = await Promise.all([
        api.me(),
        api.organizations(),
        api.departments(),
        api.teams(),
        api.employees(),
        api.skills(),
        api.projects(),
        api.documents()
      ]);
      setUserEmail(me.email);
      setData({
        organizations: organizations.items,
        departments: departments.items,
        teams: teams.items,
        employees: employees.items,
        skills: skills.items,
        projects: projects.items,
        documents: documents.items
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load workspace data");
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    sessionStorage.removeItem("graphsphere.token");
    setToken(null);
    setUserEmail(null);
  }

  if (!token) {
    return <LoginScreen api={api} onLogin={(nextToken) => {
      sessionStorage.setItem("graphsphere.token", nextToken);
      setToken(nextToken);
    }} />;
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <Network size={28} aria-hidden="true" />
          <div>
            <strong>GraphSphere</strong>
            <span>Knowledge Graph</span>
          </div>
        </div>
        <nav aria-label="Primary">
          <TabButton tab="employees" activeTab={activeTab} onSelect={setActiveTab} icon={<Users size={18} />} label="Employees" />
          <TabButton tab="projects" activeTab={activeTab} onSelect={setActiveTab} icon={<Layers3 size={18} />} label="Projects" />
          <TabButton tab="skills" activeTab={activeTab} onSelect={setActiveTab} icon={<ShieldCheck size={18} />} label="Skills" />
          <TabButton tab="organization" activeTab={activeTab} onSelect={setActiveTab} icon={<Building2 size={18} />} label="Org" />
          <TabButton tab="documents" activeTab={activeTab} onSelect={setActiveTab} icon={<FileText size={18} />} label="Docs" />
          <TabButton tab="search" activeTab={activeTab} onSelect={setActiveTab} icon={<Search size={18} />} label="Search" />
          <TabButton tab="graph" activeTab={activeTab} onSelect={setActiveTab} icon={<GitBranch size={18} />} label="Graph" />
        </nav>
        <button className="icon-text subtle" type="button" onClick={logout}>
          <LogOut size={17} aria-hidden="true" />
          Sign out
        </button>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <h1>{tabTitle(activeTab)}</h1>
            <span>{userEmail ?? "Signed in"}</span>
          </div>
          <button className="icon-text" type="button" onClick={() => void loadData()}>
            <Search size={17} aria-hidden="true" />
            Refresh
          </button>
        </header>

        {error ? <div className="alert">{error}</div> : null}
        {loading ? <div className="loading">Loading workspace...</div> : null}

        {activeTab === "employees" ? <EmployeeView data={data} /> : null}
        {activeTab === "projects" ? <ProjectView projects={data.projects} employees={data.employees} /> : null}
        {activeTab === "skills" ? <SkillView skills={data.skills} /> : null}
        {activeTab === "organization" ? <OrganizationView data={data} /> : null}
        {activeTab === "documents" ? <DocumentView api={api} data={data} onChanged={() => void loadData()} /> : null}
        {activeTab === "search" ? <SearchView api={api} /> : null}
        {activeTab === "graph" ? <GraphView api={api} /> : null}
      </section>
    </main>
  );
}

function LoginScreen({ api, onLogin }: { api: ApiClient; onLogin: (token: string) => void }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState("admin@graphsphere.local");
  const [password, setPassword] = useState("ChangeMeLocal123!");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (isRegistering) {
        const result = await api.register(email, password);
        onLogin(result.token);
      } else {
        const result = await api.login(email, password);
        onLogin(result.token);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-screen">
      <form className="login-panel" onSubmit={(event) => void submit(event)}>
        <div className="brand-lockup">
          <Network size={32} aria-hidden="true" />
          <div>
            <strong>GraphSphere</strong>
            <span>Enterprise Knowledge Graph</span>
          </div>
        </div>
        <label>
          Email
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" required />
        </label>
        <label>
          Password
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete={isRegistering ? "new-password" : "current-password"} required minLength={8} />
        </label>
        {error ? <div className="alert">{error}</div> : null}
        <button className="icon-text primary" type="submit" disabled={loading}>
          <KeyRound size={18} aria-hidden="true" />
          {loading ? "Authenticating..." : isRegistering ? "Register account" : "Sign in"}
        </button>
        <div style={{ textAlign: "center", marginTop: "1rem" }}>
          <button type="button" className="subtle" onClick={() => setIsRegistering(!isRegistering)}>
            {isRegistering ? "Already have an account? Sign in" : "Need an account? Register"}
          </button>
        </div>
      </form>
    </main>
  );
}

function TabButton({ tab, activeTab, onSelect, icon, label }: {
  tab: Tab;
  activeTab: Tab;
  onSelect: (tab: Tab) => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button className={tab === activeTab ? "active" : ""} type="button" onClick={() => onSelect(tab)}>
      {icon}
      <span>{label}</span>
    </button>
  );
}

function EmployeeView({ data }: { data: AppData }) {
  return (
    <div className="two-column">
      <div className="table-panel">
        <TableHeader columns={["Name", "Title", "Team", "Location"]} />
        {data.employees.map((employee) => (
          <div className="table-row four" key={employee.id}>
            <strong>{employee.fullName}</strong>
            <span>{employee.title}</span>
            <span>{data.teams.find((team) => team.id === employee.teamId)?.name ?? "Unassigned"}</span>
            <span>{employee.location || "-"}</span>
          </div>
        ))}
        {data.employees.length === 0 ? <EmptyState label="No employees" /> : null}
      </div>
      <RelationshipMap result={null} />
    </div>
  );
}

function ProjectView({ projects, employees }: { projects: Project[]; employees: Employee[] }) {
  return (
    <div className="table-panel">
      <TableHeader columns={["Project", "Domain", "Status", "Contributors"]} />
      {projects.map((project) => (
        <div className="table-row four" key={project.id}>
          <strong>{project.name}</strong>
          <span>{project.domain}</span>
          <span className="status">{project.status}</span>
          <span>{employees.length}</span>
        </div>
      ))}
      {projects.length === 0 ? <EmptyState label="No projects" /> : null}
    </div>
  );
}

function SkillView({ skills }: { skills: Skill[] }) {
  return (
    <div className="skill-grid">
      {skills.map((skill) => (
        <article className="skill-card" key={skill.id}>
          <strong>{skill.name}</strong>
          <span>{skill.category}</span>
          <p>{skill.description}</p>
        </article>
      ))}
      {skills.length === 0 ? <EmptyState label="No skills" /> : null}
    </div>
  );
}

function OrganizationView({ data }: { data: AppData }) {
  return (
    <div className="three-column">
      <ListPanel title="Organizations" items={data.organizations.map((item) => [item.name, item.description])} />
      <ListPanel title="Departments" items={data.departments.map((item) => [item.name, item.description])} />
      <ListPanel title="Teams" items={data.teams.map((item) => [item.name, item.description])} />
    </div>
  );
}

function DocumentView({ api, data, onChanged }: { api: ApiClient; data: AppData; onChanged: () => void }) {
  const [title, setTitle] = useState("Aerial mapping operations note");
  const [content, setContent] = useState("Mapping project notes covering drone telemetry, image processing, and CUDA review input.");
  const [error, setError] = useState<string | null>(null);
  const organizationId = data.organizations[0]?.id;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!organizationId) {
      return;
    }
    try {
      setError(null);
      await api.uploadDocument({ organizationId, title, content, links: [] });
      onChanged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Document upload failed");
    }
  }

  return (
    <div className="two-column">
      <form className="form-panel" onSubmit={(event) => void submit(event)}>
        <label>
          Title
          <input value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label>
          Content
          <textarea value={content} onChange={(event) => setContent(event.target.value)} rows={7} />
        </label>
        {error ? <div className="alert">{error}</div> : null}
        <button className="icon-text primary" type="submit" disabled={!organizationId}>
          <FileText size={17} aria-hidden="true" />
          Upload
        </button>
      </form>
      <div className="table-panel">
        <TableHeader columns={["Document", "Status", "Excerpt"]} />
        {data.documents.map((document) => (
          <div className="table-row three" key={document.id}>
            <strong>{document.title}</strong>
            <span className="status">{document.status}</span>
            <span>{document.textExcerpt || "-"}</span>
          </div>
        ))}
        {data.documents.length === 0 ? <EmptyState label="No documents" /> : null}
      </div>
    </div>
  );
}

function SearchView({ api }: { api: ApiClient }) {
  const [query, setQuery] = useState("drone CUDA");
  const [entityType, setEntityType] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams({ query, page: "1", pageSize: "20" });
    if (entityType) {
      params.set("entityType", entityType);
    }
    try {
      setError(null);
      const response = await api.search(params);
      setResults(response.items);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Search failed");
    }
  }

  return (
    <div className="two-column">
      <form className="form-panel compact" onSubmit={(event) => void submit(event)}>
        <label>
          Query
          <input value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <label>
          Entity
          <select value={entityType} onChange={(event) => setEntityType(event.target.value)}>
            <option value="">All</option>
            <option value="employee">Employees</option>
            <option value="project">Projects</option>
            <option value="skill">Skills</option>
            <option value="document">Documents</option>
          </select>
        </label>
        {error ? <div className="alert">{error}</div> : null}
        <button className="icon-text primary" type="submit">
          <Search size={17} aria-hidden="true" />
          Search
        </button>
      </form>
      <ResultList results={results} />
    </div>
  );
}

function GraphView({ api }: { api: ApiClient }) {
  const [role, setRole] = useState("ML Engineer");
  const [projectDomain, setProjectDomain] = useState("drone");
  const [collaboratorSkill, setCollaboratorSkill] = useState("CUDA");
  const [results, setResults] = useState<ExpertGraphResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams({ role, projectDomain, collaboratorSkill });
    try {
      setError(null);
      setResults(await api.expertQuery(params));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Graph query failed");
    }
  }

  return (
    <div className="graph-workspace">
      <form className="query-bar" onSubmit={(event) => void submit(event)}>
        <label>
          Role
          <input value={role} onChange={(event) => setRole(event.target.value)} />
        </label>
        <label>
          Project domain
          <input value={projectDomain} onChange={(event) => setProjectDomain(event.target.value)} />
        </label>
        <label>
          Collaborator skill
          <input value={collaboratorSkill} onChange={(event) => setCollaboratorSkill(event.target.value)} />
        </label>
        <button className="icon-text primary" type="submit">
          <GitBranch size={17} aria-hidden="true" />
          Run
        </button>
      </form>
      {error ? <div className="alert">{error}</div> : null}
      <RelationshipMap result={results[0] ?? null} />
      <div className="table-panel">
        <TableHeader columns={["Employee", "Project", "Collaborator", "Skill"]} />
        {results.map((result) => (
          <div className="table-row four" key={`${result.employee.id}-${result.project.id}-${result.collaborator.id}`}>
            <strong>{result.employee.fullName}</strong>
            <span>{result.project.name}</span>
            <span>{result.collaborator.fullName}</span>
            <span>{result.collaboratorSkill.name}</span>
          </div>
        ))}
        {results.length === 0 ? <EmptyState label="No graph results" /> : null}
      </div>
    </div>
  );
}

function ResultList({ results }: { results: SearchResult[] }) {
  return (
    <div className="table-panel">
      <TableHeader columns={["Result", "Type", "Excerpt"]} />
      {results.map((result) => (
        <div className="table-row three" key={`${result.entityType}-${result.id}`}>
          <strong>{result.title}</strong>
          <span>{result.entityType}</span>
          <span>{result.excerpt || result.subtitle}</span>
        </div>
      ))}
      {results.length === 0 ? <EmptyState label="No results" /> : null}
    </div>
  );
}

function ListPanel({ title, items }: { title: string; items: Array<[string, string]> }) {
  return (
    <section className="list-panel">
      <h2>{title}</h2>
      {items.map(([name, description]) => (
        <div className="list-row" key={name}>
          <strong>{name}</strong>
          <span>{description}</span>
        </div>
      ))}
      {items.length === 0 ? <EmptyState label={`No ${title.toLowerCase()}`} /> : null}
    </section>
  );
}

function TableHeader({ columns }: { columns: string[] }) {
  return (
    <div className={`table-header cols-${columns.length}`}>
      {columns.map((column) => (
        <span key={column}>{column}</span>
      ))}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return <div className="empty-state">{label}</div>;
}

function tabTitle(tab: Tab): string {
  const labels: Record<Tab, string> = {
    employees: "Employees",
    projects: "Projects",
    skills: "Skills",
    organization: "Organization",
    documents: "Documents",
    search: "Search",
    graph: "Graph Query"
  };
  return labels[tab];
}
