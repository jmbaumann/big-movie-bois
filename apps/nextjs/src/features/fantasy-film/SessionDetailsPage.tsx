import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { format, nextTuesday } from "date-fns";
import {
  ChevronLeft,
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
import { TMDBDiscoverResult } from "@repo/api/src/router/tmdb/types";
import { TMDBDetails } from "@repo/db";

import { api } from "~/utils/api";
import { getDraftDate, getFilmsReleased, getMostRecentAndUpcoming, isSlotLocked } from "~/utils/fantasy-film-helpers";
import { cn } from "~/utils/shadcn";
import AdminMenu from "~/components/AdminMenu";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import Layout from "~/layouts/main/Layout";
import Loading from "~/layouts/main/Loading";
import { ONE_DAY_IN_SECONDS } from "~/utils";
import AvailableFilms from "./AvailableFilms";
import DraftCountdown from "./DraftCountdown";
import SessionForm from "./forms/Session";
import StudioIcon from "./StudioIcon";
import StudioSlot from "./StudioSlot";

type Session = RouterOutputs["ffLeagueSession"]["getById"];
type Studio = RouterOutputs["ffStudio"]["getStudios"][number];
type Activty = RouterOutputs["ffLeagueSession"]["getLogs"][number];

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
  const { data: studios, refetch: refreshStudios } = api.ffStudio.getStudios.useQuery(
    { sessionId: sessionId },
    {
      enabled: !!sessionId,
      initialData: [],
    },
  );

  const myStudio = studios?.find((e) => e.ownerId === sessionData?.user.id);
  const opposingStudios = studios?.filter((e) => e.ownerId !== sessionData?.user.id);

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
          <Tabs className="w-full px-2 lg:px-4" value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
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

function Home({ session, studios }: { session: Session; studios: Studio[] }) {
  const { data: sessionData } = useSession();
  const router = useRouter();

  const draftDate = getDraftDate(session!.settings.draft);
  const draftIsOver = draftDate.getTime() < new Date().getTime();

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
      {!draftIsOver && (
        <div className="mb-4 flex flex-col items-center">
          <DraftCountdown draftDate={draftDate} />

          <Link href={`/fantasy-film/draft/${session!.id}`}>Go to Draft</Link>
        </div>
      )}

      {studios?.map((studio, i) => {
        const { mostRecent, upcoming } = getMostRecentAndUpcoming(studio.films);

        return (
          <Card key={i} className="mb-2">
            <CardHeader>
              <CardTitle className="mb-4 flex items-center text-2xl">
                <p
                  className="hover:text-primary flex w-1/2 items-center gap-x-2 hover:cursor-pointer"
                  onClick={() => handleStudioSelected(studio)}
                >
                  <StudioIcon image={studio.image} />
                  <div className="flex flex-col">
                    <p>{studio.name}</p>
                    <p className="text-xs text-slate-400">{studio.owner.name}</p>
                  </div>
                </p>
                <div className="flex items-end">
                  <p className="ml-4 text-lg">
                    ({studio.rank} of {session?.studios.length})
                  </p>
                  <p className="ml-4 text-lg">${studio.budget}</p>
                </div>
                <p className="text-primary ml-auto">{studio.score} pts</p>
              </CardTitle>
              <CardDescription className="flex items-center">
                <p className="text-lg">
                  Films Released: {getFilmsReleased(studio.films)} / {session?.settings.teamStructure.length}
                </p>

                {mostRecent && (
                  <div className="ml-auto">
                    <p>Most Recent</p>
                    <p className="text-lg text-white">{mostRecent.tmdb?.title}</p>
                  </div>
                )}
                {upcoming && (
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
  if (!studio) return <>no studios</>;

  return <StudioDetails session={session} studio={studio} refetch={refetch} />;
}

function StudioDetails({ session, studio, refetch }: { session: Session; studio: Studio; refetch?: () => void }) {
  const { data: sessionData } = useSession();

  return (
    <div className="w-full">
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
      </div>
      <div className="grid grid-cols-3 gap-x-2 gap-y-4">
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
        <CardHeader>
          <CardTitle className="mb-4 flex items-end text-2xl">
            <p
              className="hover:text-primary flex items-center justify-center gap-x-2 hover:cursor-pointer"
              onClick={() => handleStudioSelected(studio)}
            >
              <StudioIcon image={studio.image} />
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
              Films Released: {getFilmsReleased(studio.films)} / {session?.settings.teamStructure.length}
            </p>

            {mostRecent && (
              <div className="ml-auto">
                <p>Most Recent</p>
                <p className="text-lg text-white">{mostRecent.tmdb?.title}</p>
              </div>
            )}
            {upcoming && (
              <div className="ml-auto">
                <p>Most Recent</p>
                <p className="text-lg text-white">{upcoming.tmdb?.title}</p>
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

  const myStudio = session?.studios.find((e) => e.ownerId === sessionData?.user.id);

  if (!myStudio) return <>no studio</>;

  return <AvailableFilms session={session} studioId={myStudio.id} />;
}

function Bids({ session }: { session: Session }) {
  const { data: sessionData } = useSession();
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

      <div className="my-4 flex items-center justify-center">
        <Info className="mr-2" />
        <p>Current bids will be processed on {format(nextTuesday(new Date()), "LLL d, yyyy")} at 12:00pm ET</p>
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
          {bids?.map((bid, i) => (
            <TableRow key={i}>
              <TableCell className="font-medium">{format(bid.createdAt, "E LLL dd h:mm aaa")}</TableCell>
              <TableCell className="font-medium">{bid.studio.name}</TableCell>
              <TableCell>
                {bid.studio.ownerId === sessionData?.user.id
                  ? `${bid.tmdb.title} - $${bid.amount}`
                  : `${bid.studio.name} placed a bid`}
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
          ))}
        </TableBody>
      </Table>
    </>
  );
}

function Activity({ session }: { session: Session }) {
  const { data: sessionData } = useSession();

  const { data: logs } = api.ffLeagueSession.getLogs.useQuery(
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
          {logs?.map((activity, i) => (
            <TableRow key={i}>
              <TableCell className="font-medium">{format(activity.timestamp, "E LLL dd h:mm aaa")}</TableCell>
              <TableCell>{getType(activity.type)}</TableCell>
              <TableCell>{getMessage(activity)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
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
