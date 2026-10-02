import { describe, beforeAll, expect } from "@jest/globals";
import type { CodeMieClient } from "../../../src/client/client";
import { createCodemieClient } from "../utils/client.factory";
import { testOnlyIf } from "../utils/jest";
import { SECOND, sleep } from "../utils/time";
import {
  ContextType,
  CredentialTypes,
  DataSourceCreateParams,
  DataSourceType,
  IntegrationType,
} from "../../../src/models";
import { AssistantCreateParams, IntegrationCreateParams } from "../../../src/schemas";

const projectName = process.env.PROJECT_NAME as string;
const jiraApiKey = process.env.JIRA_API_KEY as string;
const jiraUsername = process.env.JIRA_USERNAME as string;
const jiraDomain = process.env.JIRA_DOMAIN as string;
const jiraJQL = (process.env.JIRA_JQL as string) || "project = TEST";

describe("Datasource with JIRA", () => {
  let client: CodeMieClient;

  beforeAll(async () => {
    client = await createCodemieClient();
  });

  testOnlyIf(
    Boolean(jiraApiKey && jiraUsername && jiraDomain),
    "create integration, add JIRA datasource, create assistant, and delete assistant",
    async () => {
      // Create Jira integration
      const integrationAlias = "[E2E] Node.js SDK Jira Integration";
      const integrationParams: IntegrationCreateParams = {
        project_name: projectName,
        credential_type: CredentialTypes.JIRA,
        credential_values: [
          { key: "url", value: jiraDomain },
          { key: "username", value: jiraUsername },
          { key: "token", value: jiraApiKey },
          { key: "is_cloud", value: true },
        ],
        alias: integrationAlias,
        setting_type: IntegrationType.USER,
      };
      await client.integrations.create(integrationParams);
      await sleep(2 * SECOND);

      // Fetch and verify the integration
      const integration = await client.integrations.getByAlias({
        setting_type: IntegrationType.USER,
        alias: integrationAlias,
      });
      expect(integration).toBeDefined();
      expect(integration.alias).toBe(integrationAlias);
      expect(integration.credential_type).toBe(CredentialTypes.JIRA);
      expect(integration.credential_values).toHaveLength(4);

      // Create datasource
      const datasourceParams: DataSourceCreateParams = {
        type: DataSourceType.JIRA,
        name: "e2e-nodejs-jira-0000",
        project_name: projectName,
        description: "E2E Node.js Jira datasource",
        setting_id: integration.id,
        shared_with_project: false,
        jql: jiraJQL,
      };
      await client.datasources.create(datasourceParams);
      await sleep(5 * SECOND);

      // Fetch prebuilt assistants
      const prebuiltAssistants = await client.assistants.getPrebuilt();
      expect(prebuiltAssistants).toBeDefined();
      expect(prebuiltAssistants).toBeInstanceOf(Array);
      expect(prebuiltAssistants.length).toBeGreaterThan(0);

      // Create assistant with datasource
      const prebuiltAssistant = prebuiltAssistants[0];
      const assistantName = "[E2E] Random Assistant";
      const assistantSlug = `${assistantName}-e2e-02`;

      const assistantParams: AssistantCreateParams = {
        name: assistantName,
        slug: assistantSlug,
        description: prebuiltAssistant.description,
        system_prompt: prebuiltAssistant.system_prompt,
        llm_model_type: "gpt-4o",
        project: projectName,
        toolkits: prebuiltAssistant.toolkits,
        temperature: prebuiltAssistant.temperature,
        top_p: prebuiltAssistant.top_p,
        context: [
          {
            name: datasourceParams.name,
            context_type: ContextType.KNOWLEDGE_BASE,
          },
        ],
        conversation_starters: [],
        mcp_servers: [],
        assistant_ids: [],
      };

      await client.assistants.create(assistantParams);
      await sleep(2 * SECOND);

      const assistant = await client.assistants.getBySlug(assistantSlug);
      expect(assistant).toBeDefined();
      expect(assistant.name).toBe(assistantName);
      expect(assistant.slug).toBe(assistantSlug);

      // Delete assistant
      await client.assistants.delete(assistant.id);

      // Delete datasource
      const datasources = await client.datasources.list({
        datasource_types: [DataSourceType.JIRA],
        projects: [projectName],
      });
      const datasource = datasources.find((ds) => ds.name === datasourceParams.name);
      expect(datasource).toBeDefined();
      await client.datasources.delete(datasource!.id);

      // Delete integration
      await client.integrations.delete(integration.id!, integration.setting_type);
    },
    {
      skipReason: "JIRA_API_KEY, JIRA_USERNAME, and JIRA_DOMAIN must be set",
      ttl: 20 * SECOND,
    },
  );
});
