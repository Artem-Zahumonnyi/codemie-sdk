import { jest, describe, expect, it, beforeEach } from "@jest/globals";
import { UserService } from "../../../src/services/user";
import { ApiRequestHandler } from "../../../src/utils/http";
import { AboutUserResponse, UserData } from "../../../src/models/user";
import { ApiError } from "../../../src/exceptions";

jest.mock("../../../src/utils/http", () => ({
  ApiRequestHandler: jest.fn(),
}));

describe("UserService", () => {
  const domain = "https://api.example.com";
  const token = "test-token";
  let service: UserService;
  let apiHandler: jest.Mocked<ApiRequestHandler>;

  const mockUser: AboutUserResponse = {
    user_id: "123",
    username: "testuser",
    name: "Test User",
    is_admin: false,
    applications: ["app1", "app2"],
    applications_admin: [],
    picture: "https://example.com/avatar.jpg",
    knowledge_bases: ["kb1"],
    email: ""
  };

  const mockUserData: UserData = {
    id: "123",
    user_id: "123",
    date: "2023-01-01T00:00:00Z",
    update_date: "2023-01-02T00:00:00Z",
  };

  beforeEach(() => {
    apiHandler = {
      client: {} as any,
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      stream: jest.fn(),
      request: jest.fn(),
      throwIfResponseError: jest.fn(),
    } as unknown as jest.Mocked<ApiRequestHandler>;

    service = new UserService({ apiDomain: domain, token });
    (ApiRequestHandler as jest.Mock).mockImplementation(() => apiHandler);
  });

  describe("constructor", () => {
    it("should initialize with default SSL verification", () => {
      new UserService({ apiDomain: domain, token });

      expect(ApiRequestHandler).toHaveBeenCalledWith({ apiDomain: domain, token });
    });

    it("should initialize with SSL verification disabled", () => {
      new UserService({ apiDomain: domain, token, verifySSL: false });

      expect(ApiRequestHandler).toHaveBeenCalledWith({
        apiDomain: domain,
        token,
        verifySSL: false,
      });
    });
  });

  describe("aboutMe", () => {
    it("should get current user profile", async () => {
      apiHandler.get.mockResolvedValue(mockUser);

      const result = await service.aboutMe();

      expect(apiHandler.get).toHaveBeenCalledWith("/v1/user");
      expect(result).toEqual({
        user_id: mockUser.user_id,
        name: mockUser.name,
        username: mockUser.username,
        is_admin: mockUser.is_admin,
        applications: mockUser.applications,
        applications_admin: mockUser.applications_admin,
        picture: mockUser.picture,
        knowledge_bases: mockUser.knowledge_bases,
        email: ""
      });
    });

    it("should handle API errors", async () => {
      const error = new ApiError("Failed to fetch user profile");
      apiHandler.get.mockRejectedValue(error);

      await expect(service.aboutMe()).rejects.toThrow(error);
    });
  });

  describe("getData", () => {
    it("should get user data", async () => {
      apiHandler.get.mockResolvedValue(mockUserData);

      const result = await service.getData();

      expect(apiHandler.get).toHaveBeenCalledWith("/v1/user/data");
      expect(result).toEqual(mockUserData);
    });

    it("should handle minimal user data", async () => {
      const minimalUserData: UserData = {
        user_id: "123",
      };

      apiHandler.get.mockResolvedValue(minimalUserData);

      const result = await service.getData();
      expect(result).toEqual(minimalUserData);
    });

    it("should handle empty user data", async () => {
      const emptyUserData: UserData = {};

      apiHandler.get.mockResolvedValue(emptyUserData);

      const result = await service.getData();
      expect(result).toEqual(emptyUserData);
    });

    it("should handle API errors", async () => {
      const error = new ApiError("Failed to fetch user data");
      apiHandler.get.mockRejectedValue(error);

      await expect(service.getData()).rejects.toThrow(error);
    });
  });
});
