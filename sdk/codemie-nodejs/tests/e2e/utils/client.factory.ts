import { CodeMieClient } from "../../../src/client/client";

export async function createCodemieClient(): Promise<CodeMieClient> {
  const client = new CodeMieClient({
    auth_server_url: process.env.AUTH_SERVER_URL as string,
    auth_realm_name: process.env.AUTH_REALM_NAME as string,
    codemie_api_domain: process.env.CODEMIE_API_DOMAIN as string,
    auth_client_id: process.env.AUTH_CLIENT_ID,
    auth_client_secret: process.env.AUTH_CLIENT_SECRET,
    username: process.env.USERNAME,
    password: process.env.PASSWORD,
  });
  await client.initialize();
  return client;
}
