import { useState } from "react";
import { useRouter } from "next/router";
import { zodResolver } from "@hookform/resolvers/zod";
import { inferRouterOutputs } from "@trpc/server";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { AppRouter } from "@repo/api";
import { DRAFT_TYPES, STUDIO_SLOT_TYPES } from "@repo/api/src/enums";
import { createLeagueSessionInputObj } from "@repo/api/src/zod";

import { api } from "~/utils/api";
import { useArray } from "~/utils/hooks/use-array";
import { cn } from "~/utils/shadcn";
import ResponsiveDialog from "~/components/ResponsiveDialog";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "~/components/ui/breadcrumb";
import { Button } from "~/components/ui/button";
import { Form } from "~/components/ui/form";
import { useToast } from "~/components/ui/hooks/use-toast";
import { DetailsSection, DraftSection, MembersSection } from "./forms/Session";

type Steps = "details" | "draft" | "members";
type League = inferRouterOutputs<AppRouter>["ffLeague"]["getById"];

export default function NewSessionDialog({
  className,
  league,
  disabled,
}: {
  className: string;
  league: League;
  disabled?: boolean;
}) {
  const { data: sessionData } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<Steps>("details");
  const sessionMembers = useArray<string>(league?.members.map((e) => e.userId) ?? []);

  const { isLoading: creating, mutate: createSession } = api.ffLeagueSession.create.useMutation();

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

  const showDraftFields = form.watch("settings.draft.conduct");

  function onSubmit(values: z.infer<typeof formSchema>) {
    const leagueId = (router.query.leagueId as string | undefined) ?? "";
    const data = { ...values, leagueId, memberIds: sessionMembers.array };
    data.settings.draft.order = values.settings.draft.order?.filter((e) => e) ?? undefined;
    createSession(data, {
      onSuccess: (r) => {
        toast({
          title: "Session Created",
        });
        void router.push(`/fantasy-film/${leagueId}/${r.id}`);
      },
      onError: () => {
        toast({ title: "Unable to create session, check that all fields are filled in", variant: "destructive" });
      },
    });
  }

  const onInvalid = (errors: any) => console.log({ errors });

  function getCurrentStepForm(step: Steps) {
    switch (step) {
      case "details":
        return <DetailsSection />;
      case "members":
        return <MembersSection league={league} sessionMembers={sessionMembers} />;
      case "draft":
        return <DraftSection league={league} sessionMembers={sessionMembers} showDraftFields={showDraftFields} />;
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
    <ResponsiveDialog open={open} setOpen={setOpen}>
      <ResponsiveDialog.Trigger>
        <Button className={cn("", className)} disabled={disabled} onClick={() => setOpen(true)}>
          + Create Session
        </Button>
      </ResponsiveDialog.Trigger>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="mt-4 space-y-8">
          <ResponsiveDialog.Content
            className="max-w-2/3 max-h-[90%] w-2/3 overflow-y-auto"
            onPointerDownOutside={(event) => event.preventDefault()} // Prevent closing on outside click
            onEscapeKeyDown={(event) => event.preventDefault()}
            aria-describedby={undefined}
          >
            <ResponsiveDialog.Header>
              <ResponsiveDialog.Title>Create New Session</ResponsiveDialog.Title>

              <Breadcrumb className="pb-2 text-gray-400 lg:mb-0">
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
            </ResponsiveDialog.Header>

            {getCurrentStepForm(currentStep)}

            <ResponsiveDialog.Footer>
              <div className="ml-auto mt-4 flex gap-x-4 lg:mt-0">
                {currentStep !== "details" && <Button onClick={() => navigateForm("back")}>Back</Button>}
                {currentStep !== "draft" && (
                  <Button className="" onClick={() => navigateForm("next")}>
                    Next
                  </Button>
                )}
                {currentStep === "draft" && (
                  <Button type="submit" className="" isLoading={creating} onClick={() => onSubmit(form.getValues())}>
                    Create Session
                  </Button>
                )}
              </div>
            </ResponsiveDialog.Footer>
          </ResponsiveDialog.Content>
        </form>
      </Form>
    </ResponsiveDialog>
  );
}
