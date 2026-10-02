import { describe, beforeAll, test, expect } from "@jest/globals";
import type { CodeMieClient } from "../../../src/client/client";
import type { IntegrationCreateParams, AssistantCreateParams } from "../../../src/schemas";
import { createCodemieClient } from "../utils/client.factory";
import { SECOND, sleep } from "../utils/time";
import {
  ContextType,
  CredentialTypes,
  DataSourceCreateParams,
  DataSourceType,
  IntegrationType,
} from "../../../src/models";

const projectName = process.env.PROJECT_NAME as string;

describe("Assistant with Jira", () => {
  let client: CodeMieClient;

  beforeAll(async () => {
    client = await createCodemieClient();
  });

  test(
    "create jira assistant, add datasource, and delete assistant",
    async () => {
      // Create Jira integration
      const jiraAlias = "[E2E] Test Jira Integration";
      const jiraIntegrationParams: IntegrationCreateParams = {
        project_name: projectName,
        credential_type: CredentialTypes.JIRA,
        credential_values: [
          { key: "url", value: "https://your-jira-instance.atlassian.net" },
          { key: "username", value: "your-jira-email@example.com" },
          { key: "token", value: "your-jira-api-token" },
        ],
        alias: jiraAlias,
        setting_type: IntegrationType.USER,
      };
      await client.integrations.create(jiraIntegrationParams);
      await sleep(2 * SECOND);

      // Fetch and verify the integration
      const integration = await client.integrations.getByAlias({
        alias: jiraAlias,
        setting_type: IntegrationType.USER,
      });
      expect(integration).toBeDefined();
      expect(integration.alias).toBe(jiraAlias);
      expect(integration.credential_type).toBe(CredentialTypes.JIRA);

      // Create datasource
      const datasourceParams: DataSourceCreateParams = {
        name: "google_doc_ds",
        project_name: projectName,
        description: "Google doc datasource description",
        setting_id: integration.id,
        type: DataSourceType.GOOGLE,
        shared_with_project: true,
        google_doc: "https://docs.google.com/document",
      };
      await client.datasources.create(datasourceParams);
      await sleep(2 * SECOND);

      // Get list of prebuilt assistants
      const prebuiltAssistants = await client.assistants.getPrebuilt();

      // Get first assistant and its slug
      const prebuiltAssistant = prebuiltAssistants[0];
      const assistantName = "My favourite assistant";
      const assistantSlug = `${assistantName}-e2e-00`;

      const assistantRequest: AssistantCreateParams = {
        name: assistantName,
        slug: assistantSlug,
        description: prebuiltAssistant.description,
        system_prompt: prebuiltAssistant.system_prompt,
        llm_model_type: "gpt-4o",
        project: projectName,
        toolkits: prebuiltAssistant.toolkits,
        temperature: prebuiltAssistant.temperature,
        top_p: prebuiltAssistant.top_p,
        // Configure datasource for assistant
        context: [
          {
            name: datasourceParams.name,
            context_type: ContextType.CODE,
          },
        ],
        conversation_starters: [],
        mcp_servers: [],
        assistant_ids: [],
      };

      // Create assistant
      await client.assistants.create(assistantRequest);
      await sleep(2 * SECOND);

      // Verify assistant creation
      const assistant = await client.assistants.getBySlug(assistantSlug);
      expect(assistant).toBeDefined();
      expect(assistant.name).toBe(assistantName);
      expect(assistant.slug).toBe(assistantSlug);

      await client.assistants.delete(assistant.id);

      const datasources = await client.datasources.list({
        datasource_types: [DataSourceType.GOOGLE],
        projects: [projectName],
      });

      const datasource = datasources.find((ds) => ds.name === datasourceParams.name);
      expect(datasource).toBeDefined();

      await client.datasources.delete(datasource!.id);
      await client.integrations.delete(integration.id!, integration.setting_type);
    },
    20 * SECOND,
  );
});
