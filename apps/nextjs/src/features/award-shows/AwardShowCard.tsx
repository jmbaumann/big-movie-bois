import Link from "next/link";
import { useRouter } from "next/router";
import { format } from "date-fns";
import { Lock } from "lucide-react";

import { RouterOutputs } from "~/utils/api";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";

type AwardShow = RouterOutputs["awardShow"]["getActive"][number];

export default function AwardShowCard({ awardShow }: { awardShow: AwardShow }) {
  const router = useRouter();

  const isLocked = awardShow.locked <= new Date();

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Link className="hover:text-primary" href={`/pick-em/${awardShow.awardShow.slug}/${awardShow.year}`}>
            {awardShow.awardShow.name} {awardShow.year}
          </Link>
          <p className="text-sm">Pick 'Em</p>
        </CardTitle>
      </CardHeader>
      <CardContent className="">
        <div className="flex items-center justify-between">
          {/* <p>Groups: 3</p> */}
          <p>Total Entries: {awardShow.entries}</p>

          <Button onClick={() => router.push(`/pick-em/${awardShow.awardShow.slug}/${awardShow.year}`)}>
            {isLocked ? "View Results" : "Make Picks"}
          </Button>
        </div>
      </CardContent>
      <CardFooter className="text-sm">
        <Lock className="mr-2" size={20} /> Picks{" "}
        {isLocked ? "locked" : "lock on " + format(awardShow.locked, "PP @ p")}
      </CardFooter>
    </Card>
  );
}
