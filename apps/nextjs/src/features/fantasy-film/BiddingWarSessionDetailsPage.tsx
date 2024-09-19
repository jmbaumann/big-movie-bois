import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { inferRouterOutputs } from "@trpc/server";
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
  Pencil,
  Popcorn,
  Projector,
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

import { AppRouter } from "@repo/api";
import { SESSION_ACTIVITY_TYPES } from "@repo/api/src/enums";

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
import { DropdownMenuContent, DropdownMenuItem } from "~/components/ui/dropdown-menu";
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

type Session = inferRouterOutputs<AppRouter>["ffLeagueSession"]["getById"];
type Studio = inferRouterOutputs<AppRouter>["ffStudio"]["getStudios"][number];
type Activty = inferRouterOutputs<AppRouter>["ffLeagueSession"]["getLogs"][number];

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

  const myStudio = studios?.find((e) => e.ownerId === sessionData?.user.id);
  const opposingStudios = studios?.filter((e) => e.ownerId !== sessionData?.user.id);

  if (!session) return <Loading />;

  return (
    <Layout showFooter>
      <div>
        <div className="mb-4 flex items-end justify-between">
          <p className="inline-block text-2xl">{session.name}</p>
          <p className="inline-block text-lg">
            {format(session.startDate, "LLL d, yyyy")} - {format(session.endDate, "LLL d, yyyy")}
          </p>
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
              <TabsTrigger value="films" onClick={() => handleTab("films")}>
                Films
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
              <Films session={session} />
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
    <div className="flex w-full flex-col">
      <Button className="mb-1 ml-auto">Join</Button>

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
                  className="hover:text-primary font-medium hover:cursor-pointer"
                  onClick={() => handleStudioSelected(studio)}
                >
                  {studio.name}
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

  if (selectedStudio)
    return (
      <div>
        <StudioDetails session={session} studio={selectedStudio} />
      </div>
    );

  return <p>opposing studios</p>;
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

  const myStudio = session?.studios.find((e) => e.ownerId === sessionData?.user.id);

  if (!data?.results || !myStudio || !films) return <p>no films</p>;

  return <AvailableFilms session={session} films={films} studioId={myStudio.id} />;
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
