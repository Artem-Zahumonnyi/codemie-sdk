import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import axios from "axios";
import { KeycloakCredentials } from "../../../src/auth/credentials";

jest.mock("axios");
const mockedAxios = jest.mocked(axios);

describe("KeycloakCredentials", () => {
  const mockCommonConfig = {
    serverUrl: "https://auth.example.com",
    realmName: "test-realm",
    clientId: "test-client",
    clientSecret: "test-secret",
    username: "test-user",
    password: "test-password",
    verifySSL: true,
  };
  const mockTokenData = {
    access_token: "mock-access-token",
    expires_in: 300,
    refresh_token: "mock-refresh-token",
    refresh_expires_in: 1800,
  };
  const mockCommonSuccessResponse = {
    data: mockTokenData,
  };
  const mockCommonErrorResponse = {
    response: {
      data: {
        error: "invalid_grant",
        error_description: "Invalid user credentials",
      },
    },
  };

  let credentials: KeycloakCredentials;

  beforeEach(() => {
    credentials = new KeycloakCredentials(mockCommonConfig);
    jest.clearAllMocks();
  });

  describe("getToken", () => {
    it("should make a request to keycloak server and return access token", async () => {
      mockedAxios.post.mockResolvedValueOnce(mockCommonSuccessResponse);

      const token = await credentials.getToken();

      expect(token).toBe(mockTokenData.access_token);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `${mockCommonConfig.serverUrl}/realms/${mockCommonConfig.realmName}/protocol/openid-connect/token`,
        expect.any(URLSearchParams),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          httpsAgent: expect.anything(),
        },
      );
    });

    it("should use client credentials when username/password not provided", async () => {
      const credentialsWithoutUser = new KeycloakCredentials({
        ...mockCommonConfig,
        username: undefined,
        password: undefined,
      });
      mockedAxios.post.mockResolvedValueOnce(mockCommonSuccessResponse);

      await credentialsWithoutUser.getToken();

      const postCall = mockedAxios.post.mock.calls[0];
      const params = new URLSearchParams(postCall[1] as string);
      expect(params.get("grant_type")).toBe("client_credentials");
      expect(params.get("client_id")).toBe(mockCommonConfig.clientId);
      expect(params.get("client_secret")).toBe(mockCommonConfig.clientSecret);
    });

    it("should use password grant when username/password provided", async () => {
      mockedAxios.post.mockResolvedValueOnce(mockCommonSuccessResponse);

      await credentials.getToken();

      const postCall = mockedAxios.post.mock.calls[0];
      const params = new URLSearchParams(postCall[1] as string);

      expect(params.get("grant_type")).toBe("password");
      expect(params.get("username")).toBe(mockCommonConfig.username);
      expect(params.get("password")).toBe(mockCommonConfig.password);
    });

    it("should throw error with invalid credentials", async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error("Invalid credentials"));

      await expect(credentials.getToken()).rejects.toThrow();
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    });

    it("should use token exchange grant when externalToken and externalIdp are provided", async () => {
      const externalTokenCredentials = new KeycloakCredentials({
        serverUrl: "https://auth.example.com",
        realmName: "test-realm",
        clientId: "test-client",
        clientSecret: "test-secret",
        externalToken: "external-access-token",
        externalIdp: "external-idp-alias",
        verifySSL: true,
      });
      mockedAxios.post.mockResolvedValueOnce(mockCommonSuccessResponse);

      const token = await externalTokenCredentials.getToken();

      expect(token).toBe(mockTokenData.access_token);
      const postCall = mockedAxios.post.mock.calls[0];
      const params = new URLSearchParams(postCall[1] as string);
      expect(params.get("grant_type")).toBe("urn:ietf:params:oauth:grant-type:token-exchange");
      expect(params.get("subject_token")).toBe("external-access-token");
      expect(params.get("subject_issuer")).toBe("external-idp-alias");
      expect(params.get("requested_token_type")).toBe(
        "urn:ietf:params:oauth:token-type:access_token",
      );
      expect(params.get("client_id")).toBe("test-client");
      expect(params.get("client_secret")).toBe("test-secret");
    });

    it("should accept a callable externalToken and invoke it on each Keycloak request", async () => {
      let callCount = 0;
      const externalTokenGetter = jest.fn(async () => `ext-token-${++callCount}`);

      const creds = new KeycloakCredentials({
        serverUrl: "https://auth.example.com",
        realmName: "test-realm",
        clientId: "test-client",
        clientSecret: "test-secret",
        externalToken: externalTokenGetter,
        externalIdp: "external-idp-alias",
        verifySSL: true,
      });

      mockedAxios.post.mockResolvedValue(mockCommonSuccessResponse);
      jest.useFakeTimers();

      try {
        await creds.getToken();
        jest.advanceTimersByTime(271_000); // expire the cached CodeMie token
        await creds.getToken();
      } finally {
        jest.useRealTimers();
      }

      expect(externalTokenGetter).toHaveBeenCalledTimes(2);
      const firstSubject = new URLSearchParams(mockedAxios.post.mock.calls[0][1] as string).get(
        "subject_token",
      );
      const secondSubject = new URLSearchParams(mockedAxios.post.mock.calls[1][1] as string).get(
        "subject_token",
      );
      expect(firstSubject).toBe("ext-token-1");
      expect(secondSubject).toBe("ext-token-2");
    });

    it("should prefer token exchange over password grant when externalToken is provided", async () => {
      const mixedCredentials = new KeycloakCredentials({
        serverUrl: "https://auth.example.com",
        realmName: "test-realm",
        clientId: "test-client",
        clientSecret: "test-secret",
        username: "user",
        password: "pass",
        externalToken: "external-access-token",
        externalIdp: "external-idp-alias",
        verifySSL: true,
      });
      mockedAxios.post.mockResolvedValueOnce(mockCommonSuccessResponse);

      await mixedCredentials.getToken();

      const postCall = mockedAxios.post.mock.calls[0];
      const params = new URLSearchParams(postCall[1] as string);
      expect(params.get("grant_type")).toBe("urn:ietf:params:oauth:grant-type:token-exchange");
    });

    it("should include subject_token_type in token exchange payload", async () => {
      const externalCreds = new KeycloakCredentials({
        serverUrl: "https://auth.example.com",
        realmName: "test-realm",
        clientId: "test-client",
        clientSecret: "test-secret",
        externalToken: "ext-tok",
        externalIdp: "epam-idp",
        verifySSL: true,
      });
      mockedAxios.post.mockResolvedValueOnce(mockCommonSuccessResponse);

      await externalCreds.getToken();

      const postCall = mockedAxios.post.mock.calls[0];
      const params = new URLSearchParams(postCall[1] as string);
      expect(params.get("subject_token_type")).toBe(
        "urn:ietf:params:oauth:token-type:access_token",
      );
    });

    it("should force a fresh Keycloak request after clearCache() even within TTL", async () => {
      mockedAxios.post.mockResolvedValue(mockCommonSuccessResponse);

      await credentials.getToken();
      credentials.clearCache();
      await credentials.getToken();

      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    });

    it("should return cached token on second call within expiry window", async () => {
      mockedAxios.post.mockResolvedValue(mockCommonSuccessResponse);

      const t1 = await credentials.getToken();
      const t2 = await credentials.getToken();

      expect(t1).toBe(mockTokenData.access_token);
      expect(t2).toBe(mockTokenData.access_token);
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    });

    it("should re-fetch token after expiry window elapses", async () => {
      mockedAxios.post.mockResolvedValue(mockCommonSuccessResponse);
      jest.useFakeTimers();

      try {
        await credentials.getToken();
        // Advance past (300s - 30s buffer) * 1000ms = 270,001ms
        jest.advanceTimersByTime(271_000);
        await credentials.getToken();
      } finally {
        jest.useRealTimers();
      }

      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    });
  });

  describe("validation", () => {
    it("should throw when no credentials are provided", () => {
      expect(
        () =>
          new KeycloakCredentials({
            serverUrl: "https://auth.example.com",
            realmName: "test-realm",
          }),
      ).toThrow(
        "Either client credentials (clientId, clientSecret), " +
          "user credentials (username, password), " +
          "or external token credentials (externalToken, externalIdp) must be provided",
      );
    });

    it("should not throw when only externalToken and externalIdp are provided", () => {
      expect(
        () =>
          new KeycloakCredentials({
            serverUrl: "https://auth.example.com",
            realmName: "test-realm",
            externalToken: "ext-token",
            externalIdp: "ext-idp",
          }),
      ).not.toThrow();
    });
  });
});
