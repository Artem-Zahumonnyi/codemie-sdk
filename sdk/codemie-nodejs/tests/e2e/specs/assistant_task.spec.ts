import { describe, beforeAll, test, expect } from "@jest/globals";
import type { CodeMieClient } from "../../../src/client/client";
import type { AssistantCreateParams } from "../../../src/schemas/assistant";
import { createCodemieClient } from "../utils/client.factory";
import { SECOND, sleep } from "../utils/time";

const projectName = process.env.PROJECT_NAME as string;

const complexQuestion = `
Please provide a detailed analysis of software architecture patterns, including:
    1. Monolithic Architecture
    2. Microservices Architecture
    3. Event-Driven Architecture
    4. Layered Architecture
    5. Space-Based Architecture
    
    For each pattern, include:
    - Definition
    - Key characteristics
    - Advantages and disadvantages
    - Best use cases
    - Implementation challenges
    - Real-world examples
`;

const assistantCreateParamsMock: AssistantCreateParams = {
  project: projectName,
  name: "[E2E] Test Assistant",
  description: "[E2E] Test assistant description",
  system_prompt: "You are a test assistant for e2e testing.",
  llm_model_type: "gpt-4o",
  toolkits: [],
  conversation_starters: [],
  context: [],
  mcp_servers: [],
  assistant_ids: [],
  shared: false,
  is_react: false,
  is_global: false,
};

describe("Assistant Task", () => {
  let client: CodeMieClient;

  beforeAll(async () => {
    client = await createCodemieClient();
  });

  test(
    "should create assistant, start background task, get status, and delete assistant",
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
        text: complexQuestion,
        history: [],
        stream: false,
        background_task: true,
      });
      expect(chatResponse).toBeDefined();
      expect(chatResponse.task_id).toBeDefined();

      // Get the task status
      const task = await client.tasks.get(chatResponse.task_id as string);
      expect(task).toBeDefined();

      // Delete the assistant
      await client.assistants.delete(assistant.id);
    },
    10 * SECOND,
  );
});
