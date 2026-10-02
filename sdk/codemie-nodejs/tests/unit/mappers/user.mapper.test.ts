import { describe, it, expect } from "@jest/globals";
import { UserMapper } from "../../../src/mappers/user.mapper";
import type { AboutUserResponse } from "../../../src/models";

describe("UserMapper", () => {
  describe("mapAboutUserResponse", () => {
    it("should correctly map all user fields", () => {
      // Arrange
      const apiResponse: AboutUserResponse = {
        user_id: "user-123",
        name: "John Doe",
        username: "johndoe",
        is_admin: true,
        applications: ["app1", "app2"],
        applications_admin: ["app1"],
        picture: "https://example.com/avatar.jpg",
        knowledge_bases: ["kb1", "kb2"],
        email: "",
      };

      // Act
      const result = UserMapper.mapAboutUserResponse(apiResponse);

      // Assert
      expect(result).toEqual({
        user_id: "user-123",
        name: "John Doe",
        username: "johndoe",
        is_admin: true,
        applications: ["app1", "app2"],
        applications_admin: ["app1"],
        picture: "https://example.com/avatar.jpg",
        knowledge_bases: ["kb1", "kb2"],
        email: ""
      });
    });

    it("should handle empty values", () => {
      // Arrange
      const apiResponse: AboutUserResponse = {
        user_id: "user-123",
        name: "John Doe",
        username: "johndoe",
        is_admin: false,
        applications: [],
        applications_admin: [],
        picture: "",
        knowledge_bases: [],
        email: "",
      };

      // Act
      const result = UserMapper.mapAboutUserResponse(apiResponse);

      // Assert
      expect(result).toEqual({
        user_id: "user-123",
        name: "John Doe",
        username: "johndoe",
        is_admin: false,
        applications: [],
        applications_admin: [],
        picture: "",
        knowledge_bases: [],
        email: ""
      });
    });

    it("should preserve empty values", () => {
      // Arrange
      const apiResponse: AboutUserResponse = {
        user_id: "user-123",
        name: "",
        username: "johndoe",
        is_admin: true,
        applications: [],
        applications_admin: [],
        picture: "",
        knowledge_bases: [],
        email: "",
      };

      // Act
      const result = UserMapper.mapAboutUserResponse(apiResponse);

      // Assert
      expect(result).toEqual({
        user_id: "user-123",
        name: "",
        username: "johndoe",
        is_admin: true,
        applications: [],
        applications_admin: [],
        picture: "",
        knowledge_bases: [],
        email: ""
      });
    });
  });
});
