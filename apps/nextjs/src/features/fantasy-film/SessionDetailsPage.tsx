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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
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

        <div className="">
          <Tabs defaultValue="my-studio" className="w-full px-2 lg:px-4">
            <TabsList>
              <TabsTrigger value="my-studio">My Studio</TabsTrigger>
              <TabsTrigger value="opposing-studios">
                Opposing Studios
              </TabsTrigger>
              <TabsTrigger value="standings">Standings</TabsTrigger>
              <TabsTrigger value="films">Films</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
            <TabsContent value="my-studio">my-studio</TabsContent>
            <TabsContent value="opposing-studios">Opposing-studios</TabsContent>
            <TabsContent value="standings">Standings</TabsContent>
            <TabsContent value="films">Films</TabsContent>
            <TabsContent value="activity">Activity</TabsContent>
            <TabsContent value="settings">Settings</TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
}
