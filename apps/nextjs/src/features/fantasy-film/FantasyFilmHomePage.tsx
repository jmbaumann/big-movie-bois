import Link from "next/link";
import { useRouter } from "next/router";
import { inferRouterOutputs } from "@trpc/server";
import { format } from "date-fns";
import { useSession } from "next-auth/react";

import { AppRouter } from "@repo/api";

import { api } from "~/utils/api";
import { Button } from "~/components/ui/button";
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
  const router = useRouter();
  const uuid = router.query.uuid as string;

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
          <NewLeagueDialog className="ml-auto" />
        </div>
        {sessionData?.user ? (
          leagues?.map((league, i) => <LeagueCard league={league} />)
        ) : (
          <p className="w-full text-center">
            Sign Up or Login to see your joined leagues
          </p>
        )}
      </div>
    </Layout>
  );
}

const activeSessions = [
  { name: "2024 FFL", startDate: "2024-02-01", endDate: "2024-12-31" },
];

function LeagueCard({ league }: { league: League }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Link
            className="hover:text-primary"
            href={`/fantasy-film/${league.uuid}`}
          >
            {league.name}
          </Link>
        </CardTitle>
        <CardDescription>
          Owner: {league.owner.name} Created:{" "}
          {format(league.createdAt.toString(), "yyyy-MM-dd")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p>Active Session(s)</p>
        {activeSessions.map((session, i) => (
          <Card key={i}>
            <CardHeader>
              <CardTitle>{session.name}</CardTitle>
              <CardDescription>
                {session.startDate} - {session.endDate}
              </CardDescription>
            </CardHeader>
            <CardContent>TEAM NAME</CardContent>
          </Card>
        ))}
      </CardContent>
    </Card>
  );
}
