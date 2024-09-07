export function toZodEnum<T extends Record<string, string>>(e: T) {
  return Object.values(e) as unknown as readonly [string, ...string[]];
}
