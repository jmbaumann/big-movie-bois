import Link from "next/link";
import { useRouter } from "next/router";
import { format } from "date-fns";
import { CheckCircle2, Loader2, Lock, XCircle } from "lucide-react";
import { useSession } from "next-auth/react";

import { api } from "~/utils/api";
import useBreakpoint from "~/utils/hooks/use-breakpoint";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";
import Layout from "~/layouts/main/Layout";
import { ONE_DAY_IN_SECONDS } from "~/utils";
import AwardShowCard from "./AwardShowCard";

export default function AwardShowPage() {
  const { data: sessionData } = useSession();
  const breakpoint = useBreakpoint();
  const router = useRouter();

  const { data: activeShows } = api.awardShow.getActive.useQuery(undefined, {
    staleTime: ONE_DAY_IN_SECONDS,
  });
  const { data: pastShows } = api.awardShow.getPast.useQuery(undefined, {
    staleTime: ONE_DAY_IN_SECONDS,
  });

  return (
    <Layout showFooter>
      {!!activeShows?.length && <p className="mb-2 text-xl">Active Award Shows</p>}
      <div className="grid lg:grid-cols-2">
        {activeShows?.map((show, i) => <AwardShowCard key={i} awardShow={show} />)}
      </div>

      <p className="mb-2 mt-4 text-xl">Past Award Shows</p>
      <div className="grid lg:grid-cols-2">
        {pastShows?.map((show, i) => <AwardShowCard key={i} awardShow={show} />)}
      </div>
    </Layout>
  );
}
