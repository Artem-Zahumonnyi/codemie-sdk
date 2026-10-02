import { describe, beforeAll, test, expect } from "@jest/globals";
import type { CodeMieClient } from "../../../src/client/client";
import { createCodemieClient } from "../utils/client.factory";

describe("LLM", () => {
  let client: CodeMieClient;

  beforeAll(async () => {
    client = await createCodemieClient();
  });

  test("should fetch list of LLMs", async () => {
    const llms = await client.llms.list();

    expect(llms).toBeDefined();
    expect(llms).toBeInstanceOf(Array);
  });

  test("should fetch list of LLM Embeddings", async () => {
    const embeddings = await client.llms.listEmbeddings();

    expect(embeddings).toBeDefined();
    expect(embeddings).toBeInstanceOf(Array);
  });
});
