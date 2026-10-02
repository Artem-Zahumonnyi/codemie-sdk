import { describe, beforeAll, test, expect } from "@jest/globals";
import type { CodeMieClient } from "../../../src/client/client";
import { CredentialTypes, IntegrationType } from "../../../src/models/integration";
import type { IntegrationCreateParams } from "../../../src/schemas";
import { createCodemieClient } from "../utils/client.factory";
import { SECOND, sleep } from "../utils/time";

const projectName = process.env.PROJECT_NAME as string;

const integrationCreateParamsMock: IntegrationCreateParams = {
  project_name: projectName,
  alias: "[E2E] Test Git Integration",
  default: false,
  credential_type: CredentialTypes.GIT,
  credential_values: [
    { key: "git_token", value: "test-token" },
    { key: "git_username", value: "test-user" },
  ],
  setting_type: IntegrationType.USER,
};

describe("Integration", () => {
  let client: CodeMieClient;

  beforeAll(async () => {
    client = await createCodemieClient();
  });

  test(
    "should create, get, update and delete integration",
    async () => {
      await client.integrations.create(integrationCreateParamsMock);
      await sleep(3 * SECOND);

      // Verify integration create
      let integrations = await client.integrations.list();
      let integration = integrations.find((i) => i.alias === integrationCreateParamsMock.alias);
      expect(integration).toBeDefined();
      expect(integration?.credential_type).toBe(CredentialTypes.GIT);

      // Get specific integration
      const fetchedIntegration = await client.integrations.get({
        integration_id: integration!.id,
        setting_type: IntegrationType.USER,
      });
      expect(fetchedIntegration).toBeDefined();
      expect(fetchedIntegration.alias).toBe(integrationCreateParamsMock.alias);

      // Get integration by alias
      const integrationByAlias = await client.integrations.getByAlias({
        alias: integration!.alias!,
        setting_type: IntegrationType.USER,
      });
      expect(integrationByAlias).toBeDefined();
      expect(integrationByAlias.id).toBe(integration!.id);

      // Update integration
      const updatedAlias = "[E2E] Updated Test Git Integration";
      await client.integrations.update(integration!.id, {
        ...integrationCreateParamsMock,
        alias: updatedAlias,
      });
      await sleep(5 * SECOND);

      // Verify integration update
      const updatedIntegration = await client.integrations.get({
        integration_id: integration!.id,
        setting_type: IntegrationType.USER,
      });
      expect(updatedIntegration).toBeDefined();
      expect(updatedIntegration.alias).toBe(updatedAlias);

      // Delete integration
      await client.integrations.delete(integration!.id);
      await sleep(5 * SECOND);

      // Verify integration delete
      integrations = await client.integrations.list();
      integration = integrations.find((i) => i.alias === updatedAlias);
      expect(integration).toBeUndefined();
    },
    25 * SECOND,
  );
});
