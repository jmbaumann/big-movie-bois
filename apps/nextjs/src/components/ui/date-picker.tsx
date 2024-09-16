import { useState } from "react";

import { Input } from "./input";
import { Label } from "./label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";

// const months = [
//   "January",
//   "February",
//   "March",
//   "April",
//   "May",
//   "June",
//   "July",
//   "August",
//   "September",
//   "October",
//   "November",
//   "December",
// ];
// const dates = [...Array(31).keys()];
const datesByMonth = {
  January: 31,
  February: 28,
  March: 31,
  April: 30,
  May: 31,
  June: 30,
  July: 31,
  August: 31,
  September: 30,
  October: 31,
  November: 30,
  December: 31,
};
const months = Object.keys(datesByMonth);

export default function DatePicker({ field }: { field: any }) {
  const [month, setMonth] = useState(new Date().getMonth());
  const [date, setDate] = useState(new Date().getDate());

  return (
    <div className="flex items-center">
      <Label>Date</Label>
      <div>
        <Select
          onValueChange={(m) => setMonth(Number(m))}
          defaultValue={String(month)}
        >
          <SelectTrigger className="w-1/2 text-black">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {months.map((m, i) => (
              <SelectItem key={i} value={String(i)}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          onValueChange={(m) => setDate(Number(m))}
          defaultValue={String(date)}
        >
          <SelectTrigger className="w-1/2 text-black">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[
              ...Array(
                datesByMonth[months[month]! as keyof typeof datesByMonth],
              ).keys(),
            ].map((d, i) => (
              <SelectItem key={i} value={String(d)}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Input {...field} className="text-black" autoComplete="off" />
    </div>
  );
}
