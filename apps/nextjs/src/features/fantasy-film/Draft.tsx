import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { ExternalLink, HelpCircle, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";

import { LeagueSessionSettings } from "@repo/api/src/zod";
import { DraftStateUpdate, LeagueSessionStudio, StudioFilm } from "@repo/db";

// import io from "socket.io-client";

import { api } from "~/utils/api";
import {
  getAvailableFilms,
  getStudioByPick,
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

  const { data: session, isLoading } = api.ffLeagueSession.getById.useQuery(
    {
      id: sessionId,
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

  const studiosById = getById<LeagueSessionStudio>(session?.studios ?? []);
  const myStudio = session?.studios.find(
    (e) => e.ownerId === sessionData?.user.id,
  );
  const myPicks = picks.filter((e) => e.studioId === myStudio?.id);
  const availableFilms = getAvailableFilms(picks ?? [], films?.results ?? []);
  console.log(availableFilms);
  const availableSlots = session?.settings.teamStructure.filter(
    (slot) => !myPicks.map((e) => e.slot).includes(slot.pos),
  );
  const draftOver =
    picks.length ===
    (session?.settings.teamStructure.length ?? 0) *
      (session?.settings.draft.order.length ?? 0);
  const draftCannotStart = session?.settings.draft.order.length === 0;

  const handleTimeout = () => {
    if (
      session &&
      getStudioByPick(session?.settings.draft.order ?? [], currentPick.num) ===
        myStudio?.id
    )
      makePick.mutate({
        sessionId: session.id,
        tmdbId: availableFilms?.[0]?.id ?? 0,
        studioId: myStudio?.id ?? "",
        slot: availableSlots?.[0]?.pos ?? 0,
        draftPick: currentPick.num,
      });
  };

  // useEffect(() => {
  //   const socket = io(env.NEXT_PUBLIC_WEBSOCKET_SERVER, {
  //     // withCredentials: true,
  //   });

  //   socket.on("connect", () => {
  //     console.log("Connected to the WebSocket server");
  //   });

  //   socket.on(`draft:${uuid}:draft-update`, (data: DraftStateUpdate) => {
  //     handleDraftUpdate(data);
  //   });

  //   return () => {
  //     socket.disconnect();
  //   };
  // }, [sessionId]);

  const handleDraftUpdate = (state: DraftStateUpdate) => {
    console.log("UPDATE", state);
    setStarted(true);
    setCurrentPick(state.currentPick);
    setPicks((s) => {
      if (state.lastPick) return [...s, state.lastPick];
      return s;
    });
    setActivities((s) => [...s, ...state.newActivities]);
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
            ) : session.league.ownerId === sessionData?.user.id ? (
              <Button
                className="ml-2 font-sans"
                onClick={() => startDraft.mutate({ sessionId: session.id })}
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
                  getStudioByPick(session.settings.draft.order, currentPick.num)
                ]
              }
            />
            <div className="flex space-x-4 overflow-hidden">
              {getUpcomingPicks(
                currentPick.num,
                session.settings.teamStructure.length,
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
          <div className="max-h-full w-1/3 border-t-2 border-[#9ac] px-2 py-2">
            <MyStudio
              teamStructure={session.settings.teamStructure}
              myPicks={myPicks}
            />
          </div>
          <div className="w-1/2 border-x-2 border-t-2 border-[#9ac] px-4 py-2">
            {myStudio && availableFilms && (
              <AvailableFilms
                session={session}
                films={availableFilms}
                studioId={myStudio.id}
                canPick={true}
                //   canPick={
                //   started &&
                //   !draftOver &&
                //   getStudioByPick(
                //     session.settings.draft.order,
                //     currentPick.num,
                //   ) === myStudio.id
                // }
              />
            )}
          </div>
          <div className="w-1/6 border-t-2 border-[#9ac] px-4 py-2">
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
    Math.ceil(currentPick.num / leagueSettings.teamStructure.length),
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
        Round {round} of {leagueSettings.teamStructure.length}
      </div>
      <div className="text-3xl tabular-nums">{timer}</div>
      <Progress
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
        "bg-lb-blue ml-2 mr-4 flex h-[88px] min-w-max items-center px-6 py-2 text-white",
        studio.ownerId === sessionData?.user.id ? "bg-lb-green" : "",
      )}
    >
      {/* <StudioIcon icon={studio.image} /> */}
      <div className="ml-4 flex flex-col font-sans">
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
  myPicks,
}: {
  teamStructure: {
    type: string;
    pos: number;
  }[];
  myPicks: StudioFilm[];
}) {
  return (
    <>
      <div>My Studio</div>
      <div className="grid max-h-[calc(100%-20px)] grid-cols-2 gap-y-2 overflow-y-auto">
        {teamStructure.map((slot, i) => {
          const movie = myPicks.find((e) => e.slot === slot.pos);
          return <StudioSlot key={i} slot={slot.type} />;
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
