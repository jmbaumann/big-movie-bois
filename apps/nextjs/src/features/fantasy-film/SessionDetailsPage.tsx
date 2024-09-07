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

type Leagues = inferRouterOutputs<AppRouter>["ffLeague"]["getMyLeagues"];
type League = Leagues[number];

export default function SessionDetailsPage() {
  const { data: sessionData } = useSession();
  const router = useRouter();
  const sessionId = router.query.sessionId as string;

  const {
    data: session,
    isLoading,
    refetch,
  } = api.ffLeagueSession.getById.useQuery(
    { id: sessionId },
    {
      enabled: !!sessionId,
    },
  );
  const handleRefetch = () => {
    void refetch();
  };

  return (
    <Layout showFooter>
      <div>
        <Link href={`/fantasy-film/${session?.leagueId}`}>
          <Button variant="link" className="px-0">
            <ChevronLeft /> Back to League
          </Button>
        </Link>
        <div className="mb-4 flex items-center">
          <h1 className="text-2xl">{session?.name}</h1>
        </div>
      </div>
    </Layout>
  );
}
