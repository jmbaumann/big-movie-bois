import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { zodResolver } from "@hookform/resolvers/zod";
import { inferRouterOutputs } from "@trpc/server";
import { add, differenceInCalendarDays, format, sub } from "date-fns";
import { CalendarIcon, Info, Loader2, Trash } from "lucide-react";
import { useSession } from "next-auth/react";
import { useFieldArray, useForm, useFormContext } from "react-hook-form";
import { z } from "zod";

import { AppRouter } from "@repo/api";
import { DRAFT_TYPES, STUDIO_SLOT_TYPES } from "@repo/api/src/enums";
import { createLeagueSessionInputObj } from "@repo/api/src/zod";

import { api } from "~/utils/api";
import { isSessionStarted } from "~/utils/fantasy-film-helpers";
import { useArray, type UseArray } from "~/utils/hooks/use-array";
import { cn } from "~/utils/shadcn";
import SlotDescriptionDialog from "~/components/SlotDescriptionDialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "~/components/ui/accordion";
import { Button } from "~/components/ui/button";
import { Calendar } from "~/components/ui/calendar";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "~/components/ui/form";
import { useToast } from "~/components/ui/hooks/use-toast";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Switch } from "~/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";

type League = inferRouterOutputs<AppRouter>["ffLeague"]["getById"];
type Session = inferRouterOutputs<AppRouter>["ffLeagueSession"]["getById"];

export default function SessionForm({
  className,
  leagueId,
  session,
}: {
  className?: string;
  leagueId: string;
  session: Session;
}) {
  const { data: sessionData } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  const { mutate: updateSession, isLoading: saving } = api.ffLeagueSession.update.useMutation();
  const { data: league } = api.ffLeague.getById.useQuery({ id: leagueId });

  const sessionMembers = useArray<string>(league?.members.map((e) => e.userId) ?? []);

  useEffect(() => {
    sessionMembers.set(league?.members.map((e) => e.userId) ?? []);
  }, [league]);

  const formSchema = createLeagueSessionInputObj;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      leagueId: session?.leagueId,
      name: session?.name,
      startDate: session?.startDate,
      endDate: session?.endDate,
      settings: { ...session?.settings },
    },
  });

  const showDraftFields = form.watch("settings.draft.conduct");

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (session) {
      const data = {
        ...values,
        id: session.id,
        leagueId,
        startDate: new Date(values.startDate),
        endDate: new Date(values.endDate),
        memberIds: sessionMembers.array,
      };
      data.settings.draft.date = values.settings.draft.date ? new Date(values.settings.draft.date) : undefined;
      data.settings.draft.order = values.settings.draft.order?.filter((e) => e) ?? undefined;
      updateSession(data, {
        onSuccess: () => {
          toast({ title: "Settings saved" });
        },
        onError: (error) => {
          toast({ title: error.message, variant: "destructive" });
        },
      });
    }
  }

  const onInvalid = (errors: any) => console.log({ errors });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit, onInvalid)}>
        <Button className="float-right" type="submit" onClick={() => onSubmit(form.getValues())} isLoading={saving}>
          Save
        </Button>

        <Accordion className="w-5/6" type="single" collapsible>
          <AccordionItem value="settings">
            <AccordionTrigger>General</AccordionTrigger>
            <AccordionContent className="mt-2 space-y-8 px-4">
              <DetailsSection session={session} />
            </AccordionContent>
          </AccordionItem>
          {league && (
            <>
              {!session && (
                <AccordionItem value="members">
                  <AccordionTrigger>Members</AccordionTrigger>
                  <AccordionContent className="mt-2 space-y-8 px-4">
                    <MembersSection league={league} sessionMembers={sessionMembers} />
                  </AccordionContent>
                </AccordionItem>
              )}
              <AccordionItem value="draft">
                <AccordionTrigger>Draft</AccordionTrigger>
                <AccordionContent className="mt-2 space-y-8 px-4">
                  <DraftSection
                    league={league}
                    session={session}
                    sessionMembers={sessionMembers}
                    showDraftFields={showDraftFields}
                  />
                </AccordionContent>
              </AccordionItem>
            </>
          )}
        </Accordion>
      </form>
    </Form>
  );
}

export function DetailsSection({ session }: { session?: Session }) {
  const { data: sessionData } = useSession();
  const form = useFormContext();
  const { fields, append, remove } = useFieldArray({
    name: "settings.teamStructure",
    control: form.control,
  });

  const numExistingSlots = session?.settings.teamStructure.length ?? 0;

  return (
    <div className="flex flex-col gap-y-4">
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
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <div className="flex flex-col lg:flex-row lg:items-end lg:space-x-4">
        <FormField
          control={form.control}
          name="startDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel className="flex items-center">
                Start Date
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger className="ml-2 lg:ml-auto">
                      <Info size={20} />
                    </TooltipTrigger>
                    <TooltipContent>Sessions can be created up to 30 days in advance</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-[240px] text-left font-normal text-black lg:pl-3",
                        !field.value && "text-muted-foreground",
                      )}
                      disabled={!!session?.id}
                    >
                      {field.value ? format(field.value, "PPP") : <span className="text-black">Pick a date</span>}
                      <CalendarIcon className="ml-auto h-4 w-4 text-black opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) =>
                      !sessionData?.user.isAdmin &&
                      (date < sub(new Date(), { days: 1 }) || date > add(new Date(), { days: 30 }))
                    }
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
          name="endDate"
          render={({ field }) => (
            <FormItem className="mt-2 flex flex-col lg:mt-0">
              <FormLabel className="flex items-center">
                End Date
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger className="ml-2 lg:ml-auto">
                      <Info size={20} />
                    </TooltipTrigger>
                    <TooltipContent>Sessions can be between 30 & 365 days long</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-[240px] text-left font-normal text-black lg:pl-3",
                        !field.value && "text-muted-foreground",
                      )}
                      disabled={!!session?.id}
                    >
                      {field.value ? format(field.value, "PPP") : <span className="text-black">Pick a date</span>}
                      <CalendarIcon className="ml-auto h-4 w-4 text-black opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) =>
                      !sessionData?.user.isAdmin &&
                      (date < add(new Date(form.getValues().startDate), { days: 30 }) ||
                        date > add(new Date(form.getValues().startDate), { days: 366 }))
                    }
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
          <SlotDescriptionDialog className="ml-2" size={20} />
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
                          disabled={sessionStorage && index < numExistingSlots}
                        >
                          <SelectTrigger className="text-black lg:w-1/2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.values(STUDIO_SLOT_TYPES).map((slotType, i) => (
                              <SelectItem key={i} value={slotType}>
                                {slotType}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          className="bg-white text-black hover:bg-red-600 hover:text-white"
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => remove(index)}
                          disabled={sessionStorage && index < numExistingSlots}
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
    </div>
  );
}

export function MembersSection({ league, sessionMembers }: { league: League; sessionMembers: UseArray<string> }) {
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
          <p>{member.user.username}</p>
          {new Set(sessionMembers.array).has(member.userId) ? (
            <Button className="ml-auto" variant="destructive" onClick={() => handleRemove(member.userId)}>
              Remove
            </Button>
          ) : (
            <Button className="ml-auto" onClick={() => handleAdd(member.userId)}>
              Add
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}

export function DraftSection({
  league,
  session,
  sessionMembers,
  showDraftFields,
}: {
  league: League;
  session?: Session;
  sessionMembers: UseArray<string>;
  showDraftFields: boolean;
}) {
  const form = useFormContext();
  const members = sessionMembers.array.map((e) => ({
    id: e,
    name: league?.members.find((m) => m.userId === e)?.user.name,
  }));

  const sessionStarted = isSessionStarted(session);

  return (
    <div className="flex flex-col gap-y-4">
      <div className="flex px-4">
        <FormField
          control={form.control}
          name="settings.draft.conduct"
          render={({ field }) => (
            <FormItem className="flex items-center space-x-2">
              <Switch id="draft" checked={field.value} onCheckedChange={field.onChange} disabled={sessionStarted} />
              <Label htmlFor="draft" className="ml-2">
                Conduct a draft
              </Label>
            </FormItem>
          )}
        />
      </div>
      {showDraftFields && (
        <>
          <div className="flex flex-col px-4 lg:flex-row lg:items-end lg:space-x-4">
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
                </FormItem>
              )}
            />
            <div className="mt-2 flex gap-x-2">
              <FormField
                control={form.control}
                name="settings.draft.hour"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger className="w-[80px] text-black">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 12 }, (_, index) => (index + 1).toString().padStart(2, "0")).map(
                            (e) => {
                              return (
                                <SelectItem key={e} value={e}>
                                  {e}
                                </SelectItem>
                              );
                            },
                          )}
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger className="w-[80px] text-black">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 12 }, (_, index) => (index * 5).toString().padStart(2, "0")).map(
                            (e) => {
                              return (
                                <SelectItem key={e} value={e}>
                                  {e}
                                </SelectItem>
                              );
                            },
                          )}
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                            <span className="block p-2 text-center font-normal">{draftType}</span>
                          </div>
                        </FormLabel>
                      </FormItem>
                    ))}
                  </RadioGroup>
                </FormItem>
              )}
            />
          </div>
          <div className="flex gap-x-8 px-4">
            <FormField
              control={form.control}
              name="settings.draft.numRounds"
              render={({ field }) => (
                <FormItem className="">
                  <FormLabel>Number of Rounds</FormLabel>
                  <FormControl>
                    <Input {...field} className="w-[120px] text-black" type="number" min={0} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="settings.draft.timePerRound"
              render={({ field }) => (
                <FormItem className="">
                  <FormLabel>Time per Round (seconds)</FormLabel>
                  <FormControl>
                    <Input {...field} className="w-[120px] text-black" type="number" />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
          <div className="space-y-4 px-4">
            <Label className="mb-2">Draft Order</Label>
            {members.map((member, index) => {
              return (
                <FormField
                  control={form.control}
                  key={index}
                  name={`settings.draft.order.${index}`}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="mt-2 flex w-auto items-center space-x-2">
                          <span>{index + 1}</span>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger className="w-[300px] text-black">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {members.map((mem, i) => {
                                return (
                                  <SelectItem key={i} value={mem.id}>
                                    {mem.name}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
