import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ZodError, type ZodType } from "zod";
import { AppError, badRequest } from "./errors.js";

export function parseBody<T>(schema: ZodType<T>, request: FastifyRequest): T {
  const result = schema.safeParse(request.body);
  if (!result.success) {
    throw toBadRequest(result.error);
  }
  return result.data;
}

export function parseQuery<T>(schema: ZodType<T>, request: FastifyRequest): T {
  const result = schema.safeParse(request.query);
  if (!result.success) {
    throw toBadRequest(result.error);
  }
  return result.data;
}

export function parseParams<T>(schema: ZodType<T>, request: FastifyRequest): T {
  const result = schema.safeParse(request.params);
  if (!result.success) {
    throw toBadRequest(result.error);
  }
  return result.data;
}

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error, request, reply) => {
    const requestId = request.id;

    if (error instanceof AppError) {
      void reply.status(error.statusCode).send({
        code: error.code,
        message: error.message,
        requestId,
        fieldErrors: error.fieldErrors
      });
      return;
    }

    if (error instanceof ZodError) {
      const formatted = toBadRequest(error);
      void reply.status(formatted.statusCode).send({
        code: formatted.code,
        message: formatted.message,
        requestId,
        fieldErrors: formatted.fieldErrors
      });
      return;
    }

    request.log.error({ err: error }, "Unhandled request error");
    void reply.status(500).send({
      code: "INTERNAL_ERROR",
      message: "The request could not be completed",
      requestId
    });
  });
}

export function sendCreated<T>(reply: FastifyReply, body: T): void {
  void reply.status(201).send(body);
}

function toBadRequest(error: ZodError): AppError {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".") || "request";
    fieldErrors[path] = [...(fieldErrors[path] ?? []), issue.message];
  }
  return badRequest("Request validation failed", fieldErrors);
}
