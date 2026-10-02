import { test } from "@jest/globals";

type TestFnOptions = {
  skipReason?: string;
  ttl?: number;
};

export const testOnlyIf = (
  enabled: boolean,
  name: string,
  testFn: () => void | Promise<void>,
  options?: TestFnOptions,
) => {
  if (enabled) {
    return test(name, testFn, options?.ttl);
  } else {
    test.todo(
      options?.skipReason
        ? `Skipping test: ${name}. Reason: ${options.skipReason}`
        : `Skipping test: ${name}`,
    );
  }
};
