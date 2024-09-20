import Link from "next/link";
import { inferRouterOutputs } from "@trpc/server";
import { format } from "date-fns";
import { useSession } from "next-auth/react";

import { AppRouter } from "@repo/api";

import { api } from "~/utils/api";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import Layout from "~/layouts/main/Layout";
import BiddingWarDialog from "./BiddingWarDialog";
import LeagueInvitesDialog from "./LeagueInvitesDialog";
import NewLeagueDialog from "./NewLeagueDialog";

type Leagues = inferRouterOutputs<AppRouter>["ffLeague"]["getMyLeagues"];
type League = Leagues[number];

export default function FantasyFilmHomePage() {
  const { data: sessionData } = useSession();

  const {
    data: leagues,
    isLoading,
    refetch,
  } = api.ffLeague.getMyLeagues.useQuery(undefined, {
    enabled: !!sessionData?.user,
  });
  const { data: biddingWarSessions } = api.ffLeague.getSiteWideSessions.useQuery(undefined, {
    enabled: !!sessionData?.user,
  });

  const refresh = () => {
    void refetch();
  };

  return (
    <Layout showFooter>
      <div className="flex w-full gap-x-4">
        <div className="w-2/3">
          <div className="mb-4 flex items-center">
            <h1 className="text-2xl">My Leagues</h1>
            <div className="ml-auto flex items-center">
              {sessionData?.user && <LeagueInvitesDialog refreshLeagues={refresh} />}
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
            const sessionJoined = !!session.studios.length;
            return (
              <Card key={i}>
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
                    <p className="float-right">Studios: 38</p>
                  </CardDescription>
                </CardHeader>
                <CardContent>{!sessionJoined && <Button>Join</Button>}</CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}

function LeagueCard({ league }: { league: League }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Link className="hover:text-primary" href={`/fantasy-film/${league.id}`}>
            {league.name}
          </Link>
        </CardTitle>
        <CardDescription>
          Owner: {league.owner.name} | Members: {league.members.length}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <span>Active Session(s)</span>

        {league.sessions.map((session, i) => (
          <Card key={i}>
            <CardHeader>
              <CardTitle>
                <Link className="hover:text-primary" href={`/fantasy-film/${league.id}/${session.id}`}>
                  {session.name}
                </Link>
              </CardTitle>
              <CardDescription>
                {format(session.startDate, "yyyy-MM-dd")} - {format(session.endDate, "yyyy-MM-dd")}
              </CardDescription>
            </CardHeader>
            <CardContent>TEAM NAME</CardContent>
          </Card>
        ))}
      </CardContent>
    </Card>
  );
}
