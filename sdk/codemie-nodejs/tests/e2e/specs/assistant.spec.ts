import { describe, beforeAll, test, expect } from "@jest/globals";
import type { CodeMieClient } from "../../../src/client/client";
import type { AssistantCreateParams } from "../../../src/schemas/assistant";
import { createCodemieClient } from "../utils/client.factory";
import { SECOND, sleep } from "../utils/time";

const projectName = process.env.PROJECT_NAME as string;

const assistantCreateParamsMock: AssistantCreateParams = {
  assistant_ids: [],
  context: [],
  conversation_starters: [],
  description: "[E2E] Test assistant description",
  is_global: false,
  is_react: false,
  llm_model_type: "gpt-4o",
  mcp_servers: [],
  name: "[E2E] Test Assistant",
  project: projectName,
  prompt_variables: [
    { key: "project_name", default_value: "E2E", description: "Name of the project" },
  ],
  shared: false,
  system_prompt: "You are a test assistant for e2e testing.",
  toolkits: [],
};

describe("Assistant", () => {
  let client: CodeMieClient;

  beforeAll(async () => {
    client = await createCodemieClient();
  });

  test("should fetch prebuilt assistants", async () => {
    const prebuiltAssistants = await client.assistants.getPrebuilt();

    expect(prebuiltAssistants).toBeDefined();
    expect(prebuiltAssistants).toBeInstanceOf(Array);
    expect(prebuiltAssistants.length).toBeGreaterThan(0);
  });

  test(
    "should create, get, update and delete assistant",
    async () => {
      await client.assistants.create(assistantCreateParamsMock);
      await sleep(3 * SECOND);

      // Verify assistant create
      let assistants = await client.assistants.list();
      let assistant = assistants.find((a) => a.name === assistantCreateParamsMock.name);
      expect(assistant).toBeDefined();
      expect(assistant?.description).toBe(assistantCreateParamsMock.description);

      // Get specific assistant
      const fetchedAssistant = await client.assistants.get(assistant.id);
      expect(fetchedAssistant).toBeDefined();
      expect(fetchedAssistant.name).toBe(assistantCreateParamsMock.name);
      // Check prompt_variables
      expect(fetchedAssistant.prompt_variables).toBeDefined();
      expect(
        fetchedAssistant.prompt_variables?.find((v) => v.key === "project_name")?.default_value,
      ).toBe("E2E");

      // Update assistant
      const updatedDescription = "[E2E] Updated Test Assistant Description";
      await client.assistants.update(assistant.id, {
        ...assistantCreateParamsMock,
        description: updatedDescription,
        prompt_variables: [
          { key: "project_name", default_value: "E2E-Updated" },
          { key: "region", default_value: "eu" },
        ],
      });
      await sleep(3 * SECOND);

      // Verify assistant update
      const updatedAssistant = await client.assistants.get(assistant.id);
      expect(updatedAssistant).toBeDefined();
      expect(updatedAssistant.description).toBe(updatedDescription);
      expect(
        updatedAssistant.prompt_variables?.find((v) => v.key === "project_name")?.default_value,
      ).toBe("E2E-Updated");
      expect(
        updatedAssistant.prompt_variables?.find((v) => v.key === "region")?.default_value,
      ).toBe("eu");

      // Delete assistant
      await client.assistants.delete(assistant.id);
      await sleep(3 * SECOND);

      // Verify assistant delete
      assistants = await client.assistants.list();
      assistant = assistants.find((a) => a.name === assistantCreateParamsMock.name);
      expect(assistant).toBeUndefined();
    },
    20 * SECOND,
  );

  test("should fetch available tools", async () => {
    const tools = await client.assistants.getTools();

    expect(tools).toBeDefined();
    expect(tools).toBeInstanceOf(Array);
  });

  test("should get prebuilt assistant by slug", async () => {
    const prebuiltAssistants = await client.assistants.getPrebuilt();
    const firstAssistant = prebuiltAssistants[0];

    const assistantBySlug = await client.assistants.getPrebuiltBySlug(firstAssistant.slug);

    expect(assistantBySlug).toBeDefined();
    expect(assistantBySlug.id).toBe(firstAssistant.id);
    expect(assistantBySlug.name).toBe(firstAssistant.name);
  });

  test("should get assistant by slug", async () => {
    await client.assistants.create({
      ...assistantCreateParamsMock,
      slug: "test-assistant-slug",
    });

    const assistant = await client.assistants.getBySlug("test-assistant-slug");
    expect(assistant).toBeDefined();
    expect(assistant.name).toBe(assistantCreateParamsMock.name);

    // Delete assistant by slug
    await client.assistants.delete(assistant.id);
  });

  test(
    "should create, chat, and delete assistant",
    async () => {
      const assistantSlug = `e2e-sdk-test-assistant-chat-${Date.now()}`;

      await client.assistants.create({
        ...assistantCreateParamsMock,
        slug: assistantSlug,
      });
      await sleep(3 * SECOND);

      // Verify assistant creation
      const assistant = await client.assistants.getBySlug(assistantSlug);
      expect(assistant).toBeDefined();
      expect(assistant.slug).toBe(assistantSlug);

      // Chat with the assistant
      const chatResponse = await client.assistants.chat(assistant.id, {
        text: "Hello, how can you assist me today?",
        history: [],
      });
      expect(chatResponse).toBeDefined();
      expect(chatResponse.generated).toBeDefined();

      // Delete the assistant
      await client.assistants.delete(assistant.id);
    },
    10 * SECOND,
  );

  test(
    "should chat with save_history parameter",
    async () => {
      const assistantSlug = `e2e-sdk-test-assistant-save-history-${Date.now()}`;

      await client.assistants.create({
        ...assistantCreateParamsMock,
        slug: assistantSlug,
      });
      await sleep(3 * SECOND);

      // Verify assistant creation
      const assistant = await client.assistants.getBySlug(assistantSlug);
      expect(assistant).toBeDefined();
      expect(assistant.slug).toBe(assistantSlug);

      // Chat with save_history=false (should not persist history)
      const chatResponseNoSave = await client.assistants.chat(assistant.id, {
        text: "This message should not be saved to history",
        history: [],
        save_history: false,
      });
      expect(chatResponseNoSave).toBeDefined();
      expect(chatResponseNoSave.generated).toBeDefined();

      // Chat with save_history=true (should persist history)
      const chatResponseWithSave = await client.assistants.chat(assistant.id, {
        text: "This message should be saved to history",
        history: [],
        save_history: true,
      });
      expect(chatResponseWithSave).toBeDefined();
      expect(chatResponseWithSave.generated).toBeDefined();

      // Chat without save_history (defaults to backend behavior)
      const chatResponseDefault = await client.assistants.chat(assistant.id, {
        text: "This message uses default save behavior",
        history: [],
      });
      expect(chatResponseDefault).toBeDefined();
      expect(chatResponseDefault.generated).toBeDefined();

      // Delete the assistant
      await client.assistants.delete(assistant.id);
    },
    15 * SECOND,
  );
});
