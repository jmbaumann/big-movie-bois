import { Dispatch, SetStateAction, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { ArrowLeftFromLine, ArrowRightFromLine, ExternalLink, HelpCircle, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import io from "socket.io-client";

import { RouterOutputs } from "@repo/api";
import { DraftState } from "@repo/api/src/router/fantasy-film/draft";
import { LeagueSessionSettings } from "@repo/api/src/zod";
import { LeagueSessionStudio, StudioFilm } from "@repo/db";

import { api } from "~/utils/api";
import { getStudioOwnerByPick, getUpcomingPicks } from "~/utils/fantasy-film-helpers";
import useBreakpoint from "~/utils/hooks/use-breakpoint";
import { cn } from "~/utils/shadcn";
import { Button } from "~/components/ui/button";
import { useConfirm } from "~/components/ui/hooks/use-confirm";
import { Progress } from "~/components/ui/progress";
import { env } from "~/env.mjs";
import Layout from "~/layouts/main/Layout";
import { getById } from "~/utils";
import AvailableFilms from "./AvailableFilms";
import HowToPlayDialog from "./HowToPlayDialog";
import StudioIcon from "./StudioIcon";
import StudioSlot from "./StudioSlot";

type StudioFilmTMDB = RouterOutputs["ffStudio"]["getMyStudio"]["films"][number];
type Studio = NonNullable<RouterOutputs["ffLeagueSession"]["getById"]>["studios"][number];

export default function Draft() {
  const { data: sessionData } = useSession();
  const router = useRouter();
  const confirm = useConfirm();
  const sessionId = router.query.sessionId as string;
  const breakpoint = useBreakpoint();

  const [started, setStarted] = useState(false);
  const [currentPick, setCurrentPick] = useState({
    num: 1,
    startTimestamp: 0,
    endTimestamp: 0,
  });
  const [picks, setPicks] = useState<StudioFilm[]>([]);
  const [activities, setActivities] = useState<string[]>([]);
  const [expand, setExpand] = useState(false);
  const [draftDisabled, setDraftDisabled] = useState(false);

  // MOBILE
  const [tab, setTab] = useState<"my" | "available" | "activity">("my");

  const {
    data: session,
    isLoading,
    refetch: refreshSession,
  } = api.ffLeagueSession.getById.useQuery(
    {
      id: sessionId,
    },
    { enabled: !!sessionId },
  );
  const { data: myStudio, refetch: refreshStudio } = api.ffStudio.getMyStudio.useQuery(
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

  const startDraft = api.ffDraft.start.useMutation();

  const isAdmin = session?.league.ownerId === sessionData?.user.id;
  const studiosById = getById<Studio>(session?.studios ?? [], "ownerId");
  const draftingStudio = session
    ? studiosById[getStudioOwnerByPick(session.settings.draft.order ?? [], currentPick.num)]
    : undefined;
  const draftOver =
    session?.settings.draft.complete ||
    picks.length === (session?.settings.draft.numRounds ?? 0) * (session?.studios.length ?? 0);
  const draftCannotStart = session?.settings.draft.order?.length === 0;

  useEffect(() => {
    const socket = io(env.NEXT_PUBLIC_WEBSOCKET_SERVER, {
      // withCredentials: true,
    });

    socket.on("connect", () => {
      console.log("Connected to the WebSocket server");
    });

    socket.on(`draft:${sessionId}:draft-update`, (data: DraftState) => {
      handleDraftUpdate(data);
    });

    return () => {
      socket.disconnect();
    };
  }, [sessionId]);

  const handleStart = async () => {
    const ok = await confirm("Are you sure you want to start the draft?");
    if (ok) startDraft.mutate({ sessionId: session!.id });
  };

  const handleDraftUpdate = (state: DraftState) => {
    console.log("UPDATE", state);
    setStarted(true);
    setDraftDisabled(false);
    setCurrentPick(state.currentPick);
    setPicks((s) => {
      if (state.lastPick) return [...s, state.lastPick];
      return s;
    });
    setActivities((s) => [...s, ...state.newActivities]);
    refreshSession();
    refreshStudio();
  };

  useEffect(() => {
    if (draftState) {
      // console.log("INITIAL STATE", draftState);
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

  if (!breakpoint.isMobile)
    return (
      <Layout fullWidth>
        <div className="flex flex-col space-y-2">
          <div className="bg-lb-blue flex h-10 items-center justify-between px-4 font-sans text-white">
            <span className="uppercase">FANTASY FILM DRAFT - {session.name}</span>
            {/* <HowToPlayDialog /> */}
          </div>

          {draftOver ? (
            <div className="bg-lb-green flex h-[88px] items-center justify-center px-4 font-sans uppercase text-white">
              {draftCannotStart ? (
                <span className="mx-4">INVITE MORE PLAYERS TO START DRAFT</span>
              ) : (
                <span className="mx-4">DRAFT COMPLETED</span>
              )}
              <Link href={`/fantasy-film/${session.leagueId}/${session.id}`} className="mx-4 hover:underline">
                Session Home
                <ExternalLink className="inline pb-1" size={20} />
              </Link>
            </div>
          ) : (
            <div className="flex items-center">
              {started && !!draftingStudio ? (
                <Countdown
                  currentPick={currentPick}
                  leagueSettings={session.settings}
                  draftingStudioId={draftingStudio.id}
                  isAdmin={isAdmin}
                />
              ) : session?.league.ownerId === sessionData?.user.id ? (
                <Button className="ml-2 font-sans" onClick={() => handleStart()}>
                  Start Draft
                </Button>
              ) : (
                <div className="text-center">Waiting on owner to start draft</div>
              )}
              <OnTheClock pick={currentPick.num} studio={draftingStudio} />
              <div className="flex space-x-4 overflow-hidden">
                {getUpcomingPicks(
                  currentPick.num,
                  session.settings.draft.numRounds ?? 0,
                  session.settings.draft.order ?? [],
                ).map((pick, i) => {
                  return <UpcomingPick key={i} num={pick.num} studio={studiosById[pick.studio]} />;
                })}
              </div>
            </div>
          )}

          <div className="flex max-h-[calc(100vh-168px)]">
            <div className={cn("max-h-full border-t-2 border-[#9ac] px-2 py-2", expand ? "w-[436px]" : "w-[218px]")}>
              {myStudio && (
                <MyStudio
                  teamStructure={session.settings.teamStructure}
                  films={myStudio.films}
                  expand={expand}
                  setExpand={setExpand}
                />
              )}
            </div>
            <div
              className={cn(
                "border-x-2 border-t-2 border-[#9ac] px-2 py-2",
                expand ? "w-[calc(100vw-736px)]" : "w-[calc(100vw-518px)]",
              )}
            >
              {myStudio && (
                <AvailableFilms
                  session={session}
                  studioId={myStudio.id}
                  isDraft={true}
                  drafting={draftingStudio}
                  draftDisabled={draftDisabled || draftOver}
                  gridCols={expand ? 4 : 5}
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

  return (
    <Layout>
      <div className="flex flex-col">
        <div className="bg-lb-blue flex h-10 items-center justify-between px-1 font-sans text-white">
          <span className="uppercase">FANTASY FILM DRAFT - {session.name}</span>
          {/* <HowToPlayDialog /> */}
        </div>

        {draftOver ? (
          <div className="bg-lb-green flex h-[88px] items-center justify-center px-4 font-sans uppercase text-white">
            {draftCannotStart ? (
              <span className="mx-4">INVITE MORE PLAYERS TO START DRAFT</span>
            ) : (
              <span className="mx-4">DRAFT COMPLETED</span>
            )}
            <Link href={`/fantasy-film/${session.leagueId}/${session.id}`} className="mx-4 hover:underline">
              Session Home
              <ExternalLink className="inline pb-1" size={20} />
            </Link>
          </div>
        ) : (
          <div className="scrollbar-hidden flex items-center overflow-scroll">
            {started && !!draftingStudio ? (
              <Countdown
                currentPick={currentPick}
                leagueSettings={session.settings}
                draftingStudioId={draftingStudio.id}
                isAdmin={isAdmin}
              />
            ) : session?.league.ownerId === sessionData?.user.id ? (
              <Button className="ml-2 font-sans" onClick={() => handleStart()}>
                Start Draft
              </Button>
            ) : (
              <div className="text-center">Waiting on owner to start draft</div>
            )}
            <OnTheClock pick={currentPick.num} studio={draftingStudio} />
            <div className="flex space-x-4">
              {getUpcomingPicks(
                currentPick.num,
                session.settings.draft.numRounds ?? 0,
                session.settings.draft.order ?? [],
              ).map((pick, i) => {
                return <UpcomingPick key={i} num={pick.num} studio={studiosById[pick.studio]} />;
              })}
            </div>
          </div>
        )}

        <div className="mb-4 flex justify-around border-b-[1px] border-zinc-50">
          <Button
            className={cn("text-lg", tab === "my" && "text-primary font-bold")}
            variant="ghost"
            onClick={() => setTab("my")}
          >
            My Studio
          </Button>
          <Button
            className={cn("text-lg", tab === "available" && "text-primary font-bold")}
            variant="ghost"
            onClick={() => setTab("available")}
          >
            Available Films
          </Button>
          <Button
            className={cn("text-lg", tab === "activity" && "text-primary font-bold")}
            variant="ghost"
            onClick={() => setTab("activity")}
          >
            Activity
          </Button>
        </div>

        {tab === "my" && myStudio && (
          <MyStudio teamStructure={session.settings.teamStructure} films={myStudio.films} expand />
        )}

        {tab === "available" && myStudio && (
          <AvailableFilms
            session={session}
            studioId={myStudio.id}
            isDraft={true}
            drafting={draftingStudio}
            draftDisabled={draftDisabled || draftOver}
            gridCols={2}
          />
        )}

        {tab === "activity" && <Activity activities={activities} />}
      </div>
    </Layout>
  );
}

function Countdown({
  currentPick,
  leagueSettings,
  draftingStudioId,
  isAdmin,
}: {
  currentPick: {
    num: number;
    startTimestamp: number;
    endTimestamp: number;
  };
  leagueSettings: LeagueSessionSettings;
  draftingStudioId: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const sessionId = router.query.sessionId as string;

  const [timer, setTimer] = useState("");
  const [seconds, setSeconds] = useState(1);
  const [round, setRound] = useState(Math.ceil(currentPick.num / (leagueSettings.draft.numRounds ?? 1)));

  const auto = api.ffDraft.auto.useMutation();

  const updateTimer = () => {
    if (currentPick.endTimestamp) {
      const end = new Date(currentPick.endTimestamp);
      const distance = Math.ceil((end.getTime() - new Date().getTime()) / 1000); // in seconds
      if (distance >= 0) {
        setSeconds(distance);
        const minutes = Math.floor((distance / 60) % 60);
        const seconds = Math.floor(distance % 60);
        setTimer(`${minutes}m ${seconds < 10 ? "0" + seconds : seconds}s`);
      } else setSeconds(0);
    }
  };

  useEffect(() => {
    setRound(Math.ceil(currentPick.num / (leagueSettings.draft.order?.length ?? 1)));
    updateTimer();
    const interval = setInterval(() => {
      updateTimer();
    }, 1000);
    return () => clearInterval(interval);
  }, [currentPick]);

  const secondsRemaining = (leagueSettings.draft.timePerRound ?? 0) - seconds;

  return (
    <div className="ml-4 mr-2 flex min-w-max flex-col items-center font-sans">
      <div className="text-sm">
        Round {round} of {leagueSettings.draft.numRounds}
      </div>
      {
        secondsRemaining !== leagueSettings.draft.timePerRound ? (
          <>
            <div className="text-3xl tabular-nums">{timer}</div>
            <Progress className="h-2" value={(secondsRemaining / (leagueSettings.draft.timePerRound ?? 0)) * 100} />
          </>
        ) : (
          isAdmin && (
            <Button
              onClick={() =>
                auto.mutate({
                  sessionId,
                  studioId: draftingStudioId,
                  pick: currentPick.num,
                })
              }
              isLoading={auto.isLoading}
            >
              Auto Draft
            </Button>
          )
        )
        //  (
        //   <>
        //     <Loader2 className="mx-auto my-2 animate-spin" />
        //     <p className="text-xs">Processing...</p>
        //   </>
        // )
      }
    </div>
  );
}

function OnTheClock({ pick, studio }: { pick: number; studio?: LeagueSessionStudio }) {
  const { data: sessionData } = useSession();

  if (!studio) return <></>;
  return (
    <div
      className={cn(
        "bg-primary ml-2 mr-4 flex h-[88px] min-w-max items-center px-2 py-2 text-white",
        studio.ownerId === sessionData?.user.id ? "bg-green-500" : "",
      )}
    >
      <div className="flex flex-col items-center font-sans">
        <div className="text-sm uppercase">On the Clock: Pick {pick}</div>
        <div className="flex">
          <StudioIcon image={studio.image} />
          <div className="ml-1 text-2xl">{studio.name}</div>
        </div>
      </div>
    </div>
  );
}

function UpcomingPick({ num, studio }: { num: number; studio?: LeagueSessionStudio }) {
  if (!studio) return <></>;
  return (
    <div className="border-lb-blue flex w-[104px] max-w-[104px] flex-col items-center self-center border-2 px-2 py-1 font-sans text-white">
      <div className="text-sm uppercase">Pick {num}</div>
      <StudioIcon image={studio.image} />
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
  films: StudioFilmTMDB[];
  expand: boolean;
  setExpand?: Dispatch<SetStateAction<boolean>>;
}) {
  return (
    <>
      <div className="flex items-center">
        <p className="hidden lg:block">My Studio</p>
        {!!setExpand && (
          <Button className="ml-auto pr-1" variant="ghost" onClick={() => setExpand((s) => !s)}>
            {expand ? <ArrowLeftFromLine /> : <ArrowRightFromLine />}
          </Button>
        )}
      </div>
      <div
        className={cn(
          "scrollbar-hidden grid max-h-[calc(100%-40px)] gap-y-2 overflow-y-auto",
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
      <div className="hidden lg:block">Activity</div>
      <div className="scrollbar-hidden flex max-h-[calc(100%-30px)] flex-col-reverse gap-2 overflow-y-auto px-2">
        {activities.map((activity, i) => {
          return (
            <div className="p-2 odd:text-[#9ac] even:bg-[#9ac] even:text-white" key={i}>
              {activity}
            </div>
          );
        })}
      </div>
    </>
  );
}

function Mobile() {
  const { data: sessionData } = useSession();

  const [tab, setTab] = useState<"my" | "available" | "activity">("my");

  return (
    <Layout title="Fantasy Film">
      <div className="flex flex-col">
        <div className="mb-4 flex justify-around border-b-[1px] border-zinc-50">
          <Button
            className={cn("text-lg", tab === "my" && "text-primary font-bold")}
            variant="ghost"
            onClick={() => setTab("my")}
          >
            My Studio
          </Button>
          <Button
            className={cn("text-lg", tab === "available" && "text-primary font-bold")}
            variant="ghost"
            onClick={() => setTab("available")}
          >
            Available Films
          </Button>
          <Button
            className={cn("text-lg", tab === "activity" && "text-primary font-bold")}
            variant="ghost"
            onClick={() => setTab("activity")}
          >
            Activity
          </Button>
        </div>
      </div>
    </Layout>
  );
}
