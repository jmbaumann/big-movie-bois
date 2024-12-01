import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Pencil, Trash, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { DRAFT_TYPES, STUDIO_SLOT_TYPES } from "@repo/api/src/enums";
import { LeagueSessionSettings, updateLeagueSessionInputObj } from "@repo/api/src/router/fantasy-film/zod";
import { LeagueSession } from "@repo/db";

import { api } from "~/utils/api";
import { useArray } from "~/utils/hooks/use-array";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "~/components/ui/accordion";
import { Button } from "~/components/ui/button";
import { Form } from "~/components/ui/form";
import { useToast } from "~/components/ui/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { DetailsSection } from "~/features/fantasy-film/forms/Session";
import { ONE_DAY_IN_SECONDS } from "~/utils";

export default function PublicSessionsAdmin() {
  const { toast } = useToast();

  const { data: publicLeague, refetch } = api.ffLeague.getById.useQuery(
    { id: "cm18qkt8o00056e9iscpz7ym8" },
    { staleTime: ONE_DAY_IN_SECONDS },
  );
  const { isLoading: creating, mutate: createSession } = api.ffLeagueSession.create.useMutation();
  const { isLoading: updating, mutate: updateSession } = api.ffLeagueSession.update.useMutation();
  const { mutate: deleteSession } = api.ffLeagueSession.delete.useMutation();

  const isLoading = creating || updating;
  const sessionMembers = useArray<string>(publicLeague?.members.map((e) => e.userId) ?? []);

  const formSchema = updateLeagueSessionInputObj;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id: "",
      leagueId: "cm18qkt8o00056e9iscpz7ym8",
      name: "Q# YYYY - Bidding War",
      startDate: undefined,
      endDate: undefined,
      settings: {
        draft: {
          // skip: false,
          date: undefined,
          hour: "",
          min: "",
          ampm: "",
          type: DRAFT_TYPES.SNAKE,
          order: [],
          numRounds: 6,
          timePerRound: 120,
        },
        teamStructure: [
          { type: STUDIO_SLOT_TYPES.OPENING_WEEKEND_BOX_OFFICE, pos: 1 },
          { type: STUDIO_SLOT_TYPES.OPENING_WEEKEND_BOX_OFFICE, pos: 2 },
          { type: STUDIO_SLOT_TYPES.TMDB_RATING, pos: 3 },
          { type: STUDIO_SLOT_TYPES.TMDB_RATING, pos: 4 },
          { type: STUDIO_SLOT_TYPES.REVERSE_TMDB_RATING, pos: 5 },
        ],
      },
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values);
    if (!values.id)
      createSession(values, {
        onSuccess: (data) => {
          toast({
            title: "Session Created",
          });
          form.reset();
          refetch();
        },
        onError: (error) => {
          toast({ title: error.message, variant: "destructive" });
        },
      });
    else
      updateSession(values, {
        onSuccess: (data) => {
          toast({
            title: "Session Updated",
          });
          form.reset();
          refetch();
        },
        onError: (error) => {
          toast({ title: error.message, variant: "destructive" });
        },
      });
  }

  function handleEdit(session: LeagueSession) {
    form.setValue("id", session.id);
    form.setValue("name", session.name);
    form.setValue("startDate", session.startDate);
    form.setValue("endDate", session.endDate);
    form.setValue(
      "settings.teamStructure",
      JSON.parse(session.settings as string)!.teamStructure as LeagueSessionSettings["teamStructure"],
    );
  }

  function handleDelete(id: string) {
    deleteSession(
      { id },
      {
        onSuccess: () => {
          toast({
            title: "Session Deleted",
          });
          refetch();
        },
        onError: (error) => {
          toast({ title: error.message, variant: "destructive" });
        },
      },
    );
  }

  const onInvalid = (errors: any) => console.log({ errors });

  return (
    <div className="flex w-full flex-col">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit, onInvalid)}>
          <div className="float-right flex items-center gap-x-2">
            <Button type="button" size="icon" variant="ghost" onClick={() => form.reset()}>
              <X />
            </Button>
            <Button type="submit" onClick={() => onSubmit(form.getValues())} isLoading={isLoading}>
              Save
            </Button>
          </div>

          <Accordion className="w-5/6" type="single" collapsible>
            <AccordionItem value="settings">
              <AccordionTrigger>General</AccordionTrigger>
              <AccordionContent className="mt-2 space-y-8 px-4">
                <DetailsSection />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </form>
      </Form>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40px]"></TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Start Date</TableHead>
            <TableHead>End Date</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {publicLeague?.sessions?.map((session, i) => (
            <TableRow key={i}>
              <TableCell>
                <Button className="hover:text-primary" size="icon" variant="ghost" onClick={() => handleEdit(session)}>
                  <Pencil size={20} />
                </Button>
              </TableCell>
              <TableCell>{session.name}</TableCell>
              <TableCell>{format(session.startDate, "LLL dd, yyyy")}</TableCell>
              <TableCell>{format(session.endDate, "LLL dd, yyyy")}</TableCell>
              <TableCell>
                <Button size="icon" variant="destructive" onClick={() => handleDelete(session.id)}>
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
