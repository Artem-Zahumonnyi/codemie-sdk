import { describe, beforeAll, test, expect } from "@jest/globals";
import type { CodeMieClient } from "../../../src/client/client";
import type { AssistantCreateParams, IntegrationCreateParams } from "../../../src/schemas";
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

describe("Datasource with GIT", () => {
  let client: CodeMieClient;

  beforeAll(async () => {
    client = await createCodemieClient();
  });

  test(
    "create integration, add GIT datasource, create assistant, and delete assistant",
    async () => {
      // Create Git integration
      const integrationAlias = "[E2E] Node.js SDK Git Integration";
      const integrationParams: IntegrationCreateParams = {
        project_name: projectName,
        credential_type: CredentialTypes.GIT,
        credential_values: [{ key: "url", value: "https://github.com" }],
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
      expect(integration.credential_type).toBe(CredentialTypes.GIT);
      expect(integration.credential_values).toHaveLength(1);

      // Get embedding model
      const embeddingModels = await client.llms.listEmbeddings();
      expect(embeddingModels).toBeDefined();
      expect(embeddingModels.length).toBeGreaterThan(0);
      const embedding = embeddingModels[0];

      // Create datasource
      const datasourceParams: DataSourceCreateParams = {
        type: DataSourceType.CODE,
        name: "e2e-nodejs-git-ds",
        project_name: projectName,
        description: "E2E Node.js Git datasource",
        setting_id: integration.id,
        shared_with_project: false,
        link: "https://github.com/sindresorhus/camelcase",
        branch: "main",
        files_filter: "*.js",
        index_type: "code",
        embeddings_model: embedding.base_name,
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
      const assistantSlug = `${assistantName}-e2e-01`;

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
            context_type: ContextType.CODE,
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
        datasource_types: [DataSourceType.CODE],
        projects: [projectName],
      });
      const datasource = datasources.find((ds) => ds.name === datasourceParams.name);
      expect(datasource).toBeDefined();
      await client.datasources.delete(datasource!.id);

      // Delete integration
      await client.integrations.delete(integration.id!, integration.setting_type);
    },
    20 * SECOND,
  );
});
