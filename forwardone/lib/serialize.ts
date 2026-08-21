export function serializeData<T>(value: T): T {
  try { return JSON.parse(JSON.stringify(value ?? null, (_key: string, item: unknown) => typeof item === 'bigint' ? item.toString() : item)) as T }
  catch (error: unknown) { console.error(error); return value }
}
