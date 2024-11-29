import Image from "next/image";
import { Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";

import { api, RouterOutputs } from "~/utils/api";
import { cn } from "~/utils/shadcn";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";
import { toast } from "~/components/ui/hooks/use-toast";

type Poll = RouterOutputs["poll"]["get"][number];

export default function Poll({ poll, refresh }: { poll: Poll; refresh: () => void }) {
  const { data: sessionData } = useSession();

  const { mutate: vote, isLoading: voting } = api.poll.vote.useMutation();

  const votedFor = sessionData
    ? poll.answers.find((e) => new Set(e.responses.map((r) => r.userId)).has(sessionData.user.id))?.id
    : undefined;

  function handleVote(answerId: string) {
    if (!sessionData) {
      toast({ title: "Sign in to vote" });
      return;
    }
    if (votedFor) return;
    vote(
      { answerId },
      {
        onSuccess: () => {
          refresh();
          console.log("voted");
        },
      },
    );
  }

  return (
    <Card>
      <CardContent className="pb-0 pl-0">
        <div className="mx-auto flex space-x-4">
          {poll.film && (
            <Image
              className="rounded-md"
              src={`https://image.tmdb.org/t/p/w1280${poll.film.poster}`}
              alt={`${poll.film.title} poster`}
              width={150}
              height={225}
            />
          )}
          <div className="pt-2">
            <div className="text-center text-xl">{poll.text}</div>
            <div
              className={cn("mt-2 flex w-full grow flex-col items-center justify-around", votedFor && "items-start")}
            >
              {poll.answers.map((answer, j) => {
                const percentage = (answer.responses.length / poll.answers.map((e) => e.responses).flat().length) * 100;
                return (
                  <div key={j} className="my-2 flex w-full items-center">
                    <Button
                      key={j}
                      className={cn(
                        "rounded-md border-2 border-white text-2xl",
                        votedFor === answer.id ? "border-primary bg-primary border-4" : "bg-white",
                        votedFor && "rounded-r-none ",
                      )}
                      variant="ghost"
                      size="icon"
                      onClick={() => handleVote(answer.id)}
                    >
                      {answer.text}
                    </Button>
                    {!!votedFor && (
                      <span
                        className={cn(
                          "h-10 rounded-md rounded-l-none",
                          votedFor === answer.id ? "bg-primary" : "bg-white",
                        )}
                        style={{ width: `${percentage}%` }}
                      ></span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between pb-2 pt-1">
        {voting && (
          <div className="flex text-slate-400">
            <Loader2 className="mr-1 animate-spin" /> Submitting vote...
          </div>
        )}

        <div className="ml-auto">Total Votes: {poll.answers.map((e) => e.responses).flat().length}</div>
      </CardFooter>
    </Card>
  );
}

function PollCard() {}
