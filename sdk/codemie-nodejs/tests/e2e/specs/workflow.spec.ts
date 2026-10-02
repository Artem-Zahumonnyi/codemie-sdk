import { describe, beforeAll, test, expect } from "@jest/globals";
import type { CodeMieClient } from "../../../src/client/client";
import type { WorkflowCreateParams } from "../../../src/schemas/workflow";
import { createCodemieClient } from "../utils/client.factory";
import { SECOND, sleep } from "../utils/time";

const projectName = process.env.PROJECT_NAME as string;

const workflowYamlMock = `
assistants:
  - id: asst
    name: Simple assistant
    model: "gpt-4o"
    system_prompt: |
      You are simple chatbot. 
      Generate a simple response.

states:
  - id: simple
    assistant_id: asst
    task: |
      Say "Hello, World!"
    next:
      state_id: end
`;

const workflowCreateParamsMock: WorkflowCreateParams = {
  project: projectName,
  name: "[E2E] Test Workflow",
  description: "[E2E] Test workflow description",
  yaml_config: workflowYamlMock,
  mode: "Sequential",
  shared: false,
};

describe("Workflow", () => {
  let client: CodeMieClient;

  beforeAll(async () => {
    client = await createCodemieClient();
  });

  test("should fetch prebuild workflows", async () => {
    const prebuildWorkflows = await client.workflows.getPrebuilt();

    expect(prebuildWorkflows).toBeDefined();
    expect(prebuildWorkflows).toBeInstanceOf(Array);
    expect(prebuildWorkflows.length).toBeGreaterThan(0);
  });

  test(
    "should create, get, update and delete workflow",
    async () => {
      await client.workflows.create(workflowCreateParamsMock);

      // Verify workflow create
      let workflows = await client.workflows.list({ projects: [projectName] });
      let workflow = workflows.find((w) => w.name === workflowCreateParamsMock.name);
      expect(workflow).toBeDefined();
      await sleep(3 * SECOND);

      const updatedDescription = "[E2E] Updated Test Workflow Description";
      await client.workflows.update(workflow!.id, {
        ...workflowCreateParamsMock,
        description: updatedDescription,
      });
      await sleep(7 * SECOND);

      // Verify workflow update
      const updatedWorkflow = await client.workflows.get(workflow!.id);
      expect(updatedWorkflow).toBeDefined();
      expect(updatedWorkflow.description).toBe(updatedDescription);

      await client.workflows.delete(workflow!.id);
      await sleep(3 * SECOND);

      // Verify workflow delete
      workflows = await client.workflows.list({ projects: [projectName] });
      workflow = workflows.find((w) => w.name === workflowCreateParamsMock.name);
      expect(workflow).toBeUndefined();
    },
    25 * SECOND,
  );
});
