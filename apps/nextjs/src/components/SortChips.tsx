import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import { cn } from "~/utils/shadcn";

export default function SortChips<T>({
  setItems,
  sortFunc,
  def,
  options,
}: {
  setItems: Dispatch<SetStateAction<T[]>>;
  sortFunc: (a: T, b: T, option: string, desc: boolean) => number;
  def: { value: string; desc: boolean };
  options: { label: string; value: string }[];
}) {
  const [sort, setSort] = useState(def);

  const sortItems = (value: string, desc: boolean) => {
    setSort({ value, desc });
    setItems((s) => [...s.sort((a: T, b: T) => sortFunc(a, b, value, desc))]);
  };

  useEffect(() => {
    sortItems(def.value, def.desc);
  }, []);

  return (
    <div className="flex w-full flex-row">
      {options.map((e, i) => (
        <SortChip
          key={i}
          label={e.label}
          value={e.value}
          sort={sort}
          sortItems={sortItems}
        />
      ))}
    </div>
  );
}

function SortIcon({ desc }: { desc: boolean }) {
  return desc ? (
    <ChevronDown className="ml-2" />
  ) : (
    <ChevronUp className="ml-2" />
  );
}

function SortChip({
  label,
  value,
  sort,
  sortItems,
}: {
  label: string;
  value: string;
  sort: { value: string; desc: boolean };
  sortItems: (value: string, desc: boolean) => void;
}) {
  return (
    <span
      className={cn(
        "mr-4 flex select-none items-center rounded-3xl px-4 py-1 hover:cursor-pointer",
        sort.value === value
          ? "bg-primary text-zinc-100"
          : "bg-zinc-100 text-neutral-800",
      )}
      onClick={() => sortItems(value, sort.value === value ? !sort.desc : true)}
    >
      {label} {sort.value === value ? <SortIcon desc={sort.desc} /> : <></>}
    </span>
  );
}
