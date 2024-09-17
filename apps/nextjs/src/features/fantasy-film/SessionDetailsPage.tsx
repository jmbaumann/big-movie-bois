import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { inferRouterOutputs } from "@trpc/server";
import { format, nextTuesday } from "date-fns";
import { ChevronLeft, Info } from "lucide-react";
import { useSession } from "next-auth/react";

import { AppRouter } from "@repo/api";
import { StudioFilm } from "@repo/db";

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
import Loading from "~/layouts/main/Loading";
import { ONE_DAY_IN_SECONDS } from "~/utils";
import AvailableFilms from "./AvailableFilms";
import DraftCountdown from "./DraftCountdown";
import SessionForm from "./forms/Session";
import StudioSlot from "./StudioSlot";

type Session = inferRouterOutputs<AppRouter>["ffLeagueSession"]["getById"];
type TMDBMovie = inferRouterOutputs<AppRouter>["tmdb"]["getById"];
type StudioFilmDetails = StudioFilm & { tmdb: TMDBMovie };

export default function SessionDetailsPage() {
  const { data: sessionData } = useSession();
  const router = useRouter();
  const sessionId = router.query.sessionId as string;

  const [activeTab, setActiveTab] = useState("home");
  const handleTab = (tab: string) => {
    void router.push({
      pathname: `/fantasy-film/${router.query.leagueId}/${router.query.sessionId}`,
      query: { tab },
    });
  };
  useEffect(() => {
    if (router.query.tab) setActiveTab(router.query.tab as string);
  }, [router.query.tab]);

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

  if (!session) return <Loading />;

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
          <Tabs
            className="w-full px-2 lg:px-4"
            value={activeTab}
            onValueChange={setActiveTab}
          >
            <TabsList>
              <TabsTrigger value="home" onClick={() => handleTab("home")}>
                Home
              </TabsTrigger>
              <TabsTrigger
                value="my-studio"
                onClick={() => handleTab("my-studio")}
              >
                My Studio
              </TabsTrigger>
              <TabsTrigger
                value="opposing-studios"
                onClick={() => handleTab("opposing-studios")}
              >
                Opposing Studios
              </TabsTrigger>
              {draftComplete && (
                <TabsTrigger
                  value="standings"
                  onClick={() => handleTab("standings")}
                >
                  Standings
                </TabsTrigger>
              )}
              {/* {draftComplete && (
                <TabsTrigger
                  value="release-calendar"
                  onClick={() => handleTab("release-calendar")}
                >
                  Release Calendar
                </TabsTrigger>
              )} */}
              <TabsTrigger value="films" onClick={() => handleTab("films")}>
                Films
              </TabsTrigger>
              <TabsTrigger value="bids" onClick={() => handleTab("bids")}>
                Bids
              </TabsTrigger>
              <TabsTrigger
                value="activity"
                onClick={() => handleTab("activity")}
              >
                Activity
              </TabsTrigger>
              {session.league.ownerId === sessionData?.user.id && (
                <TabsTrigger
                  value="settings"
                  onClick={() => handleTab("settings")}
                >
                  Settings
                </TabsTrigger>
              )}
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
            <TabsContent value="films">
              <Films session={session} />
            </TabsContent>
            <TabsContent value="bids">
              <Bids session={session} />
            </TabsContent>
            <TabsContent value="activity">Activity</TabsContent>
            <TabsContent value="settings">
              <Settings session={session} />
            </TabsContent>
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

      <Link href={`/fantasy-film/draft/${session!.id}`}>Go to Draft</Link>
    </>
  );
}

function MyStudio({ session }: { session: Session }) {
  const router = useRouter();

  const {
    data: studio,
    isLoading,
    refetch,
  } = api.ffStudio.getMyStudio.useQuery(
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
          const film = studio.films.find((e) => e.slot === slot.pos);
          const locked = false; // film ? isSlotLocked(slot, film) : true;
          return (
            <StudioSlot
              key={i}
              session={session}
              slot={slot.type}
              film={film as StudioFilmDetails}
              showScore
              locked={locked}
              refreshStudio={refetch}
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

  const { data: studios } = api.ffStudio.getOpposingStudios.useQuery(
    { sessionId },
    {
      enabled: !!sessionId,
    },
  );

  return studios?.map((studio, i) => <div key={i}>{studio.name}</div>);
}

function Films({ session }: { session: Session }) {
  const { data: sessionData } = useSession();

  const { data, isLoading } = api.tmdb.getFilmsForSession.useQuery(
    { sessionId: session?.id ?? "", today: true },
    { staleTime: 1000 * 60 * 60 * 24, enabled: !!session?.id },
  );
  const { data: acquiredFilms } = api.ffLeagueSession.getAcquiredFilms.useQuery(
    { sessionId: session?.id ?? "" },
    { staleTime: 1000 * 60 * 60 * 24, enabled: !!session?.id },
  );

  const acquiredIds = acquiredFilms?.map((e) => e.tmdbId);
  const films = data?.results.filter((e) => !acquiredIds?.includes(e.id));

  const myStudio = session?.studios.find(
    (e) => e.ownerId === sessionData?.user.id,
  );

  if (!data?.results || !myStudio || !films) return <p>no films</p>;

  return (
    <AvailableFilms
      session={session}
      films={films}
      studioId={myStudio.id}
      canPick={true}
    />
  );
}

function Bids({ session }: { session: Session }) {
  const { data: bids } = api.ffLeagueSession.getBids.useQuery(
    { sessionId: session?.id ?? "" },
    { enabled: !!session, staleTime: ONE_DAY_IN_SECONDS },
  );

  return (
    <>
      <div className="my-4 flex items-center justify-center">
        <Info className="mr-2" />
        <p>
          Current bids will be processed on{" "}
          {format(nextTuesday(new Date()), "LLL d, yyyy")} at 12:00pm ET
        </p>
      </div>

      {bids?.map((bid, i) => (
        <div key={i}>
          {bid.studio.name} - {bid.film.details.title} - ${bid.amount}
        </div>
      ))}
    </>
  );
}

function Settings({ session }: { session: Session }) {
  if (session)
    return <SessionForm leagueId={session.leagueId} session={session} />;
}
