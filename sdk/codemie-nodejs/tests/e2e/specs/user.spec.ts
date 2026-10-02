import { describe, beforeAll, test, expect } from "@jest/globals";
import type { CodeMieClient } from "../../../src/client/client";
import { createCodemieClient } from "../utils/client.factory";

describe("User", () => {
  let client: CodeMieClient;

  beforeAll(async () => {
    client = await createCodemieClient();
  });

  test("should fetch user data", async () => {
    const userData = await client.users.getData();

    expect(userData).toBeDefined();
  });

  test("should fetch user about", async () => {
    const about = await client.users.aboutMe();

    expect(about).toBeDefined();
  });
});
