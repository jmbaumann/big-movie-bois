import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { CheckCircle2, XCircle } from "lucide-react";
import { useSession } from "next-auth/react";

import { api } from "~/utils/api";
import { useArray } from "~/utils/hooks/use-array";
import { cn } from "~/utils/shadcn";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { toast } from "~/components/ui/hooks/use-toast";
import Loading from "~/layouts/main/Loading";
import { ONE_DAY_IN_SECONDS } from "~/utils";

type Pick = { id?: string; categoryId: string; nomineeId: string };

export default function AwardShowPage() {
  const { data: sessionData } = useSession();
  const router = useRouter();

  const picks = useArray<Pick>();

  const { data: awardShowGroup } = api.awardShowGroup.get.useQuery(
    { id: "cm4kvmla900086e5nklamssl4" },
    { staleTime: ONE_DAY_IN_SECONDS },
  );
  const { data: myPicks, refetch } = api.awardShowGroup.myPicks.useQuery(
    { userId: sessionData?.user.id ?? "", groupId: "cm4kvmla900086e5nklamssl4" },
    { enabled: !!sessionData, staleTime: ONE_DAY_IN_SECONDS },
  );
  const { mutate: makePick, isLoading: submitting } = api.awardShowGroup.pick.useMutation();

  useEffect(() => {
    if (myPicks) picks.set(myPicks);
  }, [myPicks]);

  function handlePick(categoryId: string, nomineeId: string) {
    const picked = picks.array.findIndex((e) => e.categoryId === categoryId);
    if (picked >= 0) picks.removeAt(picked);
    picks.add({ categoryId, nomineeId });
  }

  function submitPicks() {
    if (sessionData?.user) {
      const data = picks.array.map((e) => ({
        ...e,
        userId: sessionData?.user.id,
        groupId: "cm4kvmla900086e5nklamssl4",
      }));
      makePick(data, {
        onSuccess: () => {
          toast({ title: "Picks submitted" });
          refetch();
        },
      });
    }
  }

  if (!awardShowGroup) return <Loading />;

  return (
    <div className="mb-6">
      <div className="flex justify-between">
        <p className="mb-4 text-2xl">
          {awardShowGroup.name} - {awardShowGroup.awardShowYear.awardShow.name} {awardShowGroup.awardShowYear.year}
        </p>
        <Button isLoading={submitting} onClick={() => submitPicks()}>
          Save Picks
        </Button>
      </div>

      <div className="flex flex-col gap-y-6">
        {awardShowGroup.awardShowYear.categories.map((category, i) => (
          <div key={i} className="">
            <p className="mb-1 text-lg text-white">{category.name}</p>

            <div className="flex justify-between">
              {category.nominees.map((nominee, j) => {
                const picked = picks.array.find((e) => e.categoryId === category.id && e.nomineeId === nominee.id);
                const winnerId = category.nominees.find((e) => e.winner)?.id;
                return (
                  <Card
                    key={i + "-" + j}
                    className={cn(
                      "hover:border-primary mx-2 hover:cursor-pointer",
                      picked && "text-primary border-primary",
                      winnerId === nominee.id &&
                        "border-green-600 text-green-600 hover:cursor-default hover:border-green-600",
                      !!winnerId &&
                        winnerId !== nominee.id &&
                        "border-red-600 text-red-600 hover:cursor-default hover:border-red-600",
                    )}
                    onClick={() => handlePick(category.id, nominee.id)}
                  >
                    <CardContent className="flex items-center p-4 text-center">
                      {winnerId === nominee.id && <CheckCircle2 className="mr-1 text-green-600" />}
                      {!!winnerId && winnerId !== nominee.id && <XCircle className="mr-1 text-red-600" />}
                      {nominee.name}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
