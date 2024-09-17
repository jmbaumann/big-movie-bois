export const ONE_DAY_IN_SECONDS = 1000 * 60 * 60 * 24;

export function getById<T extends { id: string }>(arr: T[], key?: string) {
  const byId = {} as Record<string, T>;
  if (key) arr.forEach((e) => (byId[e[key]] = e));
  else arr.forEach((e) => (byId[e.id] = e));
  return byId;
}

export function toMoney(num: number) {
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",

    // These options are needed to round to whole numbers if that's what you want.
    //minimumFractionDigits: 0, // (this suffices for whole numbers, but will print 2500.10 as $2,500.1)
    maximumFractionDigits: 0, // (causes 2500.99 to be printed as $2,501)
  });

  return formatter.format(num);
}
