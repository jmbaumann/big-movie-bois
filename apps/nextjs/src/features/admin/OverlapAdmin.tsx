import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, sub } from "date-fns";
import { CalendarIcon, ChevronsUpDown, Pencil, Trash, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { api, RouterOutputs } from "~/utils/api";
import { cn } from "~/utils/shadcn";
import { Button } from "~/components/ui/button";
import { Calendar } from "~/components/ui/calendar";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "~/components/ui/command";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "~/components/ui/form";
import { useToast } from "~/components/ui/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { ONE_DAY_IN_SECONDS } from "~/utils";

type OverlapAnswer = RouterOutputs["overlap"]["getAnswers"][number];

export default function OverlapAdmin() {
  const { toast } = useToast();

  const [searchResult, setSearchResult] = useState<
    {
      id: number;
      title: string;
    }[]
  >([]);
  const [searchKeyword, setSearchKeyword] = useState<string>();

  const { data: answers, refetch: refreshAnswers } = api.overlap.getAnswers.useQuery(
    {},
    { staleTime: ONE_DAY_IN_SECONDS },
  );
  const { isLoading: creating, mutate: createAnswer } = api.overlap.createAnswer.useMutation();
  const { isLoading: updating, mutate: updateAnswer } = api.overlap.updateAnswer.useMutation();
  const { mutate: deleteAnswer } = api.overlap.deleteAnswer.useMutation();
  const { data: search, isLoading: searching } = api.tmdb.search.useQuery(
    { keyword: searchKeyword ?? "" },
    { enabled: !!searchKeyword },
  );

  const isLoading = creating || updating;
  const resultsAndExisting = [
    ...searchResult,
    ...(answers ? [...answers].map((e) => ({ id: e.tmdbId, title: e.tmdb.title })) : []),
  ];

  useEffect(() => {
    if (search) setSearchResult(search);
  }, [search]);

  const formSchema = z.object({
    id: z.string().optional(),
    date: z.date(),
    tmdbId: z.number(),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date(),
      tmdbId: 0,
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (!values.id)
      createAnswer(
        { date: format(values.date, "yyyy-MM-dd"), tmdbId: values.tmdbId },
        {
          onSuccess: (data) => {
            toast({
              title: "Answer Created",
            });
            setSearchKeyword(undefined);
            form.reset();
            refreshAnswers();
          },
          onError: (error) => {
            toast({ title: error.message, variant: "destructive" });
          },
        },
      );
    else
      updateAnswer(
        { id: values.id, date: format(values.date, "yyyy-MM-dd"), tmdbId: values.tmdbId },
        {
          onSuccess: (data) => {
            toast({
              title: "Answer Updated",
            });
            setSearchKeyword(undefined);
            form.reset();
            refreshAnswers();
          },
          onError: (error) => {
            toast({ title: error.message, variant: "destructive" });
          },
        },
      );
  }

  function handleEdit(answer: OverlapAnswer) {
    form.setValue("id", answer.id);
    form.setValue("date", new Date(answer.date + "T00:00:00"));
    form.setValue("tmdbId", answer.tmdbId);
  }

  function handleDelete(id: string) {
    deleteAnswer(
      { id },
      {
        onSuccess: () => {
          toast({
            title: "Answer Deleted",
          });
          refreshAnswers();
        },
        onError: (error) => {
          toast({ title: error.message, variant: "destructive" });
        },
      },
    );
  }

  return (
    <div className="flex w-full flex-col">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="my-2 flex items-end gap-x-2">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-[240px] pl-3 text-left font-normal text-black",
                          !field.value && "text-muted-foreground",
                        )}
                      >
                        {field.value ? format(field.value, "PPP") : <span className="text-black">Pick a date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 text-black" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date < sub(new Date(), { days: 1 })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="tmdbId"
            render={({ field }) => (
              <FormItem className="flex w-[400px] flex-col">
                <FormLabel>Movie</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        role="combobox"
                        className={cn("w-full justify-between text-black", !field.value && "text-muted-foreground")}
                      >
                        {field.value
                          ? resultsAndExisting.find((result) => result.id === field.value)?.title
                          : "Select Movie"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command shouldFilter={false}>
                      <CommandInput placeholder="Search for a movie" onValueChange={setSearchKeyword} />
                      {searching ? <CommandEmpty>Loading...</CommandEmpty> : <CommandEmpty>No results</CommandEmpty>}
                      <CommandList className="w-[400px]">
                        <CommandGroup>
                          {searchResult?.map((result) => (
                            <CommandItem
                              key={result.id}
                              value={String(result.id)}
                              onSelect={() => {
                                form.setValue("tmdbId", result.id);
                              }}
                            >
                              {result.title}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="float-right" isLoading={isLoading}>
            Submit
          </Button>

          {!!form.getValues().tmdbId && (
            <Button type="button" variant="ghost" className="float-right" onClick={() => form.reset()}>
              <X /> Clear
            </Button>
          )}
        </form>
      </Form>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40px]"></TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>TMDb ID</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {answers?.map((answer, i) => (
            <TableRow key={i}>
              <TableCell>
                <Button className="hover:text-primary" size="icon" variant="ghost" onClick={() => handleEdit(answer)}>
                  <Pencil size={20} />
                </Button>
              </TableCell>
              <TableCell>{answer.date}</TableCell>
              <TableCell>{answer.tmdb.title}</TableCell>
              <TableCell>{answer.tmdbId}</TableCell>
              <TableCell>
                <Button size="icon" variant="destructive" onClick={() => handleDelete(answer.id)}>
                  <Trash size={20} />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
