import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/router";
import { format } from "date-fns";
import { ArrowLeftCircle, ArrowRightCircle, ArrowUp, Crown, X } from "lucide-react";
import { useSession } from "next-auth/react";

import { api, RouterOutputs } from "~/utils/api";
import useBreakpoint from "~/utils/hooks/use-breakpoint";
import { cn } from "~/utils/shadcn";
import { getNextMatchup } from "~/utils/tournament-helpers";
import Countdown from "~/components/Countdown";
import { Button } from "~/components/ui/button";
import { toast } from "~/components/ui/hooks/use-toast";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import Layout from "~/layouts/main/Layout";
import { ONE_DAY_IN_SECONDS, scrollToElement } from "~/utils";

type TournamentEntry = NonNullable<RouterOutputs["tournament"]["getById"]>["rounds"][number]["entries"][number];
type Matchup = {
  entry1: TournamentEntry;
  entry2: TournamentEntry;
};

export default function TouramentDetailsPage() {
  const router = useRouter();
  const tournamentId = router.query.id as string | undefined;

  const breakpoint = useBreakpoint();

  const [activeMatchup, setActiveMatchup] = useState<Matchup | undefined>();
  const [showImages, setShowImages] = useState(true);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [visibleRound, setVisibleRound] = useState<number | null>(null);

  const activeVote = activeMatchup
    ? activeMatchup.entry1.votedFor
      ? activeMatchup.entry1.id
      : activeMatchup.entry2.votedFor
      ? activeMatchup.entry2.id
      : undefined
    : undefined;

  const { data: tournament, isLoading } = api.tournament.getById.useQuery(
    { id: tournamentId ?? "" },
    { enabled: !!tournamentId, staleTime: ONE_DAY_IN_SECONDS },
  );

  const activeRound = tournament
    ? tournament.rounds.findIndex((e) => e.startDate <= new Date() && e.endDate >= new Date()) + 1
    : undefined;
  const hasImages = tournament?.rounds.some((r) => r.entries.some((e) => !!e.image));

  useEffect(() => {
    if (tournament && activeRound !== undefined)
      setActiveMatchup(getNextMatchup(tournament.rounds[activeRound - 1]?.matchups));
  }, [tournament]);

  useEffect(() => {
    if (!scrollContainerRef.current || !activeRound) return;

    const roundElements = Array.from(scrollContainerRef.current.children) as HTMLDivElement[];
    const targetElement = roundElements[activeRound - 1];

    if (targetElement) targetElement.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [activeRound]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const roundElements = Array.from(container.children) as HTMLDivElement[];

    const observer = new IntersectionObserver(
      (entries) => {
        const mostVisible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (mostVisible) {
          const index = roundElements.indexOf(mostVisible.target as HTMLDivElement);
          setVisibleRound(index + 1);
        }
      },
      { root: container, threshold: 0.6 }, // 60% visibility to be considered active
    );

    roundElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [scrollContainerRef.current]);

  const handleMatchupClick = (matchup: Matchup) => {
    setActiveMatchup(matchup);
    setTimeout(() => {
      scrollToElement("tournament-wrapper");
    }, 150);
  };

  return (
    <Layout fullWidth showFooter>
      {!!tournament && (
        <div id="tournament-wrapper" className="px-4 pb-10">
          <p className="text-3xl text-white">{tournament.name}</p>
          <p className="text-lg text-white">{tournament.description}</p>
          <p className="text-sm italic">All rounds start at 3:00pm ET / 12:00pm PT</p>

          {!!activeMatchup && (
            <div className="flex flex-col">
              <div className="mx-auto flex max-w-xl gap-x-12">
                <VoteOption
                  entry={activeMatchup.entry1}
                  tournamentId={tournament.id}
                  activeRound={activeRound}
                  activeVote={activeVote}
                />
                <VoteOption
                  entry={activeMatchup.entry2}
                  tournamentId={tournament.id}
                  activeRound={activeRound}
                  activeVote={activeVote}
                />
              </div>
              <Button className="mx-auto mt-2 w-min" variant="ghost" onClick={() => setActiveMatchup(undefined)}>
                <X /> Close
              </Button>
            </div>
          )}

          {!!tournament.winner && (
            <div className="my-2 flex flex-col items-center">
              <div className="relative mb-2 flex">
                <Crown className="text-primary absolute -left-12 -rotate-12" size={40} />
                <div className="my-1">
                  <p className="text-center text-2xl text-white">{tournament.winner.name}</p>
                  {/* <p className="text-center text-sm text-white">{tournament.winner.description}</p> */}
                </div>
              </div>
              {!!tournament.winner.image && (
                <div className={`relative inline-block`}>
                  <div
                    className="animate-glow absolute inset-0 rounded-lg"
                    style={
                      {
                        "--glow-color": "13 148 136",
                      } as React.CSSProperties
                    }
                  ></div>
                  <Image
                    className="relative z-10 rounded-lg"
                    src={tournament.winner.image}
                    height={400}
                    width={300}
                    alt={tournament.winner.name}
                  />
                </div>
              )}
            </div>
          )}

          <div className="sticky top-0 z-30 mt-4 flex w-full flex-col bg-neutral-900 py-2 shadow-md">
            <div
              id="rounds-wrapper"
              className={cn(
                "grid grid-cols-4 gap-x-4 bg-neutral-900 py-2",
                tournament.rounds.length === 5 && "grid-cols-5",
                tournament.rounds.length === 6 && "grid-cols-6",
              )}
            >
              {tournament.rounds.map((round, j) => {
                return (
                  <div key={j} className={cn("z-20 flex flex-col bg-neutral-900")}>
                    <div
                      className={cn(
                        "sticky z-30 flex flex-col bg-neutral-900 lg:top-10 lg:z-20",
                        "mb-4 w-full border-2 py-2 text-center text-white lg:px-4",
                        activeRound === j + 1 ? "border-primary" : "border-white",
                        breakpoint.isMobile && visibleRound === j + 1 && "text-primary",
                        !!activeRound && activeRound < j + 1 && !tournament.winner && "border-[#9ab] text-[#9ab]",
                      )}
                    >
                      {breakpoint.isMobile ? (
                        <p className="text-2xl font-bold">R{j + 1}</p>
                      ) : (
                        <>
                          <p className="text-2xl font-bold">Round #{j + 1}</p>
                          <p>
                            {format(round.startDate, "LLL d")} - {format(round.endDate, "LLL d")}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between">
              {hasImages && (
                <div className="flex items-center gap-x-2">
                  <Switch checked={showImages} onCheckedChange={setShowImages} className="" />
                  <Label>Images</Label>
                </div>
              )}
              {!!activeRound && !tournament.winner && (
                <div className="flex text-white">
                  Round {activeRound} ends in{" "}
                  <Countdown classname="ml-1" target={tournament.rounds[activeRound - 1]?.endDate!} />
                </div>
              )}
            </div>
            <div className="mt-2 flex items-center justify-center text-center text-xs lg:hidden">
              <ArrowLeftCircle className="mr-2" size={18} />
              Swipe to see other rounds
              <ArrowRightCircle className="ml-2" size={18} />
            </div>
          </div>

          <div
            ref={scrollContainerRef}
            className={cn(
              "mt-2 grid grid-cols-4 gap-x-4",
              tournament.rounds.length === 5 && "grid-cols-5",
              tournament.rounds.length === 6 && "grid-cols-6",
              breakpoint.isMobile && "scrollbar-hidden flex snap-x snap-mandatory flex-nowrap overflow-x-auto",
            )}
          >
            {tournament.rounds.map((round, i) => {
              const isActiveRound = activeRound === i + 1;
              if ((activeRound && activeRound >= i + 1) || !!tournament.winner)
                return (
                  <div
                    key={i}
                    id="matchups"
                    className={cn(
                      "flex w-full flex-col lg:justify-around",
                      breakpoint.isMobile && "mx-2 w-full flex-none snap-center snap-always",
                    )}
                  >
                    {breakpoint.isMobile && (
                      <p className="mb-2 text-center text-white">
                        Round #{i + 1} | {format(round.startDate, "LLL d")} - {format(round.endDate, "LLL d")}
                      </p>
                    )}
                    {round.matchups?.map((matchup, k) => {
                      return (
                        <div
                          key={`${i}-${k}`}
                          className="mb-6"
                          onClick={() => {
                            if (isActiveRound) handleMatchupClick(matchup);
                          }}
                        >
                          <Matchup matchup={matchup} isActiveRound={isActiveRound} showImages={showImages} />
                        </div>
                      );
                    })}
                  </div>
                );
            })}
          </div>

          {breakpoint.isMobile && (
            <div className="sticky bottom-4 flex w-full">
              <Button className="ml-auto" onClick={() => scrollToElement("matchups", -160)}>
                <ArrowUp className="mr-2" /> Top
              </Button>
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}

function Matchup({
  matchup,
  isActiveRound,
  showImages,
}: {
  matchup: Matchup;
  isActiveRound: boolean;
  showImages: boolean;
}) {
  return (
    <div className={cn("flex flex-col px-1", isActiveRound && "cursor-pointer")}>
      <div className={cn("rounded-t-xl border-2 border-white", matchup.entry1.votedFor && "border-primary")}>
        <div className="flex items-center p-2">
          {!!matchup.entry1.image && showImages && (
            <Image
              className="mr-2 w-16 object-cover object-center"
              src={matchup.entry1.image}
              height={800}
              width={600}
              alt={matchup.entry1.name}
            />
          )}
          <p
            className={cn(
              isActiveRound && "text-white",
              matchup.entry1.winner && "font-bold text-white",
              !isActiveRound && !matchup.entry1.winner && "line-through",
            )}
          >
            {matchup.entry1.name}
          </p>
        </div>
        {!isActiveRound && <div className="px-2 text-right text-sm text-white">Votes: {matchup.entry1.totalVotes}</div>}
      </div>
      <div
        className={cn("flex flex-col rounded-b-xl border-2 border-white", matchup.entry2.votedFor && "border-primary")}
      >
        {!isActiveRound && <div className="px-2 text-right text-sm text-white">Votes: {matchup.entry2.totalVotes}</div>}
        <div className="flex items-center p-2">
          {!!matchup.entry2.image && showImages && (
            <Image
              className="mr-2 w-16 object-cover object-center"
              src={matchup.entry2.image}
              height={800}
              width={600}
              alt={matchup.entry2.name}
            />
          )}
          <p
            className={cn(
              isActiveRound && "text-white",
              matchup.entry2.winner && "font-bold text-white",
              !isActiveRound && !matchup.entry2.winner && "line-through",
            )}
          >
            {matchup.entry2.name}
          </p>
        </div>
      </div>
    </div>
  );
}

function VoteOption({
  entry,
  tournamentId,
  activeRound,
  activeVote,
}: {
  entry: TournamentEntry;
  tournamentId: string;
  activeRound?: number;
  activeVote?: string;
}) {
  const { data: sessionData } = useSession();
  const trpc = api.useContext();

  const { mutate: vote } = api.tournament.vote.useMutation();

  const handleVote = () => {
    if (sessionData?.user && activeRound) {
      vote(
        { entryId: entry.id, round: activeRound, userId: sessionData.user.id, activeVote },
        {
          onSuccess: () => {
            toast({ title: "Vote counted", dir: "" });
            trpc.tournament.getById.invalidate({ id: tournamentId });
          },
          onError: () => {
            toast({ title: "Something went wrong", variant: "destructive" });
          },
        },
      );
    }
  };

  return (
    <div id="voting-options" className="flex flex-col justify-between">
      {!!entry.image && (
        <Image className="object-cover object-center" src={entry.image} height={800} width={600} alt={entry.name} />
      )}
      <div className="my-1">
        <p className="text-center text-2xl text-white">{entry.name}</p>
        <p className="text-center text-sm text-white">{entry.description}</p>
      </div>

      <Button className={cn("items-end")} disabled={entry.votedFor} onClick={() => handleVote()}>
        Vote
      </Button>
    </div>
  );
}
