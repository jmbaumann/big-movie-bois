import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { format, nextTuesday } from "date-fns";
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clapperboard,
  Disc3,
  Eye,
  Film,
  Heart,
  Info,
  MoreVertical,
  Pencil,
  Popcorn,
  Projector,
  ShieldEllipsis,
  Shuffle,
  Sofa,
  Star,
  Trash,
  Tv,
  Video,
  Videotape,
  XCircle,
} from "lucide-react";
import { useSession } from "next-auth/react";

import { RouterOutputs } from "@repo/api";
import { SESSION_ACTIVITY_TYPES } from "@repo/api/src/enums";

import { api } from "~/utils/api";
import { getDraftDate, getFilmsReleased, getMostRecentAndUpcoming, isSlotLocked } from "~/utils/fantasy-film-helpers";
import useBreakpoint from "~/utils/hooks/use-breakpoint";
import { cn } from "~/utils/shadcn";
import AdminMenu from "~/components/AdminMenu";
import SlotDescriptionDialog from "~/components/SlotDescriptionDialog";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { useConfirm } from "~/components/ui/hooks/use-confirm";
import { toast } from "~/components/ui/hooks/use-toast";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Pagination, PaginationContent, PaginationItem } from "~/components/ui/pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import Layout from "~/layouts/main/Layout";
import Loading from "~/layouts/main/Loading";
import { ONE_DAY_IN_SECONDS } from "~/utils";
import AvailableFilms from "./AvailableFilms";
import BiddingDialog from "./BiddingDialog";
import DraftCountdown from "./DraftCountdown";
import SessionForm from "./forms/Session";
import StudioIcon from "./StudioIcon";
import StudioSlot from "./StudioSlot";

type Session = RouterOutputs["ffLeagueSession"]["getById"];
type Studio = RouterOutputs["ffStudio"]["getStudios"][number];
type Activty = RouterOutputs["ffLeagueSession"]["getLogs"]["data"][number];

export default function SessionDetailsPage() {
  const { data: sessionData } = useSession();
  const confirm = useConfirm();
  const router = useRouter();
  const leagueId = router.query.leagueId as string;
  const sessionId = router.query.sessionId as string;

  const [activeTab, setActiveTab] = useState("home");
  const handleTab = (tab: string) => {
    void router.push({
      pathname: `/fantasy-film/${leagueId}/${sessionId}`,
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
  const { data: studios, refetch: refreshStudios } = api.ffStudio.getStudios.useQuery(
    { sessionId: sessionId },
    {
      enabled: !!sessionId,
      initialData: [],
    },
  );
  const { mutate: deleteSession } = api.ffLeagueSession.delete.useMutation();

  const myStudio = studios?.find((e) => e.ownerId === sessionData?.user.id);
  const opposingStudios = studios?.filter((e) => e.ownerId !== sessionData?.user.id);

  const handleDelete = async () => {
    const ok = await confirm("Are you sure you want to delete this session? This action cannot be undone.");
    if (ok) {
      toast({ title: "Deleting..." });
      deleteSession(
        { id: sessionId },
        {
          onSuccess: () => {
            toast({ title: "Session deleted" });
            router.push(`/fantasy-film/${leagueId}`);
          },
        },
      );
    }
  };

  if (!session) return <Loading />;

  return (
    <Layout title={session.name + " | Fantasy Film"} showFooter>
      <div className="max-w-full">
        <div className="flex items-center justify-between">
          <Link href={`/fantasy-film/${session.leagueId}`}>
            <Button variant="link" className="px-0">
              <ChevronLeft /> League
            </Button>
          </Link>
          {session?.league.ownerId === sessionData?.user.id && (
            <AdminMenu className="float-right">
              <DropdownMenuContent side="bottom">
                <DropdownMenuItem className="text-red-600" onClick={handleDelete}>
                  Delete Session
                </DropdownMenuItem>
              </DropdownMenuContent>
            </AdminMenu>
          )}
        </div>

        <div className="mb-4 flex items-end justify-between">
          <p className="text-2xl">{session.name}</p>
          <p className="inline-block text-lg">
            {format(session.startDate, "LLL d, yyyy")} - {format(session.endDate, "LLL d, yyyy")}
          </p>
        </div>

        <div className="">
          <Tabs className="rounded-sm" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="scrollbar-hidden flex flex-row justify-stretch overflow-x-scroll">
              <TabsTrigger value="home" onClick={() => handleTab("home")}>
                Home
              </TabsTrigger>
              <TabsTrigger value="my-studio" onClick={() => handleTab("my-studio")}>
                My Studio
              </TabsTrigger>
              <TabsTrigger value="opposing-studios" onClick={() => handleTab("opposing-studios")}>
                Opposing Studios
              </TabsTrigger>
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
              <TabsTrigger value="activity" onClick={() => handleTab("activity")}>
                Activity
              </TabsTrigger>
              {session.league.ownerId === sessionData?.user.id && (
                <TabsTrigger value="settings" onClick={() => handleTab("settings")}>
                  Settings
                </TabsTrigger>
              )}
            </TabsList>
            <TabsContent value="home">
              <Home session={session} studios={studios} />
            </TabsContent>
            <TabsContent value="my-studio">
              <MyStudio session={session} studio={myStudio} refetch={refreshStudios} />
            </TabsContent>
            <TabsContent value="opposing-studios">
              <OpposingStudios session={session} studios={opposingStudios} />
            </TabsContent>
            <TabsContent value="release-calendar">Release Calendar</TabsContent>
            <TabsContent value="films">
              <Films session={session} />
            </TabsContent>
            <TabsContent value="bids">
              <Bids session={session} studio={myStudio} />
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

function Home({ session, studios }: { session: Session; studios: Studio[] }) {
  const { data: sessionData } = useSession();
  const router = useRouter();
  const breakpoint = useBreakpoint();

  const draftDate = getDraftDate(session!.settings.draft);
  const draftIsOver = studios.some((e) => !!e.films.length) || !session?.settings.draft.conduct;

  function handleStudioSelected(studio: Studio) {
    if (studio.ownerId === sessionData?.user.id)
      router.push({
        pathname: `/fantasy-film/${router.query.leagueId}/${router.query.sessionId}`,
        query: { tab: "my-studio" },
      });
    else
      router.push({
        pathname: `/fantasy-film/${router.query.leagueId}/${router.query.sessionId}`,
        query: { tab: "opposing-studios", studio: studio.id },
      });
  }

  return (
    <>
      {!draftIsOver && !!session.settings.draft.conduct && (
        <div className="mb-4 flex flex-col items-center">
          {!!draftDate && <DraftCountdown draftDate={draftDate} />}
          <Button onClick={() => router.push(`/fantasy-film/draft/${session!.id}`)}>Go to Draft</Button>
        </div>
      )}

      {studios?.map((studio, i) => {
        const { mostRecent, upcoming } = getMostRecentAndUpcoming(studio.films);

        return (
          <Card key={i} className="mb-2">
            <CardHeader className="p-2 lg:p-6">
              <CardTitle className="mb-4 flex items-center text-2xl">
                <div
                  className="hover:text-primary flex items-center gap-x-2 hover:cursor-pointer lg:w-1/2"
                  onClick={() => handleStudioSelected(studio)}
                >
                  <StudioIcon image={studio.image} />
                  <div className="flex flex-col">
                    <p>{studio.name}</p>
                    <p className="text-xs text-slate-400">{studio.owner.username}</p>
                  </div>
                </div>
                <div className="hidden items-end lg:flex">
                  <p className="ml-4 text-lg">
                    ({studio.rank} of {session?.studios.length})
                  </p>
                  <p className="ml-4 text-lg">${studio.budget}</p>
                </div>
                <p className="text-primary ml-auto block">{studio.score} pts</p>
              </CardTitle>
              <CardDescription className="flex items-center">
                <div className="flex w-full items-end justify-between lg:hidden">
                  <p className="text-lg">
                    ({studio.rank} of {session?.studios.length})
                  </p>
                  <p className="text-lg">${studio.budget}</p>
                  <p className="text-lg">
                    Films Released: {getFilmsReleased(studio.films)} / {session?.settings.teamStructure.length}
                  </p>
                </div>

                <p className="hidden text-lg lg:block">
                  Films Released: {getFilmsReleased(studio.films)} / {session?.settings.teamStructure.length}
                </p>

                {mostRecent && !breakpoint.isMobile && (
                  <div className="ml-auto">
                    <p>Most Recent</p>
                    <p className="text-lg text-white">{mostRecent.tmdb?.title}</p>
                  </div>
                )}
                {upcoming && !breakpoint.isMobile && (
                  <div className="ml-auto">
                    <p>Upcoming</p>
                    <p className="text-lg text-white">{upcoming.tmdb?.title}</p>
                  </div>
                )}
              </CardDescription>
            </CardHeader>
          </Card>
        );
      })}
    </>
  );
}

function MyStudio({ session, studio, refetch }: { session: Session; studio: Studio | undefined; refetch: () => void }) {
  if (!studio) return <>You do not have a Studio in this Session</>;

  return <StudioDetails session={session} studio={studio} refetch={refetch} />;
}

function StudioDetails({ session, studio, refetch }: { session: Session; studio: Studio; refetch?: () => void }) {
  const { data: sessionData } = useSession();
  const breakpoint = useBreakpoint();

  return (
    <div className="w-full">
      {breakpoint.isMobile ? (
        <div className="mb-2 flex flex-col items-start justify-between text-2xl">
          <div className="flex items-center justify-center gap-x-2">
            <StudioIcon image={studio.image} />
            {studio.name}
            {studio.ownerId === sessionData?.user.id && refetch && <EditStudio studio={studio} refetch={refetch} />}
          </div>
          <div className="mt-1 flex w-full items-center justify-between px-1">
            <div className="flex items-center">
              <p className="mr-2 text-sm">
                ({studio.rank} of {session?.studios.length})
              </p>
              <p className="float-right text-lg">${studio.budget}</p>
            </div>
            <div className="flex items-center">
              <SlotDescriptionDialog className="mr-2 lg:mr-0" size={20} />
              <p className="">{studio.score} pts</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-4 flex items-end text-2xl">
          <p className="flex items-center justify-center gap-x-2">
            <StudioIcon image={studio.image} />
            {studio.name}
            {studio.ownerId === sessionData?.user.id && refetch && <EditStudio studio={studio} refetch={refetch} />}
          </p>
          <p className="ml-4 text-lg">
            ({studio.rank} of {session?.studios.length})
          </p>
          <p className="ml-4 text-lg">${studio.budget}</p>
          <p className="ml-auto">{studio.score} pts</p>
          <SlotDescriptionDialog className="mb-1 ml-2" size={20} />
        </div>
      )}
      <div className="lx:grid-cols-5 mx-auto grid grid-cols-2 gap-x-2 gap-y-4 pb-4 lg:grid-cols-4">
        {session?.settings.teamStructure.map((slot, i) => {
          const film = studio.films.find((e) => e.slot === slot.pos);
          const locked = isSlotLocked(film);
          return (
            <StudioSlot
              key={i}
              session={session}
              studio={studio}
              slot={slot.type}
              film={film}
              showScore={film ? locked : false}
              locked={locked}
              refreshStudio={refetch}
            />
          );
        })}
      </div>
    </div>
  );
}

function OpposingStudios({ session, studios }: { session: Session; studios: Studio[] }) {
  const router = useRouter();
  const breakpoint = useBreakpoint();

  const [selectedStudio, setSelectedStudio] = useState<Studio | undefined>(undefined);

  useEffect(() => {
    if (studios) setSelectedStudio(studios.find((e) => e.id === router.query.studio));
  }, [router.query, studios]);

  function handleStudioSelected(studio: Studio | undefined) {
    setSelectedStudio(studio);
    router.push({
      pathname: `/fantasy-film/${router.query.leagueId}/${router.query.sessionId}`,
      query: studio ? { tab: "opposing-studios", studio: studio.id } : { tab: "opposing-studios" },
    });
  }

  if (selectedStudio)
    return (
      <div>
        <Button variant="link" className="px-0" onClick={() => handleStudioSelected(undefined)}>
          <ChevronLeft /> Opposing Studios
        </Button>

        <StudioDetails session={session} studio={selectedStudio} />
      </div>
    );

  return studios?.map((studio, i) => {
    const { mostRecent, upcoming } = getMostRecentAndUpcoming(studio.films);

    return (
      <Card key={i} className="mb-2">
        <CardHeader className="p-2 lg:p-6">
          <CardTitle className="mb-4 flex items-center text-2xl">
            <div
              className="hover:text-primary flex items-center gap-x-2 hover:cursor-pointer lg:w-1/2"
              onClick={() => handleStudioSelected(studio)}
            >
              <StudioIcon image={studio.image} />
              <div className="flex flex-col">
                <p>{studio.name}</p>
                <p className="text-xs text-slate-400">{studio.owner.username}</p>
              </div>
            </div>
            <div className="hidden items-end lg:flex">
              <p className="ml-4 text-lg">
                ({studio.rank} of {session?.studios.length})
              </p>
              <p className="ml-4 text-lg">${studio.budget}</p>
            </div>
            <p className="text-primary ml-auto block">{studio.score} pts</p>
          </CardTitle>
          <CardDescription className="flex items-center">
            <div className="flex w-full items-end justify-between lg:hidden">
              <p className="text-lg">
                ({studio.rank} of {session?.studios.length})
              </p>
              <p className="text-lg">${studio.budget}</p>
              <p className="text-lg">
                Films Released: {getFilmsReleased(studio.films)} / {session?.settings.teamStructure.length}
              </p>
            </div>

            <p className="hidden text-lg lg:block">
              Films Released: {getFilmsReleased(studio.films)} / {session?.settings.teamStructure.length}
            </p>

            {mostRecent && !breakpoint.isMobile && (
              <div className="ml-auto">
                <p>Most Recent</p>
                <p className="text-lg text-white">{mostRecent.tmdb?.title}</p>
              </div>
            )}
            {upcoming && !breakpoint.isMobile && (
              <div className="ml-auto">
                <p>Most Recent</p>
                <p className="text-lg text-white">{upcoming.tmdb?.title}</p>
              </div>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="hidden grid-cols-4 gap-x-4 gap-y-2 lg:grid">
          {session?.settings.teamStructure.map((slot, i) => {
            const film = studio.films.find((e) => e.slot === i + 1);
            return (
              <div key={i}>
                <p className="text-sm text-slate-400">{slot.type}</p>
                {film ? (
                  <>
                    <p className="text-xl">{film?.tmdb?.title}</p>
                    <p className="text-primary text-lg font-bold">{film?.score} pts</p>
                  </>
                ) : (
                  <p className="text-xl">No film selected yet</p>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    );
  });
}

function Films({ session }: { session: Session }) {
  const { data: sessionData } = useSession();
  const breakpoint = useBreakpoint();

  const myStudio = session?.studios.find((e) => e.ownerId === sessionData?.user.id);

  if (!myStudio) return <>You do not have a Studio in this Session</>;

  return <AvailableFilms session={session} studioId={myStudio.id} gridCols={breakpoint.isMobile ? 2 : undefined} />;
}

function Bids({ session, studio }: { session: Session; studio: Studio | undefined }) {
  const { data: sessionData } = useSession();
  const trpc = api.useContext();
  const confirm = useConfirm();

  const { data: bids, refetch: refreshBids } = api.ffLeagueSession.getBids.useQuery(
    { sessionId: session?.id ?? "" },
    { enabled: !!session, staleTime: ONE_DAY_IN_SECONDS },
  );
  const { mutate: updateBid } = api.ffStudio.updateBid.useMutation();
  const { mutate: deleteBid } = api.ffStudio.deleteBid.useMutation();
  const { mutate: processBids } = api.ffAdmin.processBids.useMutation();

  async function handleDeleteBid(id: string) {
    const ok = await confirm("Are you sure you want to delete this bid?");
    if (ok)
      deleteBid(
        { id },
        {
          onSuccess: () => {
            toast({ title: "Bid deleted" });
            refreshBids();
          },
          onError: (e) => {
            toast({ title: e.message, variant: "destructive" });
          },
        },
      );
  }

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
              trpc.ffStudio.getStudios.invalidate({ sessionId: session!.id });
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
            <DropdownMenuItem onClick={handleProcessBids} disabled={!bids?.length}>
              Process Bids Now
            </DropdownMenuItem>
          </DropdownMenuContent>
        </AdminMenu>
      )}

      <div className="my-4 flex items-center">
        <Info className="mr-2" />
        <div>
          Current bids will be processed on {format(nextTuesday(new Date()), "LLL d, yyyy")} at 12:00pm ET |{" "}
          <BiddingDialog />
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[120px]">Date</TableHead>
            <TableHead>Studio</TableHead>
            <TableHead>Details</TableHead>
            <TableHead className="w-[40px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bids?.map((bid, i) => {
            const filmCurrentlyInSlot = studio?.films.find((e) => e.slot === bid.slot);

            return (
              <TableRow key={i}>
                <TableCell className="font-medium">{format(bid.createdAt, "E LLL dd h:mm aaa")}</TableCell>
                <TableCell className="font-medium">{bid.studio.name}</TableCell>
                <TableCell>
                  {bid.studio.ownerId === sessionData?.user.id
                    ? `${bid.tmdb.title} - ${session?.settings.teamStructure.find((e) => e.pos === bid.slot)
                        ?.type} - $${bid.amount}`
                    : `${bid.studio.name} placed a bid`}
                  {filmCurrentlyInSlot && (
                    <p className="text-xs italic">
                      If this bid wins, <strong>{filmCurrentlyInSlot.tmdb?.title}</strong> will be dropped
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  {bid.studio.ownerId === sessionData?.user.id && (
                    <DropdownMenu>
                      <DropdownMenuTrigger className="flex items-center rounded-lg hover:text-white">
                        <MoreVertical />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent side="bottom">
                        {/* <DropdownMenuItem>
                        <Pencil size={20} className="mr-2" /> Edit
                      </DropdownMenuItem> */}
                        <DropdownMenuItem onClick={() => handleDeleteBid(bid.id)}>
                          <Trash size={20} className="mr-2 text-red-600" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </>
  );
}

function Activity({ session }: { session: Session }) {
  const { data: sessionData } = useSession();

  const [page, setPage] = useState(1);

  const { data: logs } = api.ffLeagueSession.getLogs.useQuery(
    { sessionId: session?.id ?? "", page },
    { enabled: !!session, staleTime: ONE_DAY_IN_SECONDS },
  );

  const maxPages = logs ? Math.ceil(logs.total / 10) : 1;

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
      case SESSION_ACTIVITY_TYPES.STUDIO_UPDATE:
        return (
          <div className="flex items-center">
            <Pencil className="mr-1 text-white" /> Studio Updated
          </div>
        );
      case SESSION_ACTIVITY_TYPES.ADMIN_ACTION:
        return (
          <div className="flex items-center">
            <ShieldEllipsis className="mr-1 text-white" /> Admin Action
          </div>
        );
      case SESSION_ACTIVITY_TYPES.AUTOMATED:
        return (
          <div className="flex items-center">
            <CalendarClock className="mr-1 text-white" /> Automated Action
          </div>
        );
    }

    return "";
  };

  function getMessage(activity: Activty) {
    const regex = /{(STUDIO|FILM)}/g;
    const parts = activity.message.split(regex);

    return parts.map((part, index) => {
      if (part === "STUDIO") {
        const url =
          activity.studio?.ownerId === sessionData?.user.id
            ? `/fantasy-film/${activity.session.leagueId}/${activity.sessionId}?tab=my-studio`
            : `/fantasy-film/${activity.session.leagueId}/${activity.sessionId}?tab=opposing-studios&studio=${activity.studioId}`;
        return (
          <Link key={index} href={url} className="text-primary font-bold">
            {activity.studio?.name}
          </Link>
        );
      } else if (part === "FILM") {
        return <span className="text-primary font-bold">{activity.film?.title}</span>;
      }

      return <span key={index}>{part}</span>;
    });
  }

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
          {logs?.data.map((activity, i) => (
            <TableRow key={i}>
              <TableCell className="font-medium">{format(activity.timestamp, "E LLL dd h:mm aaa")}</TableCell>
              <TableCell>{getType(activity.type)}</TableCell>
              <TableCell>{getMessage(activity)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {logs && logs.total > 10 && (
        <div className="mb-4 flex justify-end">
          <Pagination className="ml-auto mr-0">
            <PaginationContent>
              <PaginationItem>
                <Button variant="link" disabled={page === 1} onClick={() => setPage((s) => s - 1)}>
                  <ChevronLeft className="mr-1" size={18} />
                  Prev
                </Button>
              </PaginationItem>

              {Array.from({ length: maxPages }).map((_, index) => (
                <PaginationItem key={index}>
                  <Button
                    className={page === index + 1 ? "text-primary" : ""}
                    variant="link"
                    onClick={() => setPage((s) => index + 1)}
                  >
                    {index + 1}
                  </Button>
                </PaginationItem>
              ))}
              <PaginationItem>
                <Button variant="link" disabled={page === maxPages} onClick={() => setPage((s) => s + 1)}>
                  Next <ChevronRight className="ml-1" size={18} />
                </Button>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </>
  );
}

function Settings({ session }: { session: Session }) {
  if (session) return <SessionForm leagueId={session.leagueId} session={session} />;
}

function EditStudio({ studio, refetch }: { studio: Studio; refetch: () => void }) {
  const colors = {
    black: "#000000",
    gray: "#525252",
    red: "#dc2626",
    orange: "#ea580c",
    green: "#84cc16",
    blue: "#0ea5e9",
    purple: "#9333ea",
    pink: "#db2777",
  };

  const icon = studio.image?.split("#")[0];
  const color = studio.image?.split("#")[1];

  const updateStudio = api.ffStudio.update.useMutation();

  const [open, setOpen] = useState(false);
  const [studioName, setStudioName] = useState(studio.name);
  const [studioColor, setStudioColor] = useState(
    `#${color}` ?? Object.values(colors)[Math.floor(Math.random() * Object.values(colors).length)],
  );
  const [studioIcon, setStudioIcon] = useState(icon);

  const save = () => {
    if (studioName.length)
      updateStudio.mutate(
        {
          ...studio,
          name: studioName,
          image: `${studioIcon}${studioColor}` ?? "",
        },
        {
          onSuccess: () => {
            refetch();
          },
        },
      );
    setOpen(false);
  };

  const icons = {
    clapperboard: <Clapperboard />,
    disc3: <Disc3 />,
    eye: <Eye />,
    film: <Film />,
    heart: <Heart />,
    popcorn: <Popcorn />,
    projector: <Projector />,
    sofa: <Sofa />,
    star: <Star />,
    tv: <Tv />,
    video: <Video />,
    videotape: <Videotape />,
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <Button className="bg-lb-blue rounded-3xl font-sans uppercase" size="icon">
          <Pencil className="mr-1 h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-sm">
        <DialogHeader>
          <DialogTitle>Edit Studio</DialogTitle>
          <DialogDescription className="text-black">
            <Label className="mb-2 text-white">Select a Color</Label>
            <div className="mt-2 grid grid-cols-8 gap-y-2">
              {Object.keys(colors).map((color, i) => {
                const colorKey = color as keyof typeof colors;
                return (
                  <Button
                    key={i}
                    className={cn("mx-2 rounded-3xl", studioColor === colors[colorKey] ? "border-2 border-white" : "")}
                    style={{ backgroundColor: colors[colorKey] }}
                    size="icon"
                    onClick={() => setStudioColor(colors[colorKey])}
                  ></Button>
                );
              })}
            </div>

            <Label className="mb-2 text-white">Select an Icon</Label>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-y-2">
              {Object.keys(icons).map((icon, i) => {
                const iconKey = icon as keyof typeof icons;
                return (
                  <Button
                    key={i}
                    className={cn("bg-primary mx-2 rounded-3xl", studioIcon === icon ? "border-2 border-white" : "")}
                    style={{ backgroundColor: studioColor }}
                    size="icon"
                    onClick={() => setStudioIcon(icon)}
                  >
                    {icons[iconKey]}
                  </Button>
                );
              })}
            </div>

            <div className="flex items-end space-x-4">
              <div className="flex w-full flex-col">
                <Label className="mb-2 text-white">Studio Name</Label>
                <Input type="input" value={studioName} onChange={(e) => setStudioName(e.target.value)} />
              </div>
              <Button onClick={save}>Save</Button>
            </div>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
