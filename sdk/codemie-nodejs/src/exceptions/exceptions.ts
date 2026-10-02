import type { AnyJson } from "../models/common";

export class CodeMieError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CodeMieError";
  }
}

export class ApiError extends CodeMieError {
  statusCode?: number;
  response?: AnyJson;

  constructor(message: string, statusCode?: number, response?: AnyJson) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.response = response;
  }
}

export class NotFoundError extends ApiError {
  constructor(resourceType: string, resourceId: string) {
    super(`${resourceType} with ${resourceId} not found`, 404);
    this.name = "NotFoundError";
  }
}
