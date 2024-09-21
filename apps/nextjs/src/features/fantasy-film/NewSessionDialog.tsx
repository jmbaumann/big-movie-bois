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
import { Form, FormControl, FormField, FormItem, FormLabel } from "~/components/ui/form";
import { useToast } from "~/components/ui/hooks/use-toast";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Switch } from "~/components/ui/switch";
import { DetailsSection, DraftSection, MembersSection } from "./forms/Session";

type Steps = "details" | "draft" | "members";
type League = inferRouterOutputs<AppRouter>["ffLeague"]["getById"];

export default function NewSessionDialog({ className, league }: { className: string; league: League }) {
  const { data: sessionData } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState<Steps>("details");
  const sessionMembers = useArray<string>(league?.members.map((e) => e.userId) ?? []);

  const { isLoading, mutate: createSession } = api.ffLeagueSession.create.useMutation();

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
          numRounds: 6,
          timePerRound: 120,
        },
        teamStructure: [
          { type: STUDIO_SLOT_TYPES.TOTAL_BOX_OFFICE, pos: 1 },
          { type: STUDIO_SLOT_TYPES.OPENING_WEEKEND_BOX_OFFICE, pos: 2 },
          { type: STUDIO_SLOT_TYPES.OPENING_WEEKEND_BOX_OFFICE, pos: 3 },
          { type: STUDIO_SLOT_TYPES.TMDB_RATING, pos: 4 },
          { type: STUDIO_SLOT_TYPES.TMDB_RATING, pos: 5 },
          { type: STUDIO_SLOT_TYPES.REVERSE_TMDB_RATING, pos: 6 },
        ],
      },
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    const leagueId = (router.query.leagueId as string | undefined) ?? "";
    createSession(
      { ...values, leagueId, memberIds: sessionMembers.array },
      {
        onSuccess: (data) => {
          toast({
            title: "Session Created",
          });
          void router.push(`/fantasy-film/${leagueId}/${data.id}`);
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
        return <MembersSection league={league} sessionMembers={sessionMembers} />;
      case "draft":
        return <DraftSection league={league} sessionMembers={sessionMembers} />;
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
        <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="mt-4 space-y-8">
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
                    <BreadcrumbPage className={currentStep === "details" ? "text-white" : ""}>Details</BreadcrumbPage>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage className={currentStep === "members" ? "text-white" : ""}>Members</BreadcrumbPage>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage className={currentStep === "draft" ? "text-white" : ""}>Draft</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </DialogHeader>

            {getCurrentStepForm(currentStep)}

            <DialogFooter>
              <>
                {currentStep !== "details" && <Button onClick={() => navigateForm("back")}>Back</Button>}
                {currentStep !== "draft" && (
                  <Button className="float-right" onClick={() => navigateForm("next")}>
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
