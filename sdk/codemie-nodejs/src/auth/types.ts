export type TokenPayload = Record<string, string | undefined> & {
  grant_type: string;
  client_id: string;
  client_secret?: string;
  username?: string;
  password?: string;
  subject_token?: string;
  subject_token_type?: string;
  subject_issuer?: string;
  requested_token_type?: string;
};

export type TokenResponse = {
  access_token: string;
  expires_in?: number;
};

export type KeycloakCredentialsConfig = {
  serverUrl: string;
  realmName: string;
  clientId?: string;
  clientSecret?: string;
  username?: string;
  password?: string;
  verifySSL?: boolean;
  externalToken?: string | (() => Promise<string>);
  externalIdp?: string;
};
