import Link from "next/link";
import { format } from "date-fns";

import { api } from "~/utils/api";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import Layout from "~/layouts/main/Layout";
import Loading from "~/layouts/main/Loading";

export default function TouramentPage() {
  const { data: tournaments, isLoading } = api.tournament.get.useQuery();

  const activeTournaments = tournaments?.filter((e) => e.endDate && e.endDate > new Date());
  const archivedTournaments = tournaments?.filter((e) => e.endDate && e.endDate < new Date());

  if (isLoading) return <Loading />;

  return (
    <Layout>
      <div className="flex flex-col gap-y-12">
        {!!activeTournaments?.length && (
          <div className="flex flex-col">
            <h1 className="mb-2 text-3xl text-white">Vote Now</h1>
            <div className="flex flex-col gap-y-4">
              {activeTournaments?.map((tournament, i) => {
                const activeRoundIndex = tournament
                  ? tournament.rounds.findIndex((e) => e.startDate <= new Date() && e.endDate >= new Date())
                  : undefined;
                const activeRound = (activeRoundIndex ?? -1) >= 0 ? tournament.rounds[activeRoundIndex!] : undefined;
                return (
                  <Link key={i} href={`/tournaments/${tournament.id}`}>
                    <Card>
                      <CardHeader>
                        <CardTitle>{tournament.name}</CardTitle>
                      </CardHeader>
                      <CardContent className="flex flex-col text-lg lg:flex-row">
                        <div className="mb-2 w-full lg:mb-0 lg:w-1/2">
                          <p dangerouslySetInnerHTML={{ __html: tournament.description }}></p>
                          <p>
                            {tournament.rounds.length} rounds / {tournament.entries.length} entries
                          </p>
                        </div>
                        {!!activeRound && (
                          <div className="w-full lg:w-1/2">
                            <p>Current round: {activeRoundIndex! + 1}</p>
                            <p>
                              {format(activeRound.startDate, "LLL d")} - {format(activeRound.endDate, "LLL d")}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {!!archivedTournaments?.length && (
          <div className="flex flex-col">
            <h1 className="mb-2 text-3xl text-white">History</h1>
            <div className="flex flex-col gap-y-4">
              {archivedTournaments?.map((tournament, i) => (
                <Link key={i} href={`/tournaments/${tournament.id}`}>
                  <Card>
                    <CardHeader>
                      <CardTitle>{tournament.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col text-lg lg:flex-row">
                      <div className="mb-2 w-full lg:mb-0 lg:w-1/2">
                        <p dangerouslySetInnerHTML={{ __html: tournament.description }}></p>
                        <p>
                          {tournament.rounds.length} rounds / {tournament.entries.length} entries
                        </p>
                      </div>
                      <div className="w-full lg:w-1/2">
                        <p>Completed on {format(tournament.endDate!, "PP")}</p>
                        <p></p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
