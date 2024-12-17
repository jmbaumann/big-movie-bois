import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { format } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  CircleDollarSign,
  Clapperboard,
  Disc3,
  Eye,
  Film,
  Heart,
  Pencil,
  Popcorn,
  Projector,
  Search,
  ShieldEllipsis,
  Shuffle,
  Sofa,
  Star,
  Tv,
  Video,
  Videotape,
  XCircle,
} from "lucide-react";
import { useSession } from "next-auth/react";

import { RouterOutputs } from "@repo/api";
import { SESSION_ACTIVITY_TYPES } from "@repo/api/src/enums";
import { TMDBDiscoverResult } from "@repo/api/src/router/tmdb/types";
import { StudioFilm, TMDBDetails } from "@repo/db";

import { api } from "~/utils/api";
import { getFilmsReleased, isSlotLocked } from "~/utils/fantasy-film-helpers";
import useBreakpoint from "~/utils/hooks/use-breakpoint";
import { cn } from "~/utils/shadcn";
import SlotDescriptionDialog from "~/components/SlotDescriptionDialog";
import { Button } from "~/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "~/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { toast } from "~/components/ui/hooks/use-toast";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Pagination, PaginationContent, PaginationItem } from "~/components/ui/pagination";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import Layout from "~/layouts/main/Layout";
import Loading from "~/layouts/main/Loading";
import { ONE_DAY_IN_SECONDS } from "~/utils";
import AvailableFilms from "./AvailableFilms";
import StudioIcon from "./StudioIcon";
import StudioSlot from "./StudioSlot";

type Session = RouterOutputs["ffLeagueSession"]["getById"];
type Studio = RouterOutputs["ffStudio"]["getStudios"][number];
type Activty = RouterOutputs["ffLeagueSession"]["getLogs"]["data"][number];

export default function BiddingWarSessionDetailsPage() {
  const { data: sessionData } = useSession();
  const router = useRouter();
  const sessionId = router.query.sessionId as string;

  const [activeTab, setActiveTab] = useState("home");
  const handleTab = (tab: string) => {
    void router.push({
      pathname: `/fantasy-film/bidding-war/${router.query.sessionId}`,
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
  const { mutate: join, isLoading: joining } = api.ffStudio.create.useMutation();

  function handleJoin(sessionId: string) {
    if (sessionData)
      join(
        { sessionId, ownerId: sessionData.user.id },
        {
          onSuccess: () => {
            toast({ title: "Session joined" });
            refreshStudios();
          },
        },
      );
  }

  const myStudio = studios?.find((e) => e.ownerId === sessionData?.user.id);
  const opposingStudios = studios?.filter((e) => e.ownerId !== sessionData?.user.id);

  if (!session) return <Loading />;

  return (
    <Layout title={session.name + " | Fantasy Film"} showFooter>
      <div>
        <Link href={`/fantasy-film`}>
          <Button variant="link" className="px-0">
            <ChevronLeft /> Fantasy Film
          </Button>
        </Link>

        <div className="mb-4 flex items-end justify-between">
          <p className="inline-block text-2xl">{session.name}</p>
          <p className="inline-block text-lg">
            {format(session.startDate, "LLL d, yyyy")} - {format(session.endDate, "LLL d, yyyy")}
          </p>
        </div>

        <div className="flex">
          <Tabs className="w-full px-2 lg:px-4" value={activeTab} onValueChange={setActiveTab}>
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
              <TabsTrigger value="films" onClick={() => handleTab("films")}>
                Films
              </TabsTrigger>
              <TabsTrigger value="activity" onClick={() => handleTab("activity")}>
                My Activity
              </TabsTrigger>
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
            <TabsContent value="films">
              <Films session={session} myStudio={myStudio} />
            </TabsContent>
            <TabsContent value="activity">
              <Activity session={session} />
            </TabsContent>
          </Tabs>

          {!myStudio && (
            <Button className="mb-1 ml-auto" onClick={() => handleJoin(session.id)} isLoading={joining}>
              Join
            </Button>
          )}
        </div>
      </div>
    </Layout>
  );
}

function Home({ session, studios }: { session: Session; studios: Studio[] }) {
  const { data: sessionData } = useSession();
  const router = useRouter();

  function handleStudioSelected(studio: Studio) {
    if (studio.ownerId === sessionData?.user.id)
      router.push({
        pathname: `/fantasy-film/bidding-war/${router.query.sessionId}`,
        query: { tab: "my-studio" },
      });
    else
      router.push({
        pathname: `/fantasy-film/bidding-war/${router.query.sessionId}`,
        query: { tab: "opposing-studios", studio: studio.id },
      });
  }

  return (
    <div className="scrollbar-hidden flex w-full flex-col">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Rank</TableHead>
            <TableHead>Studio</TableHead>
            <TableHead>Budget</TableHead>
            <TableHead>Films Released</TableHead>
            <TableHead>Score</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {studios?.map((studio, i) => {
            // const { mostRecent, upcoming } = getMostRecentAndUpcoming(studio.films);

            return (
              <TableRow key={i}>
                <TableCell>{studio.rank}</TableCell>
                <TableCell
                  className="hover:text-primary flex items-center font-medium hover:cursor-pointer"
                  onClick={() => handleStudioSelected(studio)}
                >
                  <StudioIcon image={studio.image} />
                  <p className="ml-2">{studio.name}</p>
                </TableCell>
                <TableCell>${studio.budget}</TableCell>
                <TableCell>
                  {getFilmsReleased(studio.films)} / {session?.settings.teamStructure.length}
                </TableCell>
                <TableCell>{studio.score} pts</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function MyStudio({ session, studio, refetch }: { session: Session; studio: Studio | undefined; refetch: () => void }) {
  if (!studio) return <>no studio</>;

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
      <div className="mx-auto grid grid-cols-2 gap-x-2 gap-y-4 pb-4 lg:grid-cols-5">
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
              bidWar
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
  const [keyword, setKeyword] = useState("");

  useEffect(() => {
    if (studios) setSelectedStudio(studios.find((e) => e.id === router.query.studio));
  }, [router.query, studios]);

  const { data: searchResult, isLoading: searching } = api.ffStudio.search.useQuery(
    { sessionId: session?.id ?? "", keyword },
    { enabled: !!session && !!keyword.length },
  );

  if (selectedStudio)
    return (
      <div>
        <StudioDetails session={session} studio={selectedStudio} />
      </div>
    );

  return (
    <div>
      <Popover>
        <PopoverTrigger asChild>
          <Button role="combobox">
            <Search size={20} className="mr-1" />
            Find a Studio
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command shouldFilter={false}>
            <CommandInput placeholder="Enter a username" onValueChange={setKeyword} />
            {searching && !!keyword.length ? (
              <CommandEmpty>Loading...</CommandEmpty>
            ) : (
              <CommandEmpty>No results</CommandEmpty>
            )}
            <CommandList className="w-[400px]">
              <CommandGroup>
                {searchResult?.map((result) => (
                  <CommandItem
                    key={result.id}
                    value={String(result.id)}
                    onSelect={() => {
                      setSelectedStudio(result);
                      setKeyword("");
                    }}
                  >
                    {result.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function Films({ session, myStudio }: { session: Session; myStudio: Studio | undefined }) {
  const breakpoint = useBreakpoint();

  if (!myStudio) return <>no studio</>;

  return (
    <AvailableFilms session={session} studioId={myStudio.id} buyNow gridCols={breakpoint.isMobile ? 2 : undefined} />
  );
}

function Activity({ session }: { session: Session }) {
  const { data: sessionData } = useSession();

  const [page, setPage] = useState(1);

  const myStudio = session?.studios.find((e) => e.ownerId === sessionData?.user.id);

  const { data: logs } = api.ffLeagueSession.getLogs.useQuery(
    { sessionId: session?.id ?? "", page, studioId: myStudio?.id ?? "" },
    { enabled: !!session && !!myStudio, staleTime: ONE_DAY_IN_SECONDS },
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
      case SESSION_ACTIVITY_TYPES.FILM_PURCHASED:
        return (
          <div className="flex items-center">
            <CircleDollarSign className="mr-1 text-green-500" /> Film Purchased
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
            ? `/fantasy-film/bidding-war/${activity.sessionId}?tab=my-studio`
            : `/fantasy-film/bidding-war/${activity.sessionId}?tab=opposing-studios&studio=${activity.studioId}`;
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
                <Input type="input" value={studioName} disabled />
              </div>
              <Button onClick={save}>Save</Button>
            </div>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
