import { describe, expect, it, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { createApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import type { ObjectStorage } from "../src/storage/objectStorage.js";

class TestObjectStorage implements ObjectStorage {
  private readonly values = new Map<string, string>();

  public async putText(key: string, content: string): Promise<void> {
    this.values.set(key, content);
  }

  public async getText(key: string): Promise<string> {
    const value = this.values.get(key);
    if (!value) {
      throw new Error("Object not found");
    }
    return value;
  }
}

describe("GraphSphere API", () => {
  let app: FastifyInstance;
  let token: string;

  beforeAll(async () => {
    app = await createApp({
      config: loadConfig({
        NODE_ENV: "test",
        LOG_LEVEL: "silent",
        JWT_SECRET: "test-secret-with-at-least-twenty-four-characters",
        ADMIN_EMAIL: "admin@graphsphere.local",
        ADMIN_PASSWORD: "ChangeMeLocal123!",
        CORS_ORIGIN: "http://localhost:5173"
      }),
      objectStorage: new TestObjectStorage()
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it("reports liveness without authentication", async () => {
    const response = await app.inject({ method: "GET", url: "/health/live" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ status: "ok", service: "graphsphere-api" });
  });

  it("registers a new user successfully", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        email: "newuser@graphsphere.local",
        password: "SuperSecretPassword123!",
        role: "VIEWER"
      }
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toHaveProperty("token");
    expect(body.user.email).toBe("newuser@graphsphere.local");
    expect(body.user.role).toBe("VIEWER");

    // verify the token works for /auth/me
    const meResponse = await app.inject({
      method: "GET",
      url: "/auth/me",
      headers: { authorization: `Bearer ${body.token}` }
    });
    expect(meResponse.statusCode).toBe(200);
    expect(meResponse.json().email).toBe("newuser@graphsphere.local");
  });

  it("rejects protected resources without a token", async () => {
    const response = await app.inject({ method: "GET", url: "/employees" });
    expect(response.statusCode).toBe(401);
  });

  it("authenticates the seeded administrator", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: {
        email: "admin@graphsphere.local",
        password: "ChangeMeLocal123!"
      }
    });
    expect(response.statusCode).toBe(200);
    const body = response.json<{ token: string; user: { email: string; role: string } }>();
    expect(body.user).toMatchObject({ email: "admin@graphsphere.local", role: "ADMIN" });
    token = body.token;
  });

  it("lists seeded employees through a protected route", async () => {
    const response = await authed("GET", "/employees");
    expect(response.statusCode).toBe(200);
    const body = response.json<{ items: Array<{ fullName: string; title: string }>; total: number }>();
    expect(body.total).toBeGreaterThanOrEqual(4);
    expect(body.items).toEqual(expect.arrayContaining([expect.objectContaining({ fullName: "Maya Rao", title: "ML Engineer" })]));
  });

  it("executes the required relationship traversal pattern", async () => {
    const response = await authed(
      "GET",
      "/graph/query/experts?role=ML%20Engineer&projectDomain=drone&collaboratorSkill=CUDA"
    );
    expect(response.statusCode).toBe(200);
    const body = response.json<Array<{ employee: { fullName: string }; collaboratorSkill: { name: string }; path: unknown[] }>>();
    expect(body).toHaveLength(1);
    expect(body[0]).toMatchObject({
      employee: { fullName: "Maya Rao" },
      collaboratorSkill: { name: "CUDA" }
    });
    expect(body[0]?.path).toHaveLength(4);
  });

  it("searches indexed entity content with relevance ordering", async () => {
    const response = await authed("GET", "/search?query=CUDA&page=1&pageSize=10");
    expect(response.statusCode).toBe(200);
    const body = response.json<{ items: Array<{ title: string; entityType: string }> }>();
    expect(body.items).toEqual(expect.arrayContaining([expect.objectContaining({ title: "CUDA", entityType: "skill" })]));
  });

  it("returns validation errors for invalid input", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/employees",
      headers: authHeaders(),
      payload: {
        fullName: ""
      }
    });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ code: "BAD_REQUEST" });
  });

  it("returns conflict for duplicate organization names", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/organizations",
      headers: authHeaders(),
      payload: {
        name: "Northstar Systems",
        description: "Duplicate"
      }
    });
    expect(response.statusCode).toBe(409);
  });

  it("uploads and processes a document through the outbox path", async () => {
    const organizations = await authed("GET", "/organizations");
    const organizationId = organizations.json<{ items: Array<{ id: string }> }>().items[0]?.id;
    expect(organizationId).toBeDefined();

    const upload = await app.inject({
      method: "POST",
      url: "/documents",
      headers: authHeaders(),
      payload: {
        organizationId,
        title: "Compute review note",
        mimeType: "text/plain",
        content: "The mapping team reviewed CUDA processing options for drone imagery.",
        links: []
      }
    });
    expect(upload.statusCode).toBe(201);
    const documentId = upload.json<{ id: string }>().id;

    await (app as any).context.documentProcessor.processPending(100);
    const document = await authed("GET", `/documents/${documentId}`);
    expect(document.statusCode).toBe(200);
    expect(document.json()).toMatchObject({
      id: documentId,
      status: "INDEXED"
    });
  });

  async function authed(method: "GET" | "POST", url: string) {
    return app.inject({ method, url, headers: authHeaders() });
  }

  function authHeaders() {
    return {
      authorization: `Bearer ${token}`
    };
  }
});

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
