import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, sub } from "date-fns";
import { CalendarIcon, ChevronsUpDown, Pencil, Trash, X } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";

import { tournamentInputObject } from "@repo/api/src/router/tournament/zod";

import { api, RouterOutputs } from "~/utils/api";
import { cn } from "~/utils/shadcn";
import { TMDBImageInput } from "~/components/TMDBImageInput";
import { Button } from "~/components/ui/button";
import { Calendar } from "~/components/ui/calendar";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "~/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "~/components/ui/form";
import { useConfirm } from "~/components/ui/hooks/use-confirm";
import { useToast } from "~/components/ui/hooks/use-toast";
import { Input } from "~/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "~/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { ONE_DAY_IN_SECONDS } from "~/utils";

type Tournament = RouterOutputs["tournament"]["get"][number];
type TournamentEntry = RouterOutputs["tournament"]["get"][number]["entries"][number];

export default function TournamentAdmin() {
  const { toast } = useToast();
  const confirm = useConfirm();

  const [selectedTournament, setSelectedTournament] = useState<Tournament>();

  const { data: tournaments, refetch: refresh } = api.tournament.get.useQuery(undefined, {
    staleTime: ONE_DAY_IN_SECONDS,
  });

  return (
    <div className="flex w-full flex-col">
      <div className="mb-2 flex justify-between">
        <TournamentFormSheet
          className="bg-primary h-10 w-max rounded-3xl px-4 py-2 text-slate-50 hover:bg-teal-700/90"
          refetch={refresh}
        >
          + Add
        </TournamentFormSheet>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead></TableHead>
            <TableHead>Tournament</TableHead>
            <TableHead># Entries</TableHead>
            <TableHead>Start Date</TableHead>
            <TableHead>End Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tournaments?.map((tournament, i) => (
            <TableRow key={i}>
              <TableCell onClick={() => setSelectedTournament(tournament)}>
                <TournamentFormSheet selectedTournament={selectedTournament} refetch={refresh}>
                  <Pencil />
                </TournamentFormSheet>
              </TableCell>
              <TableCell>{tournament.name}</TableCell>
              <TableCell>{5}</TableCell>
              <TableCell>{3}</TableCell>
              <TableCell>{8}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function TournamentFormSheet({
  children,
  className,
  selectedTournament,
  refetch,
}: {
  children: React.ReactNode;
  className?: string;
  selectedTournament?: Tournament;
  refetch: () => void;
}) {
  const { toast } = useToast();

  const [open, setOpen] = useState(false);

  const { isLoading: creatingTournament, mutate: createTournament } = api.tournament.create.useMutation();
  const { isLoading: updatingTournament, mutate: updateTournament } = api.tournament.update.useMutation();

  const formSchema = tournamentInputObject;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id: undefined,
      name: "",
      description: "",
      rounds: [
        { tournamentId: "", startDate: new Date(), endDate: new Date() },
        { tournamentId: "", startDate: new Date(), endDate: new Date() },
      ],
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values);
    if (values.name.length && values.description.length)
      if (values.id)
        updateTournament(
          { ...values, id: values.id! },
          {
            onSuccess: () => {
              toast({
                title: "Tournament Updated",
              });
              setOpen(false);
              refetch();
            },
            onError: (error) => {
              toast({ title: error.message, variant: "destructive" });
            },
          },
        );
      else
        createTournament(values, {
          onSuccess: () => {
            toast({
              title: "Tournament Created",
            });
            setOpen(false);
            refetch();
          },
          onError: (error) => {
            toast({ title: error.message, variant: "destructive" });
          },
        });
  }

  useEffect(() => {
    if (selectedTournament) {
      form.setValue("id", selectedTournament.id ?? undefined);
      form.setValue("name", selectedTournament.name);
      form.setValue("description", selectedTournament.description);
      form.setValue("rounds", selectedTournament.rounds);
    } else form.reset();
  }, [selectedTournament]);

  const { fields, append, remove } = useFieldArray({
    name: "rounds",
    control: form.control,
  });

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className={className}>{children}</SheetTrigger>
      <SheetContent className="w-5/6">
        <SheetHeader>
          <SheetTitle>{selectedTournament ? "Edit" : "New"} Tournament</SheetTitle>
          <SheetDescription>
            <Form {...form}>
              <form className="flex">
                <div className="flex grow flex-col gap-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="flex w-[400px] flex-col">
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input {...field} className="text-black" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem className="flex w-[400px] flex-col">
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Input {...field} className="text-black" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="mr-8 flex flex-col gap-y-4">
                  {fields.map((field, index) => {
                    return (
                      <div className="ml-4" key={"nom-" + index}>
                        <div className="flex items-center space-x-2 text-lg">
                          <p className="mr-2 text-white">R{index + 1}</p>
                          <FormField
                            control={form.control}
                            name={`rounds.${index}.startDate`}
                            render={({ field }) => (
                              <FormItem className="flex flex-col">
                                <FormLabel>Start Date</FormLabel>
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
                                        {field.value ? (
                                          format(field.value, "PPP")
                                        ) : (
                                          <span className="text-black">Pick a date</span>
                                        )}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                      </Button>
                                    </FormControl>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0 text-black" align="start">
                                    <Calendar
                                      mode="single"
                                      selected={field.value}
                                      onSelect={field.onChange}
                                      initialFocus
                                    />
                                  </PopoverContent>
                                </Popover>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`rounds.${index}.endDate`}
                            render={({ field }) => (
                              <FormItem className="flex flex-col">
                                <FormLabel>End Date</FormLabel>
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
                                        {field.value ? (
                                          format(field.value, "PPP")
                                        ) : (
                                          <span className="text-black">Pick a date</span>
                                        )}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                      </Button>
                                    </FormControl>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0 text-black" align="start">
                                    <Calendar
                                      mode="single"
                                      selected={field.value}
                                      onSelect={field.onChange}
                                      initialFocus
                                    />
                                  </PopoverContent>
                                </Popover>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    );
                  })}
                  <Button
                    type="button"
                    className="w-fit"
                    onClick={() =>
                      append({
                        tournamentId: "",
                        startDate: new Date(),
                        endDate: new Date(),
                      })
                    }
                  >
                    Add Round
                  </Button>
                </div>

                <Button
                  className="ml-auto w-fit"
                  isLoading={creatingTournament || updatingTournament}
                  onClick={(e) => {
                    e.preventDefault();
                    onSubmit(form.getValues());
                  }}
                >
                  Save
                </Button>
              </form>
            </Form>

            <hr className="my-4"></hr>

            {selectedTournament?.id && (
              <EntryForm selectedTournament={selectedTournament} entries={selectedTournament.entries} />
            )}
          </SheetDescription>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  );
}

function EntryForm({ selectedTournament, entries }: { selectedTournament: Tournament; entries?: TournamentEntry[] }) {
  const { toast } = useToast();

  const { isLoading: saving, mutate: saveEntries } = api.tournament.saveEntries.useMutation();

  const formSchema = z.object({
    entries: z.array(
      z.object({
        id: z.string().optional(),
        tournamentId: z.string(),
        seed: z.number().optional(),
        name: z.string(),
        description: z.string().optional(),
        image: z.string().optional(),
      }),
    ),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      entries: [{ tournamentId: selectedTournament.id, seed: 0, name: "", description: "", image: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    name: "entries",
    control: form.control,
  });

  useEffect(() => {
    if (entries?.length) {
      form.reset({
        entries: entries.map((e) => ({
          id: e.id,
          tournamentId: e.tournamentId,
          seed: e.seed,
          name: e.name,
          description: e.description ?? undefined,
          image: e.image ?? undefined,
        })),
      });
    } else {
      form.reset({
        entries: [{ tournamentId: selectedTournament.id, seed: 0, name: "", description: "", image: "" }],
      });
    }
  }, [entries, form]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (values.entries.length) {
      const data = values.entries.map((e) => ({ ...e, tournamentId: selectedTournament.id }));
      saveEntries(data, {
        onSuccess: () => {
          toast({
            title: "Tournament Entries saved",
          });
        },
        onError: (error) => {
          toast({ title: error.message, variant: "destructive" });
        },
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-y-4">
        <div className="">
          <div className="mt-2 flex flex-col gap-y-4">
            {fields.map((field, index) => {
              return (
                <div className="ml-4" key={"nom-" + index}>
                  <div className="flex space-x-2">
                    <FormField
                      control={form.control}
                      name={`entries.${index}.name`}
                      render={({ field }) => (
                        <FormItem className="grow">
                          <FormLabel>Nominee #{index + 1} Name</FormLabel>
                          <FormControl>
                            <Input {...field} className="grow text-black" autoComplete="off" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`entries.${index}.description`}
                      render={({ field }) => (
                        <FormItem className="grow">
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Input {...field} className="grow text-black" autoComplete="off" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`entries.${index}.seed`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Seed</FormLabel>
                          <FormControl>
                            <Input {...field} className="text-black" autoComplete="off" type="number" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`entries.${index}.image`}
                      render={({ field }) => (
                        <FormItem className="grow">
                          <FormLabel>Image</FormLabel>
                          <FormControl>
                            <TMDBImageInput {...field} className="grow text-black" autoComplete="off" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              );
            })}
            <Button
              type="button"
              className="w-fit"
              onClick={() =>
                append({
                  tournamentId: selectedTournament.id,
                  name: "",
                  description: "",
                  image: "",
                  seed: 0,
                })
              }
            >
              Add Entry
            </Button>
          </div>
        </div>

        <div className="flex justify-between">
          <Button type="submit" className="w-fit" isLoading={saving}>
            Save Entries
          </Button>
        </div>
      </form>
    </Form>
  );
}
