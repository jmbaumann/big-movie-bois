import Link from "next/link";
import { useRouter } from "next/router";
import { inferRouterOutputs } from "@trpc/server";
import { format } from "date-fns";
import { ChevronLeft } from "lucide-react";
import { useSession } from "next-auth/react";

import { AppRouter } from "@repo/api";

import { api } from "~/utils/api";
import { getDraftDate } from "~/utils/fantasy-film-helpers";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import Layout from "~/layouts/main/Layout";
import DraftCountdown from "./DraftCountdown";
import StudioSlot from "./StudioSlot";

type Session = inferRouterOutputs<AppRouter>["ffLeagueSession"]["getById"];

export default function SessionDetailsPage() {
  const { data: sessionData } = useSession();
  const router = useRouter();
  const sessionId = router.query.sessionId as string;

  const {
    data: session,
    isLoading,
    refetch,
  } = api.ffLeagueSession.getById.useQuery(
    { id: sessionId },
    {
      enabled: !!sessionId,
    },
  );

  const draftComplete = true;
  // const draftComplete = session
  //   ? getDraftDate(session.settings.draft) < new Date()
  //   : false;

  if (!session) return <p>loading...</p>;

  return (
    <Layout showFooter>
      <div>
        <Link href={`/fantasy-film/${session.leagueId}`}>
          <Button variant="link" className="px-0">
            <ChevronLeft /> Back to League
          </Button>
        </Link>
        <div className="mb-4 flex items-center">
          <h1 className="text-2xl">{session.name}</h1>
        </div>

        <div className="">
          <Tabs defaultValue="home" className="w-full px-2 lg:px-4">
            <TabsList>
              <TabsTrigger value="home">Home</TabsTrigger>
              <TabsTrigger value="my-studio">My Studio</TabsTrigger>
              <TabsTrigger value="opposing-studios">
                Opposing Studios
              </TabsTrigger>
              {draftComplete && (
                <TabsTrigger value="standings">Standings</TabsTrigger>
              )}
              {draftComplete && (
                <TabsTrigger value="release-calendar">
                  Release Calendar
                </TabsTrigger>
              )}
              <TabsTrigger value="films">Films</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
            <TabsContent value="home">
              <Home session={session} />
            </TabsContent>
            <TabsContent value="my-studio">
              <MyStudio session={session} />
            </TabsContent>
            <TabsContent value="opposing-studios">
              <OpposingStudio />
            </TabsContent>
            <TabsContent value="standings">Standings</TabsContent>
            <TabsContent value="release-calendar">Release Calendar</TabsContent>
            <TabsContent value="films">Films</TabsContent>
            <TabsContent value="activity">Activity</TabsContent>
            <TabsContent value="settings">Settings</TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
}

function Home({ session }: { session: Session }) {
  const draftDate = getDraftDate(session!.settings.draft);

  return (
    <>
      <p>Home</p>

      <DraftCountdown draftDate={draftDate} />
    </>
  );
}

function MyStudio({ session }: { session: Session }) {
  const router = useRouter();

  const {
    data: studio,
    isLoading,
    refetch,
  } = api.ffLeagueSession.getMyStudio.useQuery(
    { sessionId: session?.id ?? "" },
    {
      enabled: !!session?.id,
    },
  );

  if (!studio) return <>no studios</>;

  return (
    <div className="w-full">
      <div className="mb-4 flex items-end text-2xl">
        <p className="flex items-center justify-center gap-x-2">
          {/* <StudioIcon icon={studio.image} /> */}
          {studio.name}
          {/* {studio.ownerId === sessionData?.user.id && refetchLeague && (
            <EditStudio studio={studio} refetchLeague={refetchLeague} />
          )} */}
        </p>
        <p className="ml-4 text-lg">(1st of 6)</p>
        <p className="ml-auto">0 pts</p>
      </div>
      <div className="grid grid-cols-3 gap-x-2 gap-y-4">
        {session?.settings.teamStructure.map((slot, i) => {
          const movie = studio.films.find((e) => e.slot === slot.pos);
          const locked = false; // movie ? isSlotLocked(slot, movie) : true;
          return (
            <StudioSlot
              key={i}
              slot={slot.type}
              // movie={movie}
              showScore
              locked={locked}
            />
          );
        })}
      </div>
    </div>
  );
}

function OpposingStudio() {
  const router = useRouter();
  const sessionId = router.query.sessionId as string;

  const {
    data: studios,
    isLoading,
    refetch,
  } = api.ffLeagueSession.getOpposingStudios.useQuery(
    { sessionId },
    {
      enabled: !!sessionId,
    },
  );

  return studios?.map((studio, i) => <div key={i}>{studio.name}</div>);
}
