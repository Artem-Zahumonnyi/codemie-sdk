export function omitKeys<T extends Record<string, any>>(obj: T, keys: (keyof T)[]): T {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result;
}
