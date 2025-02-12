import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/router";
import { format } from "date-fns";
import { CheckCircle2, Crown, X } from "lucide-react";
import { useSession } from "next-auth/react";

import { api, RouterOutputs } from "~/utils/api";
import { cn } from "~/utils/shadcn";
import { getMatchups, getNextMatchup, orderEntries } from "~/utils/tournament-helpers";
import { Button } from "~/components/ui/button";
import { toast } from "~/components/ui/hooks/use-toast";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import Layout from "~/layouts/main/Layout";
import { scrollToElement } from "~/utils";

type TournamentEntry = NonNullable<RouterOutputs["tournament"]["getById"]>["rounds"][number]["entries"][number];
type Matchup = {
  entry1: TournamentEntry;
  entry2: TournamentEntry;
};

export default function TouramentDetailsPage() {
  const router = useRouter();
  const tournamentId = router.query.id as string | undefined;

  const [activeMatchup, setActiveMatchup] = useState<Matchup | undefined>();
  const [showImages, setShowImages] = useState(true);

  const activeVote = activeMatchup
    ? activeMatchup.entry1.votedFor
      ? activeMatchup.entry1.id
      : activeMatchup.entry2.votedFor
      ? activeMatchup.entry2.id
      : undefined
    : undefined;

  const { data: tournament, isLoading } = api.tournament.getById.useQuery(
    { id: tournamentId ?? "" },
    { enabled: !!tournamentId },
  );

  const activeRound = tournament
    ? tournament.rounds.findIndex((e) => e.startDate <= new Date() && e.endDate >= new Date()) + 1
    : undefined;
  const hasImages = tournament?.rounds.some((r) => r.entries.some((e) => !!e.image));

  useEffect(() => {
    if (tournament && activeRound !== undefined)
      setActiveMatchup(getNextMatchup(tournament.rounds[activeRound - 1]?.matchups));
  }, [tournament]);

  const handleMatchupClick = (matchup: Matchup) => {
    setActiveMatchup(matchup);
    setTimeout(() => {
      scrollToElement("tournament-wrapper");
    }, 150);
  };

  return (
    <Layout fullWidth showFooter>
      {!!tournament && (
        <div id="tournament-wrapper" className="px-4">
          <p className="text-3xl text-white">{tournament.name}</p>
          <p className="text-lg text-white">{tournament.description}</p>

          {!!tournament.winner && (
            <div className="mt-2 flex flex-col items-center">
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

          <div
            id="rounds-wrapper"
            className={cn(
              "sticky top-0 z-20 mt-2 grid grid-cols-4 gap-x-4 bg-neutral-900 py-2 shadow-md",
              tournament.rounds.length === 5 && "grid-cols-5",
              tournament.rounds.length === 6 && "grid-cols-6",
            )}
          >
            {tournament.rounds.map((round, j) => (
              <div
                key={j}
                className={cn(
                  "w-full rounded-lg border-2 px-4 py-2 text-white",
                  activeRound == j + 1 ? "border-primary" : "border-white",
                )}
              >
                <p className="text-2xl font-bold">Round #{j + 1}</p>
                <p>
                  {format(round.startDate, "PP")} - {format(round.endDate, "PP")}
                </p>
              </div>
            ))}
          </div>
          <p className="mb-4 mt-1 text-sm italic">All rounds start at 3:00pm ET / 12:00pm PT</p>

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

          {hasImages && (
            <div className="mb-2 flex items-center gap-x-2">
              <Switch checked={showImages} onCheckedChange={setShowImages} className="" />
              <Label>Show Images</Label>
            </div>
          )}

          <div
            className={cn(
              "mt-2 grid grid-cols-4 gap-x-4",
              tournament.rounds.length === 5 && "grid-cols-5",
              tournament.rounds.length === 6 && "grid-cols-6",
            )}
          >
            {tournament.rounds.map((round, i) => {
              const isActiveRound = activeRound === i + 1;
              if ((activeRound && activeRound >= i + 1) || !!tournament.winner)
                return (
                  <div className="flex w-full flex-col justify-around">
                    {round.matchups?.map((matchup, k) => {
                      return (
                        <div
                          key={`${i}-${k}`}
                          className="mb-6"
                          onClick={() => {
                            if (isActiveRound) handleMatchupClick(matchup);
                          }}
                        >
                          <div
                            key={matchup.entry1.id}
                            className={cn(
                              "mb-1 flex items-center rounded-lg border-2 border-white p-2",
                              isActiveRound && "cursor-pointer",
                              matchup.entry1.votedFor && "border-primary",
                            )}
                          >
                            {!!matchup.entry1.image && showImages ? (
                              <Image
                                className="mr-2 w-16 object-cover object-center"
                                src={matchup.entry1.image}
                                height={800}
                                width={600}
                                alt={matchup.entry1.name}
                              />
                            ) : (
                              // <CheckCircle2
                              //   className={cn(
                              //     "mr-2 min-w-[20px] text-green-400",
                              //     !matchup.entry1.votedFor && "invisible",
                              //   )}
                              //   size={20}
                              // />
                              <></>
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
                          <div
                            key={matchup.entry2.id}
                            className={cn(
                              "flex items-center rounded-lg border-2 border-white p-2",
                              isActiveRound && "cursor-pointer",
                              matchup.entry2.votedFor && "border-primary",
                            )}
                          >
                            {!!matchup.entry2.image && showImages ? (
                              <Image
                                className="mr-2 w-16 object-cover object-center"
                                src={matchup.entry2.image}
                                height={800}
                                width={600}
                                alt={matchup.entry2.name}
                              />
                            ) : (
                              // <CheckCircle2
                              //   className={cn(
                              //     "mr-2 min-w-[20px] text-green-400",
                              //     !matchup.entry2.votedFor && "invisible",
                              //   )}
                              //   size={20}
                              // />
                              <></>
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
                      );
                    })}
                  </div>
                );
            })}
          </div>
        </div>
      )}
    </Layout>
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
            toast({ title: "Vote counted" });
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
