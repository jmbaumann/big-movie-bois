import { Dispatch, SetStateAction, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { inferRouterOutputs } from "@trpc/server";
import {
  ArrowLeftFromLine,
  ArrowRightFromLine,
  ExternalLink,
  HelpCircle,
  Loader2,
} from "lucide-react";
import { useSession } from "next-auth/react";
import io from "socket.io-client";

import { AppRouter } from "@repo/api";
import { LeagueSessionSettings } from "@repo/api/src/zod";
import { DraftStateUpdate, LeagueSessionStudio, StudioFilm } from "@repo/db";

// import io from "socket.io-client";

import { api } from "~/utils/api";
import {
  getAvailableFilms,
  getStudioOwnerByPick,
  getUpcomingPicks,
} from "~/utils/fantasy-film-helpers";
import { cn } from "~/utils/shadcn";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Label } from "~/components/ui/label";
import { Progress } from "~/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { env } from "~/env.mjs";
import Layout from "~/layouts/main/Layout";
import { getById } from "~/utils";
import AvailableFilms from "./AvailableFilms";
// import StudioIcon from "~/components/StudioIcon";
import StudioSlot from "./StudioSlot";

type TMDBMovie = inferRouterOutputs<AppRouter>["tmdb"]["getById"];
type StudioFilmDetails = StudioFilm & { tmdb: TMDBMovie };

export default function Draft() {
  const { data: sessionData } = useSession();
  const router = useRouter();
  const sessionId = router.query.sessionId as string;

  const [started, setStarted] = useState(false);
  const [currentPick, setCurrentPick] = useState({
    num: 1,
    startTimestamp: 0,
    endTimestamp: 0,
  });
  const [picks, setPicks] = useState<StudioFilm[]>([]);
  const [activities, setActivities] = useState<string[]>([]);
  const [expand, setExpand] = useState(false);

  const { data: session, isLoading } = api.ffLeagueSession.getById.useQuery(
    {
      id: sessionId,
    },
    { enabled: !!sessionId },
  );
  const { data: myStudio, refetch: refreshStudio } =
    api.ffStudio.getMyStudio.useQuery(
      {
        sessionId: sessionId,
      },
      { enabled: !!sessionId },
    );
  const { data: draftState } = api.ffDraft.getState.useQuery(
    {
      sessionId,
    },
    { staleTime: 1000 * 60 * 60 * 24, enabled: !!sessionId },
  );
  const { data: films, isLoading: filmsLoading } =
    api.tmdb.getFilmsForSession.useQuery(
      { sessionId },
      { staleTime: 1000 * 60 * 60 * 24, enabled: !!sessionId },
    );
  const startDraft = api.ffDraft.start.useMutation();
  const makePick = api.ffDraft.pick.useMutation();

  const studiosById = getById<LeagueSessionStudio>(
    session?.studios ?? [],
    "ownerId",
  );
  const availableFilms = getAvailableFilms(picks ?? [], films?.results ?? []);
  const availableSlots = session?.settings.teamStructure.filter(
    (slot) => !myStudio?.films.map((e) => e.slot).includes(slot.pos),
  );
  const draftOver =
    picks.length ===
    (session?.settings.draft.numRounds ?? 0) * (session?.studios.length ?? 0);
  const draftCannotStart = session?.settings.draft.order.length === 0;

  const handleTimeout = () => {
    if (
      session &&
      getStudioOwnerByPick(
        session?.settings.draft.order ?? [],
        currentPick.num,
      ) === myStudio?.id
    )
      makePick.mutate({
        sessionId: session.id,
        tmdbId: availableFilms?.[0]?.id ?? 0,
        title: availableFilms?.[0]?.title ?? "",
        studioId: myStudio?.id ?? "",
        slot: availableSlots?.[0]?.pos ?? 0,
      });
  };

  useEffect(() => {
    const socket = io("ws://localhost:8080", {
      // withCredentials: true,
    });

    socket.on("connect", () => {
      console.log("Connected to the WebSocket server");
    });

    socket.on(`draft:${sessionId}:draft-update`, (data: DraftStateUpdate) => {
      handleDraftUpdate(data);
    });

    return () => {
      socket.disconnect();
    };
  }, [sessionId]);

  const handleDraftUpdate = (state: DraftStateUpdate) => {
    console.log("UPDATE", state);
    setStarted(true);
    setCurrentPick(state.currentPick);
    setPicks((s) => {
      if (state.lastPick) return [...s, state.lastPick];
      return s;
    });
    setActivities((s) => [...s, ...state.newActivities]);
    refreshStudio();
  };

  useEffect(() => {
    if (draftState) {
      console.log("INITIAL STATE", draftState);
      setStarted(draftState.started);
      setCurrentPick(draftState.currentPick);
      setPicks(draftState.picks);
      setActivities(draftState.activities);
    }
  }, [draftState]);

  if (!session || isLoading)
    return (
      <Layout showFooter={true}>
        <Loader2 size={48} className="mx-auto my-2 animate-spin" />
      </Layout>
    );

  return (
    <Layout fullWidth>
      <div className="flex flex-col space-y-2">
        <div className="bg-lb-blue flex h-10 items-center justify-between px-4 font-sans text-white">
          <span className="uppercase">FANTASY FILM DRAFT - {session.name}</span>
          <HelpCircle />
        </div>

        {draftOver ? (
          <div className="bg-lb-green flex h-[88px] items-center justify-center px-4 font-sans uppercase text-white">
            {draftCannotStart ? (
              <span className="mx-4">INVITE MORE PLAYERS TO START DRAFT</span>
            ) : (
              <span className="mx-4">DRAFT COMPLETED</span>
            )}
            <Link
              href={`/fantasy-film/${session.leagueId}/${session.id}`}
              className="mx-4 hover:underline"
            >
              Session Home
              <ExternalLink className="inline pb-1" size={20} />
            </Link>
          </div>
        ) : (
          <div className="flex items-center">
            {started ? (
              <Countdown
                currentPick={currentPick}
                leagueSettings={session.settings}
                handleTimeout={handleTimeout}
              />
            ) : session?.league.ownerId === sessionData?.user.id ? (
              <Button
                className="ml-2 font-sans"
                onClick={() => startDraft.mutate({ sessionId: session!.id })}
              >
                Start Draft
              </Button>
            ) : (
              <div className="text-center">Waiting on owner to start draft</div>
            )}
            <OnTheClock
              pick={currentPick.num}
              studio={
                studiosById[
                  getStudioOwnerByPick(
                    session.settings.draft.order,
                    currentPick.num,
                  )
                ]
              }
            />
            <div className="flex space-x-4 overflow-hidden">
              {getUpcomingPicks(
                currentPick.num,
                session.settings.draft.numRounds,
                session.settings.draft.order,
              ).map((pick, i) => {
                return (
                  <UpcomingPick
                    key={i}
                    num={pick.num}
                    studio={studiosById[pick.studio]}
                  />
                );
              })}
            </div>
          </div>
        )}

        <div className="flex max-h-[calc(100vh-168px)]">
          <div
            className={cn(
              "max-h-full border-t-2 border-[#9ac] px-2 py-2",
              expand ? "w-[436px]" : "w-[218px]",
            )}
          >
            {myStudio && (
              <MyStudio
                teamStructure={session.settings.teamStructure}
                films={myStudio.films as StudioFilmDetails[]}
                expand={expand}
                setExpand={setExpand}
              />
            )}
          </div>
          <div
            className={cn(
              "border-x-2 border-t-2 border-[#9ac] px-4 py-2",
              expand ? "w-[calc(100vw-736px)]" : "w-[calc(100vw-518px)]",
            )}
          >
            {myStudio && availableFilms && (
              <AvailableFilms
                session={session}
                films={availableFilms}
                studioId={myStudio.id}
                canPick={
                  started &&
                  !draftOver &&
                  getStudioOwnerByPick(
                    session.settings.draft.order,
                    currentPick.num,
                  ) === myStudio.ownerId
                }
                isDraft={true}
              />
            )}
          </div>
          <div className="w-[300px] border-t-2 border-[#9ac] px-4 py-2">
            <Activity activities={activities} />
          </div>
        </div>
      </div>
    </Layout>
  );
}

function Countdown({
  currentPick,
  leagueSettings,
  handleTimeout,
}: {
  currentPick: {
    num: number;
    startTimestamp: number;
    endTimestamp: number;
  };
  leagueSettings: LeagueSessionSettings;
  handleTimeout: () => void;
}) {
  const [timer, setTimer] = useState("");
  const [seconds, setSeconds] = useState(1);
  const [round, setRound] = useState(
    Math.ceil(currentPick.num / leagueSettings.draft.numRounds),
  );

  const updateTimer = () => {
    if (currentPick.endTimestamp) {
      const end = new Date(currentPick.endTimestamp);
      const distance = Math.ceil((end.getTime() - new Date().getTime()) / 1000); // in seconds
      if (distance >= 0) {
        setSeconds(distance);
        const minutes = Math.floor((distance / 60) % 60);
        const seconds = Math.floor(distance % 60);
        setTimer(`${minutes}m ${seconds < 10 ? "0" + seconds : seconds}s`);
      } else if (distance === -3) handleTimeout();
    }
  };

  useEffect(() => {
    setRound(Math.ceil(currentPick.num / leagueSettings.draft.order.length));
    updateTimer();
    const interval = setInterval(() => {
      updateTimer();
    }, 1000);
    return () => clearInterval(interval);
  }, [currentPick]);

  return (
    <div className="ml-4 mr-2 flex min-w-max flex-col items-center font-sans">
      <div className="text-sm">
        Round {round} of {leagueSettings.draft.numRounds}
      </div>
      <div className="text-3xl tabular-nums">{timer}</div>
      <Progress
        className="h-2"
        value={
          ((leagueSettings.draft.timePerRound - seconds) /
            leagueSettings.draft.timePerRound) *
          100
        }
      />
    </div>
  );
}

function OnTheClock({
  pick,
  studio,
}: {
  pick: number;
  studio?: LeagueSessionStudio;
}) {
  const { data: sessionData } = useSession();

  if (!studio) return <></>;
  return (
    <div
      className={cn(
        "bg-primary ml-2 mr-4 flex h-[88px] min-w-max items-center px-2 py-2 text-white",
        studio.ownerId === sessionData?.user.id ? "bg-green-500" : "",
      )}
    >
      {/* <StudioIcon icon={studio.image} /> */}
      <div className="flex flex-col font-sans">
        <div className="text-sm uppercase">On the Clock: Pick {pick}</div>
        <div className="text-2xl">{studio.name}</div>
      </div>
    </div>
  );
}

function UpcomingPick({
  num,
  studio,
}: {
  num: number;
  studio?: LeagueSessionStudio;
}) {
  if (!studio) return <></>;
  return (
    <div className="border-lb-blue flex w-[104px] max-w-[104px] flex-col items-center self-center border-2 px-2 py-1 font-sans text-white">
      <div className="text-sm uppercase">Pick {num}</div>
      {/* <StudioIcon icon={studio.image} /> */}
      <div className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-center text-xs">
        {studio.name}
      </div>
    </div>
  );
}

function MyStudio({
  teamStructure,
  films,
  expand,
  setExpand,
}: {
  teamStructure: {
    type: string;
    pos: number;
  }[];
  films: StudioFilmDetails[];
  expand: boolean;
  setExpand: Dispatch<SetStateAction<boolean>>;
}) {
  return (
    <>
      <div className="flex items-center">
        <p>My Studio</p>
        <Button
          className="ml-auto"
          variant="ghost"
          onClick={() => setExpand((s) => !s)}
        >
          {expand ? <ArrowLeftFromLine /> : <ArrowRightFromLine />}
        </Button>
      </div>
      <div
        className={cn(
          "grid max-h-[calc(100%-40px)] gap-y-2 overflow-y-auto",
          expand ? "grid-cols-2" : "grid-cols-1",
        )}
      >
        {teamStructure.map((slot, i) => {
          const film = films.find((e) => e.slot === slot.pos);
          return <StudioSlot key={i} slot={slot.type} film={film} />;
        })}
      </div>
    </>
  );
}

function Activity({ activities }: { activities: string[] }) {
  return (
    <>
      <div>Activity</div>
      <div className="flex max-h-[calc(100%-30px)] flex-col-reverse gap-2 overflow-y-auto px-2">
        {activities.map((activity, i) => {
          return (
            <div
              className="p-2 odd:text-[#9ac] even:bg-[#9ac] even:text-white"
              key={i}
            >
              {activity}
            </div>
          );
        })}
      </div>
    </>
  );
}
