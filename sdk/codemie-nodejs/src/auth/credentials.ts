import { Agent } from "node:https";
import axios, { type AxiosError } from "axios";
import type { KeycloakCredentialsConfig, TokenPayload, TokenResponse } from "./types";

const DEFAULT_CLIENT_ID = "codemie-sdk";

export class KeycloakCredentials {
  private config: KeycloakCredentialsConfig;
  private httpAgent: Agent;
  private cachedToken: string | null = null;
  private tokenExpiresAt = 0;
  private static readonly TOKEN_EXPIRY_BUFFER_MS = 30_000;

  constructor(config: KeycloakCredentialsConfig) {
    this.validateConfigCredentials(config);
    this.config = config;

    this.httpAgent = new Agent({
      rejectUnauthorized: config.verifySSL,
    });
  }

  async getToken(): Promise<string> {
    const now = Date.now();
    if (this.cachedToken && now < this.tokenExpiresAt) {
      return this.cachedToken;
    }

    const { serverUrl, realmName } = this.config;
    const url = `${serverUrl}/realms/${realmName}/protocol/openid-connect/token`;

    let payload: TokenPayload;

    if (this.config.externalToken && this.config.externalIdp) {
      const raw = this.config.externalToken;
      const subjectToken = typeof raw === "function" ? await raw() : raw;
      payload = this.createTokenExchangePayload(subjectToken);
    } else if (this.config.username && this.config.password) {
      payload = this.createResourceOwnerCredentialsPayload();
    } else {
      payload = this.createClientCredentialsPayload();
    }

    try {
      const { data } = await axios.post<TokenResponse>(url, this.createSearchParams(payload), {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        httpsAgent: this.httpAgent,
      });

      this.cachedToken = data.access_token;
      const expiresIn = data.expires_in ?? 300;
      this.tokenExpiresAt = now + expiresIn * 1000 - KeycloakCredentials.TOKEN_EXPIRY_BUFFER_MS;
      return this.cachedToken;
    } catch (err) {
      const axiosErr = err as AxiosError;
      const reason = axiosErr.message ?? String(err);
      throw new Error(`Cannot connect to Keycloak at ${url}: ${reason}`);
    }
  }

  clearCache(): void {
    this.cachedToken = null;
    this.tokenExpiresAt = 0;
  }

  private createTokenExchangePayload(subjectToken: string): TokenPayload {
    const { clientId, clientSecret, externalIdp } = this.config;

    return {
      grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
      client_id: clientId || DEFAULT_CLIENT_ID,
      client_secret: clientSecret,
      subject_token: subjectToken,
      subject_token_type: "urn:ietf:params:oauth:token-type:access_token",
      subject_issuer: externalIdp,
      requested_token_type: "urn:ietf:params:oauth:token-type:access_token",
    };
  }

  private createResourceOwnerCredentialsPayload(): TokenPayload {
    const { username, password, clientId } = this.config;

    return {
      grant_type: "password",
      username,
      password,
      client_id: clientId || DEFAULT_CLIENT_ID,
    };
  }

  private createClientCredentialsPayload(): TokenPayload {
    const { clientId, clientSecret } = this.config;

    return {
      grant_type: "client_credentials",
      client_id: clientId || DEFAULT_CLIENT_ID,
      client_secret: clientSecret,
    };
  }

  private createSearchParams(payload: Record<string, string | undefined>): URLSearchParams {
    return new URLSearchParams(
      Object.fromEntries(Object.entries(payload).filter(([_, v]) => v !== undefined)) as Record<
        string,
        string
      >,
    );
  }

  private validateConfigCredentials(config: KeycloakCredentialsConfig): void {
    const hasClientCredentials = !!(config.clientId && config.clientSecret);
    const hasUserCredentials = !!(config.username && config.password);
    const hasExternalTokenCredentials = !!(config.externalToken && config.externalIdp);

    if (!hasClientCredentials && !hasUserCredentials && !hasExternalTokenCredentials) {
      throw new Error(
        "Either client credentials (clientId, clientSecret), " +
          "user credentials (username, password), " +
          "or external token credentials (externalToken, externalIdp) must be provided",
      );
    }
  }
}
