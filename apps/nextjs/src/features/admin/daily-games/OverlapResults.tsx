import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { api } from "~/utils/api";
import { cn } from "~/utils/shadcn";
import { Button } from "~/components/ui/button";
import { Calendar } from "~/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { formatDate, ONE_DAY_IN_SECONDS } from "~/utils";

export default function OverlapResultsAdmin() {
  const [selectedDate, setSelectedDate] = useState(new Date());

  const { data: results } = api.overlap.getResults.useQuery(
    { date: format(selectedDate, "yyyy-MM-dd") },
    { staleTime: ONE_DAY_IN_SECONDS },
  );

  return (
    <div className="flex w-full flex-col">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            className={cn("w-[240px] pl-3 text-left font-normal text-black", !selectedDate && "text-muted-foreground")}
          >
            {selectedDate ? format(selectedDate, "PPP") : <span className="text-black">Pick a date</span>}
            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 text-black" align="start">
          <Calendar mode="single" selected={selectedDate} onSelect={(e) => e && setSelectedDate(e)} initialFocus />
        </PopoverContent>
      </Popover>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead># Guesses</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {results?.map((result, i) => (
            <TableRow key={i}>
              <TableCell>{result.user.username}</TableCell>
              <TableCell>{result.numGuesses}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
