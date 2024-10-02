import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Info } from "lucide-react";

import { cn } from "~/utils/shadcn";
import { Button } from "~/components/ui/button";
import { Calendar } from "~/components/ui/calendar";
import { FormControl, FormItem, FormLabel, FormMessage } from "~/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";

export function DatePicker({
  label,
  includeTime,
  tooltip,
  field,
}: {
  label: string;
  includeTime?: boolean;
  tooltip?: string;
  field: any;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [time, setTime] = useState<string>("05:00");
  const [date, setDate] = useState<Date | null>(null);

  return (
    <FormItem className="flex flex-col">
      <FormLabel className="flex items-center">
        {label}
        {!!tooltip && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger className="ml-auto">
                <Info size={20} />
              </TooltipTrigger>
              <TooltipContent>{tooltip}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </FormLabel>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <FormControl>
            <Button
              variant={"outline"}
              className={cn("w-[240px] font-normal", !field.value && "text-muted-foreground")}
            >
              {field.value ? format(field.value, "PPP") + (includeTime ? `, ${time}` : "") : <span>Pick a date</span>}
              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
            </Button>
          </FormControl>
        </PopoverTrigger>
        <PopoverContent className="flex w-auto items-start p-0" align="start">
          <Calendar
            mode="single"
            captionLayout="dropdown"
            selected={date || field.value}
            onSelect={(selectedDate) => {
              const [hours, minutes] = time?.split(":")!;
              selectedDate?.setHours(parseInt(hours!), parseInt(minutes!));
              setDate(selectedDate!);
              field.onChange(selectedDate);
            }}
            onDayClick={() => setIsOpen(false)}
            fromYear={new Date().getFullYear()}
            toYear={new Date().getFullYear() + 1}
            disabled={(date) =>
              Number(date) < Date.now() - 1000 * 60 * 60 * 24 || Number(date) > Date.now() + 1000 * 60 * 60 * 24 * 30
            }
          />
          {includeTime && (
            <Select
              defaultValue={time!}
              onValueChange={(e) => {
                setTime(e);
                if (date) {
                  const [hours, minutes] = e.split(":");
                  const newDate = new Date(date.getTime());
                  newDate.setHours(parseInt(hours!), parseInt(minutes!));
                  setDate(newDate);
                  field.onChange(newDate);
                }
              }}
              open={true}
            >
              <SelectTrigger className="my-4 mr-2 w-[120px] font-normal focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="fixed left-0 top-2 mr-2 border-none shadow-none">
                <ScrollArea className="h-[15rem]">
                  {Array.from({ length: 96 }).map((_, i) => {
                    const hour = Math.floor(i / 4)
                      .toString()
                      .padStart(2, "0");
                    const minute = ((i % 4) * 15).toString().padStart(2, "0");
                    return (
                      <SelectItem key={i} value={`${hour}:${minute}`}>
                        {hour}:{minute}
                      </SelectItem>
                    );
                  })}
                </ScrollArea>
              </SelectContent>
            </Select>
          )}
        </PopoverContent>
      </Popover>
      <FormMessage />
    </FormItem>
  );
}
