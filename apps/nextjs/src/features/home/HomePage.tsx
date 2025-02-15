import Link from "next/link";
import { useRouter } from "next/router";
import { format } from "date-fns";
import { Instagram, Mail, Twitch, Twitter, Youtube } from "lucide-react";
import { useSession } from "next-auth/react";
import { FaLetterboxd, FaTiktok } from "react-icons/fa6";

import { api } from "~/utils/api";
import { getFilmsReleased } from "~/utils/fantasy-film-helpers";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { toast } from "~/components/ui/hooks/use-toast";
import BiddingWarDialog from "~/features/fantasy-film/BiddingWarDialog";
import LeagueInvitesDialog from "~/features/fantasy-film/LeagueInvitesDialog";
import StudioIcon from "~/features/fantasy-film/StudioIcon";
import Poll from "~/features/polls/Poll";
import AwardShowCard from "../award-shows/AwardShowCard";
import TournamentCard from "../tournament/TournamentCard";

export default function HomePage() {
  const { data: sessionData } = useSession();
  const router = useRouter();

  const { data: leagues, refetch } = api.ffLeague.getMyLeagues.useQuery(undefined, {
    enabled: !!sessionData?.user,
  });
  const { data: biddingWarSessions } = api.ffLeague.getSiteWideSessions.useQuery(undefined);
  const { mutate: join, isLoading: joining } = api.ffStudio.create.useMutation();

  const { data: polls, refetch: refreshPolls } = api.poll.get.useQuery({ active: true });

  const { data: tournaments, refetch: refreshTournaments } = api.tournament.get.useQuery();

  const { data: awardShows, refetch: refreshAwardShows } = api.awardShow.getActive.useQuery();

  const activeSessions = leagues
    ?.map((e) => e.sessions)
    .flat()
    .filter((e) => e);

  const activeTournaments = tournaments?.filter((e) => e.endDate && e.endDate > new Date());

  function handleJoin(sessionId: string) {
    if (sessionData)
      join(
        { sessionId, ownerId: sessionData.user.id },
        {
          onSuccess: () => {
            toast({ title: "Session joined" });
            router.push(`/fantasy-film/bidding-war/${sessionId}`);
          },
        },
      );
  }

  return (
    <div className="flex flex-col lg:flex-row lg:space-x-2">
      <div className="hidden w-2/3 flex-col lg:flex">
        <div className="flex items-center justify-between">
          <Link className="hover:text-primary text-2xl uppercase" href={"/fantasy-film"}>
            Fantasy Film
          </Link>
          {sessionData?.user && <LeagueInvitesDialog refreshLeagues={refetch} />}
        </div>

        {!sessionData?.user && (
          <p className="w-full text-center">Sign In to see your Fantasy Film Leagues or create a new one</p>
        )}

        {sessionData?.user && !activeSessions?.length && (
          <>
            <p className="w-full text-center">You do not have any active Fantasy Film Sessions</p>
            <p className="w-full text-center">
              Create or join a{" "}
              <Link className="underline" href={"/fantasy-film"}>
                Fantasy Film League
              </Link>
            </p>
          </>
        )}

        {activeSessions?.map((s, i) => {
          const session = s!;
          const studio = session.studios[0];

          return (
            <Card key={i} className="my-1">
              <CardHeader>
                <CardTitle className="flex items-end justify-between">
                  <Link className="hover:text-primary" href={`/fantasy-film/${session.leagueId}/${session.id}`}>
                    {session.name}
                  </Link>
                  <div className="text-sm">
                    {format(session.startDate, "LLL dd, yyyy")} - {format(session.endDate, "LLL dd, yyyy")}
                  </div>
                </CardTitle>
                <CardDescription className="flex items-end justify-between">
                  <div>League: {session.league.name}</div>
                  <div>Studios: {session._count.studios}</div>
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!!studio ? (
                  <>
                    <div className="flex items-end justify-between">
                      <p
                        className="hover:text-primary flex w-1/2 items-center gap-x-2 hover:cursor-pointer"
                        onClick={() =>
                          router.push({
                            pathname: `/fantasy-film/${session.leagueId}/${session.id}`,
                            query: { tab: "my-studio" },
                          })
                        }
                      >
                        <StudioIcon image={studio.image} />
                        <div className="flex flex-col">
                          <p className="text-xl">{studio.name}</p>
                        </div>
                      </p>
                      <p className="text-sm text-slate-400">{studio.score} pts</p>
                    </div>
                    <div className="flex justify-between text-sm text-slate-400">
                      <p className="inline">
                        Films Released: {getFilmsReleased(studio.films)} / {session.settings.teamStructure.length}
                      </p>
                      <p className="inline">Budget: ${studio.budget}</p>
                    </div>
                  </>
                ) : (
                  <></>
                )}
              </CardContent>
            </Card>
          );
        })}
        {biddingWarSessions?.map((session, i) => {
          const myStudio = session.studios.find((e) => e.ownerId === sessionData?.user.id);
          return (
            <Card key={i} className="my-1">
              <CardHeader>
                <CardTitle className="flex items-end justify-between">
                  <div className="flex items-center">
                    <Link className="hover:text-primary" href={`/fantasy-film/bidding-war/${session.id}`}>
                      {session.name}
                    </Link>
                    {!sessionData?.user && <BiddingWarDialog className="ml-2 h-[40px] text-white" />}
                  </div>
                  <div className="text-sm">
                    {format(session.startDate, "LLL dd, yyyy")} - {format(session.endDate, "LLL dd, yyyy")}
                  </div>
                </CardTitle>
                <CardDescription className="flex items-end justify-between">
                  <div>League: {session.league.name}</div>
                  <div>Studios: {session._count.studios}</div>
                </CardDescription>
              </CardHeader>
              <CardContent>
                {myStudio ? (
                  <>
                    <div className="flex items-end justify-between">
                      <p
                        className="hover:text-primary flex w-1/2 items-center gap-x-2 hover:cursor-pointer"
                        onClick={() =>
                          router.push({
                            pathname: `/fantasy-film/bidding-war/${session.id}`,
                            query: { tab: "my-studio" },
                          })
                        }
                      >
                        <StudioIcon image={myStudio.image} />
                        <div className="flex flex-col">
                          <p className="text-xl">{myStudio.name}</p>
                        </div>
                      </p>
                      <p className="text-sm text-slate-400">{myStudio.score} pts</p>
                    </div>
                    <div className="flex justify-between text-sm text-slate-400">
                      <p className="inline">
                        Films Released: {getFilmsReleased(myStudio.films)} / {session.settings.teamStructure.length}
                      </p>
                      <p className="inline">Budget: ${myStudio.budget}</p>
                    </div>
                  </>
                ) : (
                  <Button onClick={() => handleJoin(session.id)} isLoading={joining} disabled={!sessionData}>
                    {(!sessionData ? "Sign in to " : "") + "Join"}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex w-full flex-col space-y-2 lg:w-1/3">
        <div className="flex">
          <div className="flex grow items-center justify-end gap-x-4">
            <Link className="hover:text-primary" href={"https://youtube.com/@bigmoviebois"} target="_blank">
              <Youtube size={28} />
            </Link>
            <Link className="hover:text-primary" href={"https://twitch.tv/bigmoviebois"} target="_blank">
              <Twitch size={28} />
            </Link>
            <Link className="hover:text-primary" href={"https://twitter.com/bigmoviebois"} target="_blank">
              <Twitter size={28} />
            </Link>
            <Link className="hover:text-primary" href={"https://instagram.com/bigmoviebois"} target="_blank">
              <Instagram size={28} />
            </Link>
            <Link className="hover:text-primary" href={"https://tiktok.com/@bigmoviebois"} target="_blank">
              <FaTiktok size={24} />
            </Link>
            <Link className="hover:text-primary" href={"https://letterboxd.com/jbaumann"} target="_blank">
              <FaLetterboxd size={28} />
            </Link>
            <Link className="hover:text-primary" href={"/contact"}>
              <Mail size={28} />
            </Link>
          </div>
        </div>

        {awardShows?.map((show, i) => <AwardShowCard key={i} awardShow={show} />)}

        {activeTournaments?.map((tournament, i) => <TournamentCard key={i} tournament={tournament} />)}

        {polls?.map((poll, i) => <Poll key={i} poll={poll} refresh={refreshPolls} />)}
      </div>
    </div>
  );
}
