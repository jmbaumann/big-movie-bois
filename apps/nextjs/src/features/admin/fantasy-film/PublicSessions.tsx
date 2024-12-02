import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Pencil, Trash, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { DRAFT_TYPES, STUDIO_SLOT_TYPES } from "@repo/api/src/enums";
import { LeagueSessionSettings, updateLeagueSessionInputObj } from "@repo/api/src/router/fantasy-film/zod";
import { LeagueSession } from "@repo/db";

import { api, RouterOutputs } from "~/utils/api";
import { useArray } from "~/utils/hooks/use-array";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "~/components/ui/accordion";
import { Button } from "~/components/ui/button";
import { Form } from "~/components/ui/form";
import { useConfirm } from "~/components/ui/hooks/use-confirm";
import { useToast } from "~/components/ui/hooks/use-toast";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "~/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { DetailsSection } from "~/features/fantasy-film/forms/Session";
import { ONE_DAY_IN_SECONDS } from "~/utils";

type League = RouterOutputs["ffLeague"]["getById"];
type Session = NonNullable<League>["sessions"][number];

export default function PublicSessionsAdmin() {
  const { toast } = useToast();
  const confirm = useConfirm();

  const [selectedSession, setSelectedSession] = useState<Session>();

  const { data: publicLeague, refetch } = api.ffLeague.getById.useQuery(
    { id: "cm18qkt8o00056e9iscpz7ym8" },
    { staleTime: ONE_DAY_IN_SECONDS },
  );
  const { mutate: deleteSession } = api.ffLeagueSession.delete.useMutation();

  async function handleDelete(id: string) {
    const ok = await confirm("Are you sure you want to delete this Session?");
    if (ok)
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

  return (
    <div className="flex w-full flex-col">
      <SessionFormSheet
        className="bg-primary h-10 w-max rounded-3xl px-4 py-2 text-slate-50 hover:bg-teal-700/90"
        refetch={refetch}
      >
        + New Session
      </SessionFormSheet>

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
              <TableCell onClick={() => setSelectedSession(session)}>
                <SessionFormSheet selectedSession={selectedSession} refetch={refetch}>
                  <Pencil size={20} />
                </SessionFormSheet>
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

function SessionFormSheet({
  children,
  className,
  selectedSession,
  refetch,
}: {
  children: React.ReactNode;
  className?: string;
  selectedSession?: Session;
  refetch: () => void;
}) {
  const { toast } = useToast();
  const confirm = useConfirm();

  const [open, setOpen] = useState(false);

  const { isLoading: creating, mutate: createSession } = api.ffLeagueSession.create.useMutation();
  const { isLoading: updating, mutate: updateSession } = api.ffLeagueSession.update.useMutation();

  const isLoading = creating || updating;

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

  useEffect(() => {
    if (selectedSession) {
      form.setValue("id", selectedSession.id);
      form.setValue("name", selectedSession.name);
      form.setValue("startDate", selectedSession.startDate);
      form.setValue("endDate", selectedSession.endDate);
      form.setValue("settings.teamStructure", selectedSession.settings.teamStructure);
    }
  }, [selectedSession]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values);
    values.settings.draft.conduct = false;
    if (!values.id)
      createSession(values, {
        onSuccess: (data) => {
          toast({
            title: "Session Created",
          });
          form.reset();
          refetch();
          setOpen(false);
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
          setOpen(false);
        },
        onError: (error) => {
          toast({ title: error.message, variant: "destructive" });
        },
      });
  }

  const onInvalid = (errors: any) => console.log({ errors });

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className={className}>{children}</SheetTrigger>
      <SheetContent className="w-1/2">
        <SheetHeader>
          <SheetTitle>{selectedSession ? "Edit" : "New"} Session</SheetTitle>
          <SheetDescription>
            <Form {...form}>
              <form className="space-y-8" onSubmit={form.handleSubmit(onSubmit, onInvalid)}>
                <DetailsSection />

                <Button className="mt-4" type="submit" onClick={() => onSubmit(form.getValues())} isLoading={isLoading}>
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
