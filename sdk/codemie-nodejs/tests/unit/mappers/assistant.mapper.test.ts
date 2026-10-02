import { describe, it, expect } from "@jest/globals";
import { AssistantMapper } from "../../../src/mappers/assistant.mapper";
import type { BaseModelApiResponse } from "../../../src/models";

describe("AssistantMapper", () => {
  describe("mapBaseModelApiResponse", () => {
    it("should correctly map all fields from API response", () => {
      // Arrange
      const apiResponse: BaseModelApiResponse = {
        generated: "Test output",
        timeElapsed: 1.23,
        tokensUsed: 100,
        thoughts: [{ step: "Thinking process" }],
        taskId: "task-123",
      };

      // Act
      const result = AssistantMapper.mapBaseModelApiResponse(apiResponse);

      // Assert
      expect(result).toEqual({
        generated: "Test output",
        time_elapsed: 1.23,
        tokens_used: 100,
        thoughts: [{ step: "Thinking process" }],
        task_id: "task-123",
      });
    });

    it("should omit undefined fields", () => {
      // Arrange
      const apiResponse: BaseModelApiResponse = {
        generated: "Test output",
        timeElapsed: undefined,
        tokensUsed: 100,
        thoughts: undefined,
        taskId: "task-123",
      };

      // Act
      const result = AssistantMapper.mapBaseModelApiResponse(apiResponse);

      // Assert
      expect(result).toEqual({
        generated: "Test output",
        tokens_used: 100,
        task_id: "task-123",
      });
    });

    it("should handle empty response", () => {
      // Arrange
      const apiResponse: BaseModelApiResponse = {
        generated: "",
        timeElapsed: 0,
        tokensUsed: 0,
        thoughts: [],
        taskId: "",
      };

      // Act
      const result = AssistantMapper.mapBaseModelApiResponse(apiResponse);

      // Assert
      expect(result).toEqual({
        generated: "",
        time_elapsed: 0,
        tokens_used: 0,
        thoughts: [],
        task_id: "",
      });
    });
  });
});
