import { CodeMieError, ApiError, NotFoundError } from "../../../src/exceptions/exceptions";
import { describe, expect, it } from "@jest/globals";

describe("Exceptions", () => {
  describe("CodeMieError", () => {
    it("should create a basic error with custom message", () => {
      const message = "Test error message";
      const error = new CodeMieError(message);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(CodeMieError);
      expect(error.message).toBe(message);
      expect(error.name).toBe("CodeMieError");
    });
  });

  describe("ApiError", () => {
    it("should create an API error with message and status code", () => {
      const message = "API error occurred";
      const statusCode = 400;
      const error = new ApiError(message, statusCode);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(CodeMieError);
      expect(error).toBeInstanceOf(ApiError);
      expect(error.message).toBe(message);
      expect(error.name).toBe("ApiError");
      expect(error.statusCode).toBe(statusCode);
    });

    it("should create an API error with response data", () => {
      const message = "API error occurred";
      const statusCode = 400;
      const response = {
        error: "Invalid input",
        details: ["Field is required"],
      };
      const error = new ApiError(message, statusCode, response);

      expect(error.response).toEqual(response);
      expect(error.statusCode).toBe(statusCode);
    });

    it("should create an API error without status code and response", () => {
      const message = "API error occurred";
      const error = new ApiError(message);

      expect(error.message).toBe(message);
      expect(error.statusCode).toBeUndefined();
      expect(error.response).toBeUndefined();
    });
  });

  describe("NotFoundError", () => {
    it("should create a not found error with resource type and ID", () => {
      const resourceType = "User";
      const resourceId = "123";
      const error = new NotFoundError(resourceType, resourceId);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(CodeMieError);
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toBeInstanceOf(NotFoundError);
      expect(error.message).toBe("User with 123 not found");
      expect(error.name).toBe("NotFoundError");
      expect(error.statusCode).toBe(404);
    });

    it("should properly format error message with different resource types", () => {
      const testCases = [
        {
          type: "Task",
          id: "task-123",
          expected: "Task with task-123 not found",
        },
        {
          type: "Assistant",
          id: "ast-456",
          expected: "Assistant with ast-456 not found",
        },
        {
          type: "Workflow",
          id: "wf-789",
          expected: "Workflow with wf-789 not found",
        },
      ];

      for (const { type, id, expected } of testCases) {
        const error = new NotFoundError(type, id);
        expect(error.message).toBe(expected);
        expect(error.statusCode).toBe(404);
      }
    });
  });
});
