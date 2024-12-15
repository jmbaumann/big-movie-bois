import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/router";
import { CheckCircle2, Lock, XCircle } from "lucide-react";
import { useSession } from "next-auth/react";
import { io } from "socket.io-client";

import { api } from "~/utils/api";
import { useArray } from "~/utils/hooks/use-array";
import { cn } from "~/utils/shadcn";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardFooter } from "~/components/ui/card";
import { toast } from "~/components/ui/hooks/use-toast";
import { env } from "~/env.mjs";
import Layout from "~/layouts/main/Layout";
import Loading from "~/layouts/main/Loading";
import { ONE_DAY_IN_SECONDS } from "~/utils";

type Pick = { id?: string; categoryId: string; nomineeId: string };

export default function AwardShowPage() {
  const { data: sessionData } = useSession();
  const router = useRouter();

  const picks = useArray<Pick>();

  const { data: awardShowGroup, refetch } = api.awardShowGroup.get.useQuery(
    { id: "cm4kvz4tc000h6e5nifjec0ku" },
    { staleTime: ONE_DAY_IN_SECONDS },
  );
  const { data: myPicks, refetch: refetchMyPicks } = api.awardShowGroup.myPicks.useQuery(
    { userId: sessionData?.user.id ?? "", groupId: "cm4kvz4tc000h6e5nifjec0ku" },
    { enabled: !!sessionData, staleTime: ONE_DAY_IN_SECONDS },
  );
  const { mutate: makePick, isLoading: submitting } = api.awardShowGroup.pick.useMutation();

  const isLocked = awardShowGroup ? awardShowGroup.awardShowYear.locked <= new Date() : false;

  useEffect(() => {
    if (myPicks) picks.set(myPicks);
  }, [myPicks]);

  useEffect(() => {
    const socket = io(env.NEXT_PUBLIC_WEBSOCKET_SERVER, {
      // withCredentials: true,
    });

    socket.on("connect", () => {
      console.log("Connected to the WebSocket server");
    });

    socket.on(`pick-em:${awardShowGroup?.awardShowYearId}:winner-update`, () => {
      refetch();
    });

    return () => {
      socket.disconnect();
    };
  }, [awardShowGroup]);

  function handlePick(categoryId: string, nomineeId: string) {
    if (isLocked) return;

    const picked = picks.array.findIndex((e) => e.categoryId === categoryId);
    if (picked >= 0) picks.removeAt(picked);
    picks.add({ categoryId, nomineeId });
  }

  function submitPicks() {
    if (sessionData?.user) {
      const data = picks.array.map((e) => ({
        ...e,
        userId: sessionData?.user.id,
        groupId: "cm4kvz4tc000h6e5nifjec0ku",
      }));
      makePick(data, {
        onSuccess: () => {
          toast({ title: "Picks submitted" });
          refetchMyPicks();
        },
      });
    }
  }

  if (!awardShowGroup) return <Loading />;

  return (
    <Layout showFooter>
      <div className="mb-6">
        <div className="flex justify-between">
          <p className="mb-4 text-2xl">
            {awardShowGroup.name} - {awardShowGroup.awardShowYear.awardShow.name} {awardShowGroup.awardShowYear.year}
          </p>
          {isLocked ? (
            <div className="flex items-center">
              <Lock size={20} className="mr-1" />
              Picks Locked
            </div>
          ) : (
            <Button isLoading={submitting} onClick={() => submitPicks()}>
              Save Picks
            </Button>
          )}
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
                        "mx-2",
                        !isLocked && "hover:border-primary hover:cursor-pointer",
                        picked && "text-primary border-primary",
                        winnerId === nominee.id &&
                          "border-green-600 text-green-600 hover:cursor-default hover:border-green-600",
                        !!winnerId &&
                          winnerId !== nominee.id &&
                          picked?.nomineeId === nominee.id &&
                          "border-red-600 text-red-600 hover:cursor-default hover:border-red-600",
                      )}
                      onClick={() => handlePick(category.id, nominee.id)}
                    >
                      {nominee.image && (
                        <CardContent className="flex items-center p-4 text-center">
                          <Image src={nominee.image} alt="" width={600} height={1200}></Image>
                        </CardContent>
                      )}

                      <CardFooter className="flex flex-col p-2 text-center">
                        <p className="text-lg">
                          {winnerId === nominee.id && picked?.nomineeId === winnerId && (
                            <CheckCircle2 className="mr-1 text-green-600" size={20} />
                          )}
                          {!!winnerId && winnerId !== nominee.id && picked?.nomineeId === nominee.id && (
                            <XCircle className="mr-1 text-red-600" size={20} />
                          )}
                          {nominee.name}
                        </p>
                        <p className="text-sm text-slate-400">{nominee.subtext}</p>
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
