import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  LOG_LEVEL: z.string().default("info"),
  API_HOST: z.string().default("0.0.0.0"),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  JWT_SECRET: z.string().min(24).default("local-development-secret-change-before-use"),
  JWT_ISSUER: z.string().default("graphsphere-local"),
  TOKEN_TTL_SECONDS: z.coerce.number().int().min(60).default(3600),
  ADMIN_EMAIL: z.string().email().default("admin@graphsphere.local"),
  ADMIN_PASSWORD: z.string().min(8).default("ChangeMeLocal123!"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(120),
  RATE_LIMIT_WINDOW: z.string().default("1 minute"),
  DATABASE_URL: z.string().optional(),
  NEO4J_URI: z.string().optional(),
  NEO4J_USER: z.string().optional(),
  NEO4J_PASSWORD: z.string().optional(),
  OPENSEARCH_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),
  OBJECT_STORAGE_ENDPOINT: z.string().optional(),
  OBJECT_STORAGE_REGION: z.string().default("us-east-1"),
  OBJECT_STORAGE_BUCKET: z.string().default("graphsphere-documents"),
  OBJECT_STORAGE_ACCESS_KEY: z.string().optional(),
  OBJECT_STORAGE_SECRET_KEY: z.string().optional(),
  OBJECT_STORAGE_FORCE_PATH_STYLE: z.coerce.boolean().default(true)
});

export type AppConfig = z.infer<typeof envSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid environment configuration: ${message}`);
  }

  if (parsed.data.NODE_ENV === "production" && parsed.data.JWT_SECRET.includes("development")) {
    throw new Error("JWT_SECRET must be replaced for production startup");
  }

  return parsed.data;
}
