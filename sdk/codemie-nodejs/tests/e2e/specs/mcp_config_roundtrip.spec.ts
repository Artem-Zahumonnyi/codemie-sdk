import { describe, beforeAll, afterAll, test, expect } from "@jest/globals";
import type { CodeMieClient } from "../../../src/client/client";
import type { AssistantCreateParams } from "../../../src/schemas/assistant";
import type { MCPServerDetails } from "../../../src/models/assistant";
import { createCodemieClient } from "../utils/client.factory";
import { SECOND, sleep } from "../utils/time";

const projectName = process.env.PROJECT_NAME as string;
const llmModelType = process.env.E2E_LLM_MODEL ?? "gpt-4o";
const assistantName = "[E2E] MCP config round-trip";
const mcpConfigFixtureName = "[E2E] MCP config round-trip fixture";

type McpConfig = { id: string; name?: string };

/** The Node SDK has no mcp-configs service yet, so talk to the endpoint directly. */
async function mcpConfigsRequest(
  client: CodeMieClient,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const token = await client.getToken();
  const domain = (process.env.CODEMIE_API_DOMAIN as string).replace(/\/$/, "");
  return fetch(`${domain}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

/**
 * Create the saved MCP configuration this spec binds to, the way assistant_with_jira.spec.ts
 * creates its own integration. Returns null when the account may not manage MCP configs, so the
 * caller can fall back to an existing one.
 */
async function createMcpConfig(client: CodeMieClient): Promise<McpConfig | null> {
  const response = await mcpConfigsRequest(client, "/v1/mcp-configs", {
    method: "POST",
    body: JSON.stringify({
      name: mcpConfigFixtureName,
      description: "Fixture for the saved-config round-trip spec",
      config: { url: "https://mcp.example.com/mcp", type: "streamable-http" },
      is_public: false,
    }),
  });

  if (response.status === 401 || response.status === 403) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`POST /v1/mcp-configs failed: ${response.status} ${await response.text()}`);
  }
  return (await response.json()) as McpConfig;
}

/** Returns an empty list when the account may not manage MCP configs, so the caller can say so. */
async function listMcpConfigs(client: CodeMieClient): Promise<McpConfig[]> {
  const response = await mcpConfigsRequest(client, "/v1/mcp-configs?page=0&per_page=20");
  if (response.status === 401 || response.status === 403) {
    return [];
  }
  if (!response.ok) {
    throw new Error(`GET /v1/mcp-configs failed: ${response.status} ${await response.text()}`);
  }
  // The endpoint answers { data, total, page, per_page }.
  const body = (await response.json()) as { data?: McpConfig[] };
  return Array.isArray(body) ? body : (body.data ?? []);
}

async function deleteMcpConfig(client: CodeMieClient, configId: string): Promise<void> {
  await mcpConfigsRequest(client, `/v1/mcp-configs/${configId}`, { method: "DELETE" });
}

function findMcpServer(mcpServers: MCPServerDetails[] | undefined): MCPServerDetails {
  const server = (mcpServers ?? []).find((s) => s.name === "e2e-saved-config-mcp");
  expect(server).toBeDefined();
  return server as MCPServerDetails;
}

/**
 * Regression: an MCP server bound to a saved platform MCP configuration
 * must keep its mcp_config_id (and the companion saved-config fields) across create
 * and across an update that touches an unrelated field.
 */
describe("MCP saved-config round-trip", () => {
  let client: CodeMieClient;
  let mcpConfigId: string | null = null;
  let createdMcpConfigId: string | null = null;
  let assistantId: string | null = null;

  beforeAll(async () => {
    client = await createCodemieClient();

    // Prefer an explicitly pinned config, then one this spec creates for itself, and only fall
    // back to whatever the environment already has when the account cannot create one.
    if (process.env.MCP_CONFIG_ID) {
      mcpConfigId = process.env.MCP_CONFIG_ID;
    } else {
      // One listing serves both purposes, and it stays empty rather than throwing when the account
      // may not manage MCP configs - otherwise the reuse path below could never be reached.
      const existingConfigs = await listMcpConfigs(client);

      // A crashed run can leave its fixture behind; drop it before making a new one.
      for (const stale of existingConfigs.filter((c) => c.name === mcpConfigFixtureName)) {
        await deleteMcpConfig(client, stale.id);
      }

      const created = await createMcpConfig(client);
      if (created) {
        createdMcpConfigId = created.id;
        mcpConfigId = created.id;
      } else {
        const reusable = existingConfigs.find((c) => c.name !== mcpConfigFixtureName);
        mcpConfigId = reusable?.id ?? null;
        if (reusable) {
          console.log(`Reusing saved MCP config ${reusable.name} (${reusable.id})`);
        }
      }
    }

    // Drop leftovers from an interrupted run, so the find-by-name below cannot hit a duplicate.
    const existing = await client.assistants.list();
    for (const assistant of existing.filter((a) => a.name === assistantName)) {
      await client.assistants.delete(assistant.id);
    }
  });

  afterAll(async () => {
    if (assistantId) {
      await client.assistants.delete(assistantId);
    }
    if (createdMcpConfigId) {
      await deleteMcpConfig(client, createdMcpConfigId);
    }
  });

  test("keeps mcp_config_id through create, then through an unrelated update", async () => {
    if (!mcpConfigId) {
      throw new Error(
        "Could not create an MCP configuration and this environment has none to reuse. " +
          "Grant the account access to Settings > MCPs management, or set MCP_CONFIG_ID " +
          "in .env.e2e to an existing configuration.",
      );
    }

    const createParams: AssistantCreateParams = {
      assistant_ids: [],
      context: [],
      conversation_starters: [],
      description: "[E2E] before update",
      is_global: false,
      is_react: false,
      llm_model_type: llmModelType,
      name: assistantName,
      project: projectName,
      prompt_variables: [],
      shared: false,
      system_prompt: "E2E assistant for the MCP saved-config round-trip check.",
      toolkits: [],
      mcp_servers: [
        {
          name: "e2e-saved-config-mcp",
          description: "MCP server bound to a saved platform configuration",
          enabled: true,
          mcp_config_id: mcpConfigId,
          use_custom_config: false,
          resolve_dynamic_values_in_arguments: false,
        },
      ],
    };

    const created = await client.assistants.create(createParams);
    await sleep(3 * SECOND);

    // The create response does not carry the id on every environment, so resolve it from the
    // list the same way tests/e2e/specs/assistant.spec.ts does.
    assistantId = created.assistant_id ?? null;
    if (!assistantId) {
      const assistants = await client.assistants.list();
      assistantId = assistants.find((a) => a.name === assistantName)?.id ?? null;
    }
    expect(assistantId).toBeTruthy();

    // 1. The binding survived create.
    const afterCreate = await client.assistants.get(assistantId as string);
    expect(findMcpServer(afterCreate.mcp_servers).mcp_config_id).toBe(mcpConfigId);

    // 2. Change one unrelated field and send the assistant back exactly as the API returned it —
    //    this is what IaC deploy does, and this is where the binding used to be silently dropped.
    await client.assistants.update(assistantId as string, {
      ...(afterCreate as unknown as AssistantCreateParams),
      description: "[E2E] after update",
    });
    await sleep(3 * SECOND);

    const afterUpdate = await client.assistants.get(assistantId as string);
    expect(afterUpdate.description).toBe("[E2E] after update");

    const server = findMcpServer(afterUpdate.mcp_servers);
    expect(server.mcp_config_id).toBe(mcpConfigId);
    expect(server.use_custom_config).toBe(false);
    expect(server.resolve_dynamic_values_in_arguments).toBe(false);
  });
});
