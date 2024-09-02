import Link from "next/link";
import { useRouter } from "next/router";
import { inferRouterOutputs } from "@trpc/server";
import { format } from "date-fns";
import { ChevronLeft } from "lucide-react";
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
import NewSessionDialog from "./NewSessionDialog";

type Leagues = inferRouterOutputs<AppRouter>["ffLeague"]["getMyLeagues"];
type League = Leagues[number];

export default function LeagueDetailsPage() {
  const { data: sessionData } = useSession();
  const router = useRouter();
  const leagueId = router.query.leagueId as string;

  const {
    data: league,
    isLoading,
    refetch,
  } = api.ffLeague.getByUuid.useQuery(
    { uuid: leagueId },
    {
      enabled: !!leagueId,
    },
  );
  const handleRefetch = () => {
    void refetch();
  };

  return (
    <Layout showFooter>
      <div>
        <Link href={"/fantasy-film"}>
          <Button variant="link" className="px-0">
            <ChevronLeft /> Back to Leagues
          </Button>
        </Link>
        <div className="mb-4 flex items-center">
          <h1 className="text-2xl">{league?.name}</h1>
          <NewSessionDialog className="ml-auto" />
        </div>
        {
          // league?.sessions?.map((session, i) => <SessionCard key={i} session={session} />)
        }
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
