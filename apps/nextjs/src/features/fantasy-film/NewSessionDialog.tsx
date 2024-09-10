import { useState } from "react";
import { useRouter } from "next/router";
import { zodResolver } from "@hookform/resolvers/zod";
import { inferRouterOutputs } from "@trpc/server";
import { format, sub } from "date-fns";
import { CalendarIcon, Loader2, Trash } from "lucide-react";
import { useSession } from "next-auth/react";
import { useFieldArray, useForm, useFormContext } from "react-hook-form";
import { z } from "zod";

import { AppRouter } from "@repo/api";
import { DRAFT_TYPES, STUDIO_SLOT_TYPES } from "@repo/api/src/enums";
import { createLeagueSessionInputObj } from "@repo/api/src/zod";

import { api } from "~/utils/api";
import { useArray, type UseArray } from "~/utils/hooks/use-array";
import { cn } from "~/utils/shadcn";
import SlotDescriptionDialog from "~/components/SlotDescriptionDialog";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "~/components/ui/breadcrumb";
import { Button } from "~/components/ui/button";
import { Calendar } from "~/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "~/components/ui/form";
import { useToast } from "~/components/ui/hooks/use-toast";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Switch } from "~/components/ui/switch";

type Steps = "details" | "draft" | "members";
type League = inferRouterOutputs<AppRouter>["ffLeague"]["getById"];

export default function NewSessionDialog({
  className,
  league,
}: {
  className: string;
  league: League;
}) {
  const { data: sessionData } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState<Steps>("details");
  const sessionMembers = useArray<string>(
    league?.members.map((e) => e.userId) ?? [],
  );

  const { isLoading, mutate: createSession } =
    api.ffLeagueSession.create.useMutation();

  const formSchema = createLeagueSessionInputObj;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      leagueId: (router.query.leagueId as string | undefined) ?? "",
      name: "",
      startDate: undefined,
      endDate: undefined,
      settings: {
        draft: {
          date: undefined,
          hour: "",
          min: "",
          ampm: "",
          type: DRAFT_TYPES.SNAKE,
          order: [],
          numRounds: 0,
          timePerRound: 120,
        },
        teamStructure: [
          { type: STUDIO_SLOT_TYPES.TOTAL_BOX_OFFICE, pos: 1 },
          { type: STUDIO_SLOT_TYPES.OPENING_WEEKEND_BOX_OFFICE, pos: 2 },
          { type: STUDIO_SLOT_TYPES.OPENING_WEEKEND_BOX_OFFICE, pos: 3 },
          { type: STUDIO_SLOT_TYPES.IMDB_RATING, pos: 4 },
          { type: STUDIO_SLOT_TYPES.IMDB_RATING, pos: 5 },
          { type: STUDIO_SLOT_TYPES.REVERSE_IMDB_RATING, pos: 6 },
        ],
      },
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    const leagueId = (router.query.leagueId as string | undefined) ?? "";
    console.log({ ...values, leagueId, members: sessionMembers });
    createSession(
      { ...values, leagueId },
      {
        onSuccess: (data) => {
          toast({
            title: "Session Created",
          });
          void router.push(`/fantasy-film/${leagueId}/${data.slug}`);
        },
        onError: (error) => {
          toast({ title: error.message, variant: "destructive" });
        },
      },
    );
  }

  const onInvalid = (errors: any) => console.log({ errors });

  function getCurrentStepForm(step: Steps) {
    switch (step) {
      case "details":
        return <DetailsSection />;
      case "members":
        return (
          <MembersSection league={league} sessionMembers={sessionMembers} />
        );
      case "draft":
        return <DraftSection />;
    }
  }

  function navigateForm(action: "back" | "next") {
    switch (currentStep) {
      case "details":
        setCurrentStep("members");
        break;
      case "members":
        setCurrentStep(action === "back" ? "details" : "draft");
        break;
      case "draft":
        setCurrentStep("members");
        break;
    }
  }

  return (
    <Dialog>
      <DialogTrigger
        className={cn(
          "bg-primary inline-flex h-10 items-center justify-center whitespace-nowrap rounded-3xl px-4 py-2 text-sm font-medium text-slate-50 hover:bg-teal-700/90",
          className,
        )}
      >
        + Create Session
      </DialogTrigger>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit, onInvalid)}
          className="mt-4 space-y-8"
        >
          <DialogContent
            className="max-w-2/3 max-h-[90%] w-2/3 overflow-y-auto"
            onPointerDownOutside={(event) => event.preventDefault()} // Prevent closing on outside click
            onEscapeKeyDown={(event) => event.preventDefault()}
            aria-describedby={undefined}
          >
            <DialogHeader>
              <DialogTitle>Create New Session</DialogTitle>

              <Breadcrumb className="text-gray-400">
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbPage
                      className={currentStep === "details" ? "text-white" : ""}
                    >
                      Details
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage
                      className={currentStep === "members" ? "text-white" : ""}
                    >
                      Members
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage
                      className={currentStep === "draft" ? "text-white" : ""}
                    >
                      Draft
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </DialogHeader>

            {getCurrentStepForm(currentStep)}

            <DialogFooter>
              <>
                {currentStep !== "details" && (
                  <Button onClick={() => navigateForm("back")}>Back</Button>
                )}
                {currentStep !== "draft" && (
                  <Button
                    className="float-right"
                    onClick={() => navigateForm("next")}
                  >
                    Next
                  </Button>
                )}
                {currentStep === "draft" && (
                  <Button
                    type="submit"
                    className="float-right"
                    isLoading={false}
                    onClick={() => onSubmit(form.getValues())}
                  >
                    Create Session
                  </Button>
                )}
              </>
            </DialogFooter>
          </DialogContent>
        </form>
      </Form>
    </Dialog>
  );
}

function DetailsSection() {
  const form = useFormContext();
  const { fields, append, remove } = useFieldArray({
    name: "settings.teamStructure",
    control: form.control,
  });

  return (
    <>
      <div className="flex w-full items-center space-x-10">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className="w-2/3">
              <FormLabel>Session Name</FormLabel>
              <FormControl>
                <Input {...field} className="text-black" autoComplete="off" />
              </FormControl>
            </FormItem>
          )}
        />
      </div>
      <div className="flex items-end space-x-4">
        <FormField
          control={form.control}
          name="startDate"
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
                      <CalendarIcon className="ml-auto h-4 w-4 text-black opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) => date < sub(new Date(), { days: 1 })}
                    initialFocus
                  />
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
                      <CalendarIcon className="ml-auto h-4 w-4 text-black opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) => date < sub(new Date(), { days: 1 })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </FormItem>
          )}
        />
      </div>

      <div className="">
        <div className="flex items-center">
          <Label className="flex items-center">Studio Structure</Label>
          <SlotDescriptionDialog className="ml-2" />
        </div>
        <div className="space-y-4 px-4">
          {fields.map((field, index) => {
            return (
              <FormField
                control={form.control}
                key={field.id}
                name={`settings.teamStructure.${index}.type`}
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="mt-2 flex items-center space-x-2">
                        <span>{index + 1}</span>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <SelectTrigger className="w-1/2 text-black">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.values(STUDIO_SLOT_TYPES).map(
                              (slotType, i) => (
                                <SelectItem key={i} value={slotType}>
                                  {slotType}
                                </SelectItem>
                              ),
                            )}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="bg-white text-black hover:bg-red-600 hover:text-white"
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
          <Button
            type="button"
            size="sm"
            className="ml-4 mt-2"
            onClick={() =>
              append({
                type: STUDIO_SLOT_TYPES.TOTAL_BOX_OFFICE,
                pos: fields.length + 1,
              })
            }
          >
            Add Slot
          </Button>
        </div>
      </div>
    </>
  );
}

function MembersSection({
  league,
  sessionMembers,
}: {
  league: League;
  sessionMembers: UseArray<string>;
}) {
  const form = useFormContext();
  console.log(sessionMembers);

  function handleRemove(userId: string) {
    sessionMembers.removeValue(userId);
  }
  function handleAdd(userId: string) {
    sessionMembers.add(userId);
  }

  return (
    <div className="mb-4 flex flex-col space-y-4">
      {league?.members.map((member, i) => (
        <div key={i} className="flex items-center">
          <span className="mr-2 h-10 w-10 rounded-full bg-blue-400"></span>
          <p>{member.user.name}</p>
          {new Set(sessionMembers.array).has(member.userId) ? (
            <Button
              className="ml-auto"
              variant="destructive"
              onClick={() => handleRemove(member.userId)}
            >
              Remove
            </Button>
          ) : (
            <Button
              className="ml-auto"
              variant="destructive"
              onClick={() => handleAdd(member.userId)}
            >
              Add
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}

function DraftSection() {
  const form = useFormContext();
  return (
    <>
      <div className="flex items-end space-x-4">
        <FormField
          control={form.control}
          name="settings.draft.date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Draft Date</FormLabel>
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
                    disabled={(date) => date < sub(new Date(), { days: 1 })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="settings.draft.hour"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <SelectTrigger className="w-[80px] text-black">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, index) =>
                      (index + 1).toString().padStart(2, "0"),
                    ).map((e) => {
                      return (
                        <SelectItem key={e} value={e}>
                          {e}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="settings.draft.min"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <SelectTrigger className="w-[80px] text-black">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, index) =>
                      (index * 5).toString().padStart(2, "0"),
                    ).map((e) => {
                      return (
                        <SelectItem key={e} value={e}>
                          {e}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="settings.draft.ampm"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <SelectTrigger className="w-[80px] text-black">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AM">AM</SelectItem>
                    <SelectItem value="PM">PM</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
            </FormItem>
          )}
        />
      </div>
      <div className="mb-4 space-y-4 px-4">
        <FormField
          control={form.control}
          name="settings.draft.type"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <RadioGroup
                onValueChange={field.onChange}
                defaultValue={field.value}
                className="grid max-w-md grid-cols-2 gap-8 pt-2"
              >
                {Object.values(DRAFT_TYPES).map((draftType, i) => (
                  <FormItem key={i}>
                    <FormLabel className="[&:has([data-state=checked])>div]:border-primary">
                      <FormControl>
                        <RadioGroupItem value={draftType} className="sr-only" />
                      </FormControl>
                      <div className="border-muted hover:border-accent items-center rounded-md border-2 p-1 hover:cursor-pointer">
                        <span className="block p-2 text-center font-normal">
                          {draftType}
                        </span>
                      </div>
                    </FormLabel>
                  </FormItem>
                ))}
              </RadioGroup>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="settings.draft.timePerRound"
          render={({ field }) => (
            <FormItem className="w-1/2">
              <FormLabel>Time per Round (seconds)</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  className="w-[120px] text-black"
                  type="number"
                />
              </FormControl>
            </FormItem>
          )}
        />
      </div>
    </>
  );
}
