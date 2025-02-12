import seedrandom from "seedrandom";

export function toZodEnum<T extends Record<string, string>>(e: T) {
  return Object.values(e) as unknown as readonly [string, ...string[]];
}

export function randomString(length: number) {
  let result = "";
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  return result;
}

export function coinflip(seed?: string) {
  const random = seedrandom(seed ?? "");
  return Math.floor(random() * 2);
}
