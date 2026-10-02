import { jest } from "@jest/globals";
import { config } from "dotenv";
import { join } from "node:path";
import { MINUTE } from "./utils/time";

global.jest = jest;
jest.setTimeout(5 * MINUTE);

config({
  path: join(__dirname, "../../.env.e2e"),
});
