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

type AwardShow = RouterOutputs["awardShow"]["get"][number];

export default function AwardShowsAdmin() {
  const { toast } = useToast();
  const confirm = useConfirm();

  const [selectedShow, setSelectedShow] = useState<AwardShow>();

  const { data: awardShows, refetch: refresh } = api.awardShow.get.useQuery(undefined, {
    staleTime: ONE_DAY_IN_SECONDS,
  });

  return (
    <div className="flex w-full flex-col">
      <div className="mb-2 flex justify-between">
        <AwardShowFormSheet
          className="bg-primary h-10 w-max rounded-3xl px-4 py-2 text-slate-50 hover:bg-teal-700/90"
          refetch={refresh}
        >
          + Add
        </AwardShowFormSheet>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead></TableHead>
            <TableHead>Award Show</TableHead>
            <TableHead>Year</TableHead>
            <TableHead>Groups</TableHead>
            <TableHead>Entries</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {awardShows?.map((show, i) => (
            <TableRow key={i}>
              <TableCell onClick={() => setSelectedShow(show)}>
                <AwardShowFormSheet selectedShow={selectedShow} refetch={refresh}>
                  <Pencil />
                </AwardShowFormSheet>
              </TableCell>
              <TableCell>{show.awardShow.name}</TableCell>
              <TableCell>{show.year}</TableCell>
              <TableCell>{3}</TableCell>
              <TableCell>{8}</TableCell>
              <TableCell>
                <AwardShowCategoriesSheet selectedShow={selectedShow}>
                  <Button>Categories & Nominees</Button>
                </AwardShowCategoriesSheet>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function AwardShowFormSheet({
  children,
  className,
  selectedShow,
  refetch,
}: {
  children: React.ReactNode;
  className?: string;
  selectedShow?: AwardShow;
  refetch: () => void;
}) {
  const { toast } = useToast();

  const [open, setOpen] = useState(false);

  const { data: shows, refetch: refresh } = api.awardShow.getShows.useQuery(undefined, {
    staleTime: ONE_DAY_IN_SECONDS,
  });

  const { isLoading: creatingYear, mutate: createAwardShowYear } = api.awardShow.addYear.useMutation();

  const formSchema = z.object({
    awardShowId: z.string(),
    year: z.string(),
    available: z.date().optional(),
    locked: z.date(),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      awardShowId: "",
      year: String(new Date().getFullYear()),
      available: undefined,
      locked: new Date(),
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (values.awardShowId)
      createAwardShowYear(values, {
        onSuccess: () => {
          toast({
            title: "Award Show Created",
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
    if (selectedShow) {
      form.setValue("awardShowId", selectedShow.awardShowId);
      form.setValue("year", selectedShow.year);
      form.setValue("available", selectedShow.available ?? undefined);
      form.setValue("locked", selectedShow.locked);
    } else form.reset();
  }, [selectedShow]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className={className}>{children}</SheetTrigger>
      <SheetContent className="w-1/2">
        <SheetHeader>
          <SheetTitle>{selectedShow ? "Edit" : "New"} Award Show</SheetTitle>
          <SheetDescription>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-y-4">
                <FormField
                  control={form.control}
                  name="awardShowId"
                  render={({ field }) => (
                    <FormItem className="flex w-1/2 flex-col">
                      <FormLabel>
                        Show <AwardShowFormDialog />
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger className="text-black">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {shows?.map((e, i) => {
                            return (
                              <SelectItem key={i} value={e.id}>
                                {e.name}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="year"
                  render={({ field }) => (
                    <FormItem className="flex w-[400px] flex-col">
                      <FormLabel>Year</FormLabel>
                      <FormControl>
                        <Input {...field} className="w-[120px] text-black" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="available"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Available</FormLabel>
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
                          <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                        </PopoverContent>
                      </Popover>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="locked"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Locked</FormLabel>
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
                          <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                        </PopoverContent>
                      </Popover>
                    </FormItem>
                  )}
                />

                <Button type="submit" className="ml-auto w-fit" isLoading={creatingYear}>
                  Save
                </Button>
              </form>
            </Form>
          </SheetDescription>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  );
}

function AwardShowCategoriesSheet({
  children,
  className,
  selectedShow,
  refetch,
}: {
  children: React.ReactNode;
  className?: string;
  selectedShow?: AwardShow;
  refetch?: () => void;
}) {
  const { toast } = useToast();

  const [open, setOpen] = useState(false);

  const { data: shows, refetch: refresh } = api.awardShow.getShows.useQuery(undefined, {
    staleTime: ONE_DAY_IN_SECONDS,
  });

  const { isLoading: creatingYear, mutate: createAwardShowYear } = api.awardShow.addYear.useMutation();

  const formSchema = z.object({
    awardShowId: z.string(),
    year: z.string(),
    available: z.date().optional(),
    locked: z.date(),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      awardShowId: "",
      year: String(new Date().getFullYear()),
      available: undefined,
      locked: new Date(),
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (values.awardShowId)
      createAwardShowYear(values, {
        onSuccess: () => {
          toast({
            title: "Award Show Created",
          });
          setOpen(false);
          // refetch();
        },
        onError: (error) => {
          toast({ title: error.message, variant: "destructive" });
        },
      });
  }

  useEffect(() => {
    if (selectedShow) {
      form.setValue("awardShowId", selectedShow.awardShowId);
      form.setValue("year", selectedShow.year);
      form.setValue("available", selectedShow.available ?? undefined);
      form.setValue("locked", selectedShow.locked);
    }
  }, [selectedShow]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className={className}>{children}</SheetTrigger>
      <SheetContent className="w-3/4">
        <SheetHeader>
          <SheetTitle>{selectedShow ? "Edit" : "New"} Award Show</SheetTitle>
          <SheetDescription>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-y-4">
                CATEGORIES & NOMINEES
                <Button type="submit" className="ml-auto w-fit" isLoading={creatingYear}>
                  Save
                </Button>
              </form>
            </Form>
          </SheetDescription>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  );
}

function AwardShowFormDialog() {
  const { toast } = useToast();

  const [open, setOpen] = useState(false);

  const { isLoading: creating, mutate: createAwardShow } = api.awardShow.create.useMutation();

  const formSchema = z.object({
    slug: z.string(),
    name: z.string(),
    image: z.string(),
    website: z.string().optional(),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      slug: "",
      name: "",
      image: "",
      website: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    createAwardShow(values, {
      onSuccess: () => {
        toast({
          title: "Award Show Created",
        });
        setOpen(false);
        // refetch();
      },
      onError: (error) => {
        toast({ title: error.message, variant: "destructive" });
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="ml-2 hover:cursor-pointer">
        <Pencil size={16} />
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Award Show</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form className="my-2 flex flex-col gap-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="flex flex-col">
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
              name="slug"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Slug</FormLabel>
                  <FormControl>
                    <Input {...field} className="text-black" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="image"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Image</FormLabel>
                  <FormControl>
                    <Input {...field} className="text-black" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Website</FormLabel>
                  <FormControl>
                    <Input {...field} className="text-black" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="mt-2">
              <Button type="submit" className="float-right" isLoading={creating}>
                Save
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
