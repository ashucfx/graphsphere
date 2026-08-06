export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly fieldErrors?: Record<string, string[]>;

  public constructor(
    statusCode: number,
    code: string,
    message: string,
    fieldErrors?: Record<string, string[]>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

export const badRequest = (message: string, fieldErrors?: Record<string, string[]>) =>
  new AppError(400, "BAD_REQUEST", message, fieldErrors);

export const unauthorized = (message = "Authentication is required") =>
  new AppError(401, "UNAUTHORIZED", message);

export const forbidden = (message = "The authenticated user is not allowed to perform this action") =>
  new AppError(403, "FORBIDDEN", message);

export const notFound = (resource: string) => new AppError(404, "NOT_FOUND", `${resource} was not found`);

export const conflict = (message: string) => new AppError(409, "CONFLICT", message);

export const dependencyUnavailable = (dependency: string) =>
  new AppError(503, "DEPENDENCY_UNAVAILABLE", `${dependency} is unavailable`);
