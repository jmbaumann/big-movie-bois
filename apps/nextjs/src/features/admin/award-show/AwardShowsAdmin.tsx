import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, sub } from "date-fns";
import { CalendarIcon, ChevronsUpDown, Pencil, Trash, X } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";

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

type AwardShow = RouterOutputs["awardShow"]["get"][number];
type Category = RouterOutputs["awardShow"]["get"][number]["categories"][number];

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
              <TableCell onClick={() => setSelectedShow(show)}>
                <AwardShowCategoriesSheet selectedShow={selectedShow} refetch={refresh}>
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
  const { isLoading: updatingYear, mutate: updateAwardShowYear } = api.awardShow.updateYear.useMutation();

  const formSchema = z.object({
    id: z.string().optional(),
    awardShowId: z.string(),
    year: z.string(),
    available: z.date().optional(),
    locked: z.date(),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id: undefined,
      awardShowId: "",
      year: String(new Date().getFullYear()),
      available: undefined,
      locked: new Date(),
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (values.awardShowId)
      if (values.id)
        updateAwardShowYear(
          { ...values, id: values.id! },
          {
            onSuccess: () => {
              toast({
                title: "Award Show Updated",
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
      form.setValue("id", selectedShow.id ?? undefined);
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

                <Button type="submit" className="ml-auto w-fit" isLoading={creatingYear || updatingYear}>
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
  refetch: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category>();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className={className}>{children}</SheetTrigger>
      <SheetContent className="w-3/4">
        <SheetHeader>
          <SheetTitle>
            {selectedShow?.awardShow.name} {selectedShow?.year} - CATEGORIES & NOMINEES
          </SheetTitle>
          <SheetDescription>
            {!showNewForm && <Button onClick={() => setShowNewForm(true)}>+ Add Category</Button>}

            {showNewForm && (
              <CategoryForm
                key="new-form"
                selectedShow={selectedShow}
                selectedCategory={selectedCategory}
                setShowNewForm={setShowNewForm}
                setSelectedCategory={setSelectedCategory}
                refetch={refetch}
              />
            )}

            <div className="mt-4">
              {selectedShow?.categories.map((category, i) => {
                if (selectedCategory?.id === category.id)
                  return (
                    <CategoryForm
                      key={`edit-form-${category.id}`}
                      selectedShow={selectedShow}
                      selectedCategory={selectedCategory}
                      setShowNewForm={setShowNewForm}
                      setSelectedCategory={setSelectedCategory}
                      refetch={refetch}
                    />
                  );
                else
                  return (
                    <div key={i} className="my-2">
                      <div className="flex items-center">
                        <Button
                          className="mr-1"
                          size="icon"
                          variant="ghost"
                          onClick={() => setSelectedCategory(category)}
                        >
                          <Pencil size={20} />
                        </Button>
                        <p className="inline-block text-xl text-white">{category.name}</p>
                      </div>

                      <div className="mt-2 flex justify-around">
                        {category.nominees.map((nominee, j) => (
                          <div key={j + "-" + i} className="flex">
                            {nominee.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
              })}
            </div>
          </SheetDescription>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  );
}

function CategoryForm({
  selectedShow,
  selectedCategory,
  setShowNewForm,
  setSelectedCategory,
  refetch,
}: {
  selectedShow?: AwardShow;
  selectedCategory?: Category;
  setShowNewForm: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedCategory: React.Dispatch<React.SetStateAction<Category | undefined>>;
  refetch: () => void;
}) {
  const { toast } = useToast();

  const { isLoading: saving, mutate: saveCategories } = api.awardShow.saveCategories.useMutation();

  const formSchema = z.object({
    id: z.string().optional(),
    awardShowYearId: z.string(),
    name: z.string(),
    order: z.number(),
    nominees: z
      .array(
        z.object({
          id: z.string().optional(),
          name: z.string(),
          subtext: z.string().optional(),
          image: z.string().optional(),
          tmdbId: z.coerce.number().optional(),
        }),
      )
      .optional(),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      awardShowYearId: selectedShow?.id,
      order: (selectedShow?.categories.length ?? 0) + 1,
      nominees: [{ name: "", image: "", tmdbId: undefined }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    name: "nominees",
    control: form.control,
  });

  useEffect(() => {
    if (selectedCategory) {
      form.reset({
        id: selectedCategory.id,
        awardShowYearId: selectedCategory.awardShowYearId,
        name: selectedCategory.name,
        order: selectedCategory.order,
        nominees: selectedCategory.nominees?.map((e) => ({
          id: e.id ?? undefined,
          name: e.name || "",
          subtext: e.subtext || "",
          image: e.image || "",
          tmdbId: e.tmdbId || undefined,
        })) || [{ name: "", image: "", tmdbId: undefined }],
      });
    } else {
      form.reset({
        awardShowYearId: selectedShow?.id,
        order: (selectedShow?.categories.length ?? 0) + 1,
        nominees: [{ name: "", subtext: "", image: "", tmdbId: undefined }],
      });
    }
  }, [selectedCategory, form]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    saveCategories(values, {
      onSuccess: () => {
        toast({
          title: "Category & Nominees saved",
        });
        refetch();
        setShowNewForm(false);
      },
      onError: (error) => {
        toast({ title: error.message, variant: "destructive" });
      },
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-y-4">
        <div className="">
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
          <div className="mt-2 flex flex-col gap-y-4">
            {fields.map((field, index) => {
              return (
                <div className="ml-4" key={"nom-" + index}>
                  <div className="flex space-x-2">
                    <FormField
                      control={form.control}
                      name={`nominees.${index}.name`}
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
                      name={`nominees.${index}.subtext`}
                      render={({ field }) => (
                        <FormItem className="grow">
                          <FormLabel>Subtext</FormLabel>
                          <FormControl>
                            <Input {...field} className="grow text-black" autoComplete="off" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`nominees.${index}.image`}
                      render={({ field }) => (
                        <FormItem className="grow">
                          <FormLabel>Image</FormLabel>
                          <FormControl>
                            <TMDBImageInput {...field} className="grow text-black" autoComplete="off" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`nominees.${index}.tmdbId`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>TMDB ID</FormLabel>
                          <FormControl>
                            <Input {...field} className="text-black" autoComplete="off" />
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
                  name: "",
                  image: "",
                  tmdbId: undefined,
                })
              }
            >
              Add Nominee
            </Button>
          </div>
        </div>

        <div className="flex justify-between">
          <Button
            type="button"
            className="w-fit"
            variant="destructive"
            onClick={() => {
              setShowNewForm(false);
              setSelectedCategory(undefined);
            }}
          >
            Cancel
          </Button>
          <Button type="submit" className="w-fit" isLoading={saving}>
            Save
          </Button>
        </div>
      </form>
    </Form>
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
