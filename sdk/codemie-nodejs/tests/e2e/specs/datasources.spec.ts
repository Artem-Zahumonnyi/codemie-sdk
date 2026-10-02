import { describe, beforeAll, test, expect } from "@jest/globals";
import type { CodeMieClient } from "../../../src/client/client";
import { createCodemieClient } from "../utils/client.factory";
import { IntegrationType } from "../../../src/models/integration";
import type { IntegrationCreateParams } from "../../../src/schemas/integration";
import { SECOND, sleep } from "../utils/time";
import { DataSourceCreateParams, DataSourceType } from "../../../src/models/datasource";

const projectName = process.env.PROJECT_NAME as string;

describe("DataSources", () => {
  let client: CodeMieClient;

  beforeAll(async () => {
    client = await createCodemieClient();
  });

  const createIntegration = async (alias: string): Promise<string> => {
    const integrationParams: IntegrationCreateParams = {
      project_name: projectName,
      credential_type: "FileSystem",
      credential_values: [],
      alias: alias,
      setting_type: IntegrationType.USER,
    };
    await client.integrations.create(integrationParams);
    await sleep(2 * SECOND);

    const integration = await client.integrations.getByAlias({ alias });
    if (!integration) throw new Error(`Integration with alias ${alias} not found`);

    return integration.id;
  };

  const deleteIntegration = async (integrationId: string): Promise<void> => {
    await client.integrations.delete(integrationId);
  };

  describe("create", () => {
    test(
      "should create and delete CODE datasource",
      async () => {
        const integrationId = await createIntegration("e2e-nodejs-sdk-00");
        const datasourceName = `code_e2e_nodejs_sdk`;

        const codeDatasourceParams: DataSourceCreateParams = {
          type: DataSourceType.CODE,
          name: datasourceName,
          description: "Code datasource description",
          shared_with_project: false,
          setting_id: integrationId,
          project_name: projectName,
          link: "https://github.com",
          branch: "main",
          docs_generation: false,
          index_type: "code",
        };

        await client.datasources.create(codeDatasourceParams);
        await sleep(2 * SECOND);

        // Verify datasource creation
        const datasources = await client.datasources.list({
          sort_key: "date",
          sort_order: "asc",
          per_page: 100,
          projects: [projectName],
        });
        const created = datasources.find((ds) => ds.name === datasourceName);
        expect(created).toBeDefined();

        // Clean up
        await client.datasources.delete(created!.id);
        await deleteIntegration(integrationId);
      },
      10 * SECOND,
    );

    test(
      "should create and delete FILE datasource",
      async () => {
        const integrationId = await createIntegration("e2e-nodejs-sdk-01");
        const datasourceName = `file_e2e_nodejs_sdk`;

        const fileDatasourceParams: DataSourceCreateParams = {
          type: DataSourceType.FILE,
          name: datasourceName,
          project_name: projectName,
          description: "File datasource description",
          setting_id: integrationId,
          shared_with_project: false,
          files: [
            { name: "file1.txt", mime_type: "text/plain", content: "Sample file content" },
            { name: "file2.txt", mime_type: "text/plain", content: "Another file content" },
          ],
        };

        await client.datasources.create(fileDatasourceParams);
        await sleep(2 * SECOND);

        // Verify datasource creation
        const datasources = await client.datasources.list({
          sort_key: "date",
          sort_order: "asc",
          per_page: 100,
          projects: [projectName],
        });
        const created = datasources.find((ds) => ds.name === datasourceName);
        expect(created).toBeDefined();

        // Clean up
        await client.datasources.delete(created!.id);
        await deleteIntegration(integrationId);
      },
      10 * SECOND,
    );

    test(
      "should create and delete GOOGLE datasource",
      async () => {
        const integrationId = await createIntegration("e2e-nodejs-sdk-02");
        const datasourceName = `google_e2e_nodejs_sdk`;

        const googleDatasourceParams: DataSourceCreateParams = {
          type: DataSourceType.GOOGLE,
          name: datasourceName,
          project_name: projectName,
          description: "Google datasource description",
          setting_id: integrationId,
          shared_with_project: false,
          google_doc: "https://docs.google.com/document",
        };

        await client.datasources.create(googleDatasourceParams);
        await sleep(2 * SECOND);

        // Verify datasource creation
        const datasources = await client.datasources.list({
          sort_key: "date",
          sort_order: "asc",
          per_page: 100,
          projects: [projectName],
        });
        const created = datasources.find((ds) => ds.name === datasourceName);
        expect(created).toBeDefined();

        // Clean up
        await client.datasources.delete(created!.id);
        await deleteIntegration(integrationId);
      },
      10 * SECOND,
    );
  });

  describe("flows", () => {
    test(
      "create datasource, fetch it, update and delete",
      async () => {
        const integrationId = await createIntegration("e2e-nodejs-sdk-04");
        const datasourceName = `flow_e2e_nodejs_sdk`;

        const datasourceParams: DataSourceCreateParams = {
          type: DataSourceType.FILE,
          name: datasourceName,
          project_name: projectName,
          description: "Flow datasource description",
          setting_id: integrationId,
          shared_with_project: true,
          files: [
            { name: "file1.txt", mime_type: "text/plain", content: "Sample file content" },
            { name: "file2.txt", mime_type: "text/plain", content: "Another file content" },
          ],
        };

        // Create datasource
        await client.datasources.create(datasourceParams);
        await sleep(2 * SECOND);

        // Fetch created datasource
        const datasources = await client.datasources.list({
          sort_key: "date",
          sort_order: "asc",
          per_page: 100,
          projects: [projectName],
        });
        const created = datasources.find((ds) => ds.name === datasourceName);
        expect(created).toBeDefined();

        // Update datasource
        const updatedDescription = "Updated flow datasource description";
        await client.datasources.update({
          ...datasourceParams,
          description: updatedDescription,
          full_reindex: true,
        });
        await sleep(2 * SECOND);

        // Fetch and verify updated datasource
        const updated = await client.datasources.get(created!.id);
        expect(updated).toBeDefined();

        // Delete datasource
        await client.datasources.delete(updated.id);

        // Clean up integration
        await deleteIntegration(integrationId);
      },
      20 * SECOND,
    );
  });
});
