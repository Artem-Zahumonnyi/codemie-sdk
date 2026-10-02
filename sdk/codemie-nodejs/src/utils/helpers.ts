/**
 * Utility function to omit properties with undefined values from an object.
 * Helper during API response mapping to ensure clean data.
 */
export function omitUndefined<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([_, value]) => value !== undefined)) as T;
}
