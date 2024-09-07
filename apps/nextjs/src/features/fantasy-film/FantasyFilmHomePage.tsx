import Link from "next/link";
import { inferRouterOutputs } from "@trpc/server";
import { format } from "date-fns";
import { useSession } from "next-auth/react";

import { AppRouter } from "@repo/api";

import { api } from "~/utils/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import Layout from "~/layouts/main/Layout";
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
  const handleRefetch = () => {
    void refetch();
  };

  return (
    <Layout showFooter>
      <div>
        <div className="mb-4 flex items-center">
          <h1 className="text-2xl">My Leagues</h1>
          {sessionData?.user && <NewLeagueDialog className="ml-auto" />}
        </div>
        {sessionData?.user ? (
          leagues?.map((league, i) => <LeagueCard key={i} league={league} />)
        ) : (
          <p className="w-full text-center">
            Sign In to see your leagues or create a new one
          </p>
        )}
      </div>
    </Layout>
  );
}

function LeagueCard({ league }: { league: League }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Link
            className="hover:text-primary"
            href={`/fantasy-film/${league.id}`}
          >
            {league.name}
          </Link>
        </CardTitle>
        <CardDescription>
          Owner: {league.owner.name} | Members: {league.members.length}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p>Active Session(s)</p>
        {league.sessions.map((session, i) => (
          <Card key={i}>
            <CardHeader>
              <CardTitle>
                <Link
                  className="hover:text-primary"
                  href={`/fantasy-film/${league.id}/${session.id}`}
                >
                  {session.name}
                </Link>
              </CardTitle>
              <CardDescription>
                {format(session.startDate, "yyyy-MM-dd")} -{" "}
                {format(session.endDate, "yyyy-MM-dd")}
              </CardDescription>
            </CardHeader>
            <CardContent>TEAM NAME</CardContent>
          </Card>
        ))}
      </CardContent>
    </Card>
  );
}
