import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { inferRouterOutputs } from "@trpc/server";
import { format, nextTuesday } from "date-fns";
import {
  ChevronLeft,
  CircleDollarSign,
  Info,
  Shuffle,
  XCircle,
} from "lucide-react";
import { useSession } from "next-auth/react";

import { AppRouter } from "@repo/api";
import { SESSION_ACTIVITY_TYPES } from "@repo/api/src/enums";

import { api } from "~/utils/api";
import {
  getDraftDate,
  getFilmsReleased,
  getMostRecentAndUpcoming,
  isSlotLocked,
} from "~/utils/fantasy-film-helpers";
import AdminMenu from "~/components/AdminMenu";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
} from "~/components/ui/dropdown-menu";
import { useConfirm } from "~/components/ui/hooks/use-confirm";
import { toast } from "~/components/ui/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
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
type Studios = inferRouterOutputs<AppRouter>["ffStudio"]["getOpposingStudios"];
type Studio =
  | inferRouterOutputs<AppRouter>["ffStudio"]["getMyStudio"]
  | Studios[number];

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
            <ChevronLeft /> League
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
              <OpposingStudios session={session} />
            </TabsContent>
            <TabsContent value="standings">
              <Standings session={session} />
            </TabsContent>
            <TabsContent value="release-calendar">Release Calendar</TabsContent>
            <TabsContent value="films">
              <Films session={session} />
            </TabsContent>
            <TabsContent value="bids">
              <Bids session={session} />
            </TabsContent>
            <TabsContent value="activity">
              <Activity session={session} />
            </TabsContent>
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

  return <StudioDetails session={session} studio={studio} refetch={refetch} />;
}

function StudioDetails({
  session,
  studio,
  refetch,
}: {
  session: Session;
  studio: Studio;
  refetch?: () => void;
}) {
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
        <p className="ml-4 text-lg">${studio.budget}</p>
        <p className="ml-auto">{studio.score} pts</p>
      </div>
      <div className="grid grid-cols-3 gap-x-2 gap-y-4">
        {session?.settings.teamStructure.map((slot, i) => {
          const film = studio.films.find((e) => e.slot === slot.pos);
          const locked = isSlotLocked(film);
          return (
            <StudioSlot
              key={i}
              session={session}
              slot={slot.type}
              film={film}
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

function OpposingStudios({ session }: { session: Session }) {
  const router = useRouter();
  const sessionId = router.query.sessionId as string;

  const [selectedStudio, setSelectedStudio] = useState<Studio | undefined>(
    undefined,
  );

  const { data: studios } = api.ffStudio.getOpposingStudios.useQuery(
    { sessionId },
    {
      enabled: !!sessionId,
    },
  );

  useEffect(() => {
    if (studios && router.query.studio)
      setSelectedStudio(studios.find((e) => e.id === router.query.studio));
  }, [router.query.studio, studios]);

  function handleStudioSelected(studio: Studio | undefined) {
    setSelectedStudio(studio);
    router.push({
      pathname: `/fantasy-film/${router.query.leagueId}/${router.query.sessionId}`,
      query: studio
        ? { tab: "opposing-studios", studio: studio.id }
        : { tab: "opposing-studios" },
    });
  }

  if (selectedStudio)
    return (
      <div>
        <Button
          variant="link"
          className="px-0"
          onClick={() => handleStudioSelected(undefined)}
        >
          <ChevronLeft /> Opposing Studios
        </Button>

        <StudioDetails session={session} studio={selectedStudio} />
      </div>
    );

  return studios?.map((studio, i) => {
    const { mostRecent, upcoming } = getMostRecentAndUpcoming(studio.films);

    return (
      <Card key={i} className="mb-2">
        <CardHeader>
          <CardTitle className="mb-4 flex items-end text-2xl">
            <p
              className="hover:text-primary flex items-center justify-center gap-x-2 hover:cursor-pointer"
              onClick={() => handleStudioSelected(studio)}
            >
              {/* <StudioIcon icon={studio.image} /> */}
              {studio.name}
            </p>
            <p className="ml-4 text-lg">
              ({studio.rank} of {session?.studios.length})
            </p>
            <p className="ml-4 text-lg">${studio.budget}</p>
            <p className="text-primary ml-auto">{studio.score} pts</p>
          </CardTitle>
          <CardDescription className="flex items-center">
            <p className="text-lg">
              Films Released: {getFilmsReleased(studio.films)} /{" "}
              {session?.settings.teamStructure.length}
            </p>

            {mostRecent && (
              <div className="ml-auto">
                <p>Most Recent</p>
                <p className="text-lg text-white">
                  {mostRecent.tmdb.details.title}
                </p>
              </div>
            )}
            {upcoming && (
              <div className="ml-auto">
                <p>Most Recent</p>
                <p className="text-lg text-white">
                  {upcoming.tmdb.details.title}
                </p>
              </div>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-4 gap-x-4 gap-y-2">
          {session?.settings.teamStructure.map((slot, i) => {
            const film = studio.films.find((e) => e.slot === i + 1);
            return (
              <div key={i}>
                <p className="text-sm text-slate-400">{slot.type}</p>
                <p className="text-xl">{film?.tmdb.details.title}</p>
                <p className="text-primary text-lg font-bold">
                  {film?.score} pts
                </p>
              </div>
            );
          })}
        </CardContent>
      </Card>
    );
  });
}

function Standings({ session }: { session: Session }) {
  const { data: standings } = api.ffLeagueSession.getStandings.useQuery(
    { sessionId: session?.id ?? "" },
    { staleTime: 1000 * 60 * 60 * 24, enabled: !!session?.id },
  );

  return (
    <>
      {standings?.map((studio, i) => (
        <div key={i} className="flex">
          <p className="mr-2">{i + 1}.</p>
          <p>{studio.name}</p>
        </div>
      ))}
    </>
  );
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
  const { data: sessionData } = useSession();
  const confirm = useConfirm();

  const { data: bids, refetch: refreshBids } =
    api.ffLeagueSession.getBids.useQuery(
      { sessionId: session?.id ?? "" },
      { enabled: !!session, staleTime: ONE_DAY_IN_SECONDS },
    );
  const { mutate: processBids } = api.ffAdmin.processBids.useMutation();

  async function handleProcessBids() {
    if (session) {
      const ok = await confirm(
        `Are you sure you want to process these bids now? Any active bids will process again automatically on ${format(
          nextTuesday(new Date()),
          "LLL d, yyyy",
        )} at 12:00pm ET`,
      );
      if (ok) {
        toast({ title: "Bids processing..." });
        processBids(
          { sessionId: session.id },
          {
            onSuccess: () => {
              refreshBids();
              toast({ title: "Bids processed" });
            },
          },
        );
      }
    }
  }

  return (
    <>
      {session?.league.ownerId === sessionData?.user.id && (
        <AdminMenu className="float-right">
          <DropdownMenuContent side="bottom">
            <DropdownMenuItem
              onClick={handleProcessBids}
              disabled={!bids?.length}
            >
              Process Bids Now
            </DropdownMenuItem>
          </DropdownMenuContent>
        </AdminMenu>
      )}

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

function Activity({ session }: { session: Session }) {
  const { data: activity } = api.ffLeagueSession.getLogs.useQuery(
    { sessionId: session?.id ?? "" },
    { enabled: !!session, staleTime: ONE_DAY_IN_SECONDS },
  );

  const getType = (type: string) => {
    switch (type) {
      case SESSION_ACTIVITY_TYPES.FILM_SWAP:
        return (
          <div className="flex items-center">
            <Shuffle className="mr-1 text-white" /> Film Swapped
          </div>
        );
      case SESSION_ACTIVITY_TYPES.BID_WON:
        return (
          <div className="flex items-center">
            <CircleDollarSign className="mr-1 text-green-500" /> Bid Won
          </div>
        );
      case SESSION_ACTIVITY_TYPES.FILM_DROP:
        return (
          <div className="flex items-center">
            <XCircle className="mr-1 text-red-600" /> Film Dropped
          </div>
        );
    }

    return "";
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[120px]">Date</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Details</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {activity?.map((a, i) => (
            <TableRow key={i}>
              <TableCell className="font-medium">
                {format(a.timestamp, "E LLL dd h:mm aaa")}
              </TableCell>
              <TableCell>{getType(a.type)}</TableCell>
              <TableCell>{a.message}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}

function Settings({ session }: { session: Session }) {
  if (session)
    return <SessionForm leagueId={session.leagueId} session={session} />;
}
