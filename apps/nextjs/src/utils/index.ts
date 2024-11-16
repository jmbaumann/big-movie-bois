import { format } from "date-fns";

export const ONE_DAY_IN_SECONDS = 1000 * 60 * 60 * 24;

export function getById<T extends Record<string, any>>(arr: T[], key?: keyof T): Record<string, T> {
  const byId: Record<string, T> = {};

  if (key)
    arr.forEach((e) => {
      const value = e[key];
      if (typeof value === "string") {
        byId[value] = e;
      }
    });
  else
    arr.forEach((e) => {
      byId[e.id] = e;
    });

  return byId;
}

export function unique<T extends { id: string | number }>(arr: T[]) {
  return arr.filter((obj1, i, arr) => arr.findIndex((obj2) => obj2.id === obj1.id) === i);
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

export function formatDate(date: string | Date, f: string) {
  if (typeof date === "string" && date.match(/^(\d{4}-\d{2}-\d{2})/)) return format(new Date(date + "T00:00:00"), f);
  else return format(date, f);
}
