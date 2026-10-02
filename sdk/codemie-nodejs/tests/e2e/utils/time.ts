export const SECOND = 1000;
export const MINUTE = 60 * SECOND;

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
