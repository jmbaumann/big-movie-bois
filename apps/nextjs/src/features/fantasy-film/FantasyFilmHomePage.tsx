import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { inferRouterOutputs } from "@trpc/server";
import { format } from "date-fns";
import { useSession } from "next-auth/react";

import { AppRouter, RouterOutputs } from "@repo/api";

import { api } from "~/utils/api";
import { getFilmsReleased } from "~/utils/fantasy-film-helpers";
import useBreakpoint from "~/utils/hooks/use-breakpoint";
import { cn } from "~/utils/shadcn";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { toast } from "~/components/ui/hooks/use-toast";
import Layout from "~/layouts/main/Layout";
import BiddingWarDialog from "./BiddingWarDialog";
import LeagueInvitesDialog from "./LeagueInvitesDialog";
import NewLeagueDialog from "./NewLeagueDialog";

type Leagues = RouterOutputs["ffLeague"]["getMyLeagues"];
type League = Leagues[number];
type BiddingWarSession = RouterOutputs["ffLeague"]["getSiteWideSessions"][number];
type Studio = BiddingWarSession["studios"][number] | undefined;

export default function FantasyFilmHomePage() {
  const { data: sessionData } = useSession();
  const router = useRouter();
  const breakpoint = useBreakpoint();

  const { data: leagues, refetch } = api.ffLeague.getMyLeagues.useQuery(undefined, {
    enabled: !!sessionData?.user,
  });
  const { data: biddingWarSessions } = api.ffLeague.getSiteWideSessions.useQuery(undefined);

  if (breakpoint.isMobile)
    return <Mobile leagues={leagues} biddingWarSessions={biddingWarSessions} refresh={refetch} />;

  return (
    <Layout title="Fantasy Film" showFooter>
      <div className="hidden w-full gap-x-4 lg:flex">
        <div className="w-2/3">
          <div className="mb-4 flex items-center">
            <h1 className="text-2xl">My Leagues</h1>
            <div className="ml-auto flex items-center">
              {sessionData?.user && <LeagueInvitesDialog refreshLeagues={refetch} />}
              {sessionData?.user && <NewLeagueDialog className="ml-2" />}
            </div>
          </div>
          {sessionData?.user ? (
            leagues?.map((league, i) => <LeagueCard key={i} league={league} />)
          ) : (
            <p className="w-full text-center">Sign In to see your leagues or create a new one</p>
          )}
        </div>

        <div className="w-1/3">
          <div className="mb-4 flex items-center">
            <h1 className="text-2xl">Bidding Wars</h1>
            <BiddingWarDialog className="ml-auto h-[40px] text-white" />
          </div>
          {biddingWarSessions?.map((session, i) => {
            const myStudio = session.studios.find((e) => e.ownerId === sessionData?.user.id);
            return <BiddingWarCard key={i} session={session} myStudio={myStudio} />;
          })}
        </div>
      </div>
    </Layout>
  );
}

function LeagueCard({ league }: { league: League }) {
  return (
    <Card className="my-2">
      <CardHeader>
        <CardTitle>
          <Link className="hover:text-primary" href={`/fantasy-film/${league.id}`}>
            {league.name}
          </Link>
        </CardTitle>
        <CardDescription>
          Owner: {league.owner.username} | Members: {league.members.length}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <span>Active Session{league.sessions.length > 1 && "s"}</span>

        {league.sessions.map((session, i) => (
          <Card key={i} className="my-2">
            <CardHeader>
              <CardTitle>
                <Link className="hover:text-primary" href={`/fantasy-film/${league.id}/${session.id}`}>
                  {session.name}
                </Link>
              </CardTitle>
              <CardDescription>
                {format(session.startDate, "LLL dd, yyyy")} - {format(session.endDate, "LLL dd, yyyy")}
              </CardDescription>
            </CardHeader>
            {/* <CardContent>TEAM NAME</CardContent> */}
          </Card>
        ))}
      </CardContent>
    </Card>
  );
}

function BiddingWarCard({ key, session, myStudio }: { key: number; session: BiddingWarSession; myStudio: Studio }) {
  const { data: sessionData } = useSession();
  const router = useRouter();

  const { mutate: join, isLoading: joining } = api.ffStudio.create.useMutation();

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
    <Card key={key} className="my-2">
      <CardHeader>
        <CardTitle>
          <Link className="hover:text-primary" href={`/fantasy-film/bidding-war/${session.id}`}>
            {session.name}
          </Link>
        </CardTitle>
        <CardDescription>
          <p className="inline-block text-sm">
            {format(session.startDate, "LLL d, yyyy")} - {format(session.endDate, "LLL d, yyyy")}
          </p>
          <p className="float-right">Studios: {session._count.studios}</p>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {myStudio ? (
          <>
            <div className="flex justify-between">
              <p>{myStudio.name}</p>
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
}

function Mobile({
  leagues,
  biddingWarSessions,
  refresh,
}: {
  leagues?: League[];
  biddingWarSessions?: BiddingWarSession[];
  refresh: () => void;
}) {
  const { data: sessionData } = useSession();

  const [tab, setTab] = useState<"my" | "public">("my");

  return (
    <Layout title="Fantasy Film">
      <div className="flex flex-col">
        <div className="mb-4 flex justify-around border-b-[1px] border-zinc-50">
          <Button
            className={cn("text-lg", tab === "my" && "text-primary font-bold")}
            variant="ghost"
            onClick={() => setTab("my")}
          >
            My Leagues
          </Button>
          <Button
            className={cn("text-lg", tab === "public" && "text-primary font-bold")}
            variant="ghost"
            onClick={() => setTab("public")}
          >
            Bidding War
          </Button>
        </div>

        {tab === "my" && (
          <div>
            <div className="flex items-center justify-between">
              {sessionData?.user && <NewLeagueDialog className="" />}
              {sessionData?.user && <LeagueInvitesDialog refreshLeagues={refresh} />}
            </div>

            {sessionData?.user ? (
              leagues?.map((league, i) => <LeagueCard key={i} league={league} />)
            ) : (
              <p className="w-full text-center">Sign In to see your leagues or create a new one</p>
            )}
          </div>
        )}

        {tab === "public" && (
          <>
            <BiddingWarDialog className="ml-auto text-white" />

            {biddingWarSessions?.map((session, i) => {
              const myStudio = session.studios.find((e) => e.ownerId === sessionData?.user.id);
              return <BiddingWarCard key={i} session={session} myStudio={myStudio} />;
            })}
          </>
        )}
      </div>
    </Layout>
  );
}
