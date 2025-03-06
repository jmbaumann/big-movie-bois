import Link from "next/link";
import { format } from "date-fns";
import { Crown } from "lucide-react";

import { RouterOutputs } from "~/utils/api";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

type Tournament = RouterOutputs["tournament"]["get"][number];

export default function TournamentCard({ tournament }: { tournament: Tournament }) {
  const activeRoundIndex = tournament
    ? tournament.rounds.findIndex((e) => e.startDate <= new Date() && e.endDate >= new Date())
    : undefined;
  const activeRound = (activeRoundIndex ?? -1) >= 0 ? tournament.rounds[activeRoundIndex!] : undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Crown className="text-primary mr-2" size={40} />
          <div className="flex flex-col">
            <Link className="hover:text-primary" href={`/tournaments/${tournament.id}`}>
              {tournament.name}
            </Link>
            <p className="text-sm">Tournament</p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col">
        <div className="mb-2 w-full">
          <p dangerouslySetInnerHTML={{ __html: tournament.description }}></p>
          <p>
            {tournament.rounds.length} rounds / {tournament.entries.length} entries
          </p>
        </div>
        {!!activeRound && (
          <div className="w-full">
            <p>Current round: {activeRoundIndex! + 1}</p>
            <p>
              {format(activeRound.startDate, "LLL d")} - {format(activeRound.endDate, "LLL d")}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
