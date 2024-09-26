import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon, Search, Trash } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";

import { api } from "~/utils/api";
import { cn } from "~/utils/shadcn";
import { Button } from "~/components/ui/button";
import { Calendar } from "~/components/ui/calendar";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "~/components/ui/command";
import { Form, FormControl, FormField, FormItem, FormLabel } from "~/components/ui/form";
import { useToast } from "~/components/ui/hooks/use-toast";
import { Input } from "~/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";

export default function PollsAdmin() {
  const { toast } = useToast();

  const [searchKeyword, setSearchKeyword] = useState<string>();

  const { data: search, isLoading: searching } = api.tmdb.search.useQuery(
    { keyword: searchKeyword ?? "" },
    { enabled: !!searchKeyword },
  );
  const { isLoading, mutate: createPoll } = api.poll.create.useMutation();

  const formSchema = z.object({
    text: z.string(),
    tmdbId: z.number().optional(),
    startDate: z.date().optional(),
    endDate: z.date().optional(),
    answers: z.array(z.object({ text: z.string() })),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      text: "",
      answers: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    name: "answers",
    control: form.control,
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    createPoll(values, {
      onSuccess: () => {
        toast({ title: "Poll created" });
      },
      onError: (error) => {
        toast({ title: error.message, variant: "destructive" });
      },
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 flex w-full space-x-10 px-2">
        <div className="flex w-1/2 flex-col space-y-2">
          <FormField
            control={form.control}
            name="text"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>Question</FormLabel>
                <FormControl>
                  <Input {...field} className="text-black" autoComplete="off" />
                </FormControl>
              </FormItem>
            )}
          />

          <div className="mt-1 w-full">
            <FormLabel>Answers</FormLabel>
            {fields.map((field, index) => {
              return (
                <FormField
                  control={form.control}
                  key={field.id}
                  name={`answers.${index}.text`}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="mt-2 flex items-center space-x-2">
                          <span>{index + 1}</span>
                          <Input {...field} className="text-black" autoComplete="off" />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="w-10 bg-white text-black hover:bg-red-600 hover:text-white"
                            onClick={() => remove(index)}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />
              );
            })}
            <Button type="button" size="sm" className="ml-4 mt-2" onClick={() => append({ text: "" })}>
              Add Answer
            </Button>
          </div>
        </div>

        <div className="flex w-1/2 flex-col space-y-2">
          <FormField
            control={form.control}
            name="tmdbId"
            render={({ field }) => (
              <FormItem className="mb-4 mt-2 flex w-full flex-col">
                <FormLabel>Movie</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        role="combobox"
                        className={cn("rounded-md text-black", !field.value && "text-muted-foreground")}
                      >
                        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                        {field.value ? search?.find((result) => result.id === field.value)?.title : "Select Movie"}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command shouldFilter={false}>
                      <CommandInput placeholder="Search for a movie" onValueChange={setSearchKeyword} />
                      {searching ? <CommandEmpty>Loading...</CommandEmpty> : <CommandEmpty>No results</CommandEmpty>}
                      <CommandList className="w-full">
                        <CommandGroup>
                          {search?.map((result) => (
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
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel className="flex items-center">Start Date</FormLabel>
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
                        <CalendarIcon className="ml-auto h-4 w-4 text-black opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                  </PopoverContent>
                </Popover>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel className="flex items-center">End Date</FormLabel>
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
                        <CalendarIcon className="ml-auto h-4 w-4 text-black opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                  </PopoverContent>
                </Popover>
              </FormItem>
            )}
          />

          <Button className="ml-auto mt-2" type="submit" isLoading={isLoading}>
            Save
          </Button>
        </div>
      </form>
    </Form>
  );
}
