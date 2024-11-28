// import { TwitterShareButton, TwitterIcon } from "next-share";
import { BarChartBig, Share } from "lucide-react";
import { useSession } from "next-auth/react";

import { api } from "~/utils/api";
import { cn } from "~/utils/shadcn";
import { Button } from "~/components/ui/button";
import { toast } from "~/components/ui/hooks/use-toast";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "~/components/ui/sheet";
import { ONE_DAY_IN_SECONDS } from "~/utils";

export default function Statistics({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const { data: sessionData } = useSession();

  const { data: stats } = api.overlap.getStats.useQuery(
    {
      userId: sessionData?.user.id!,
    },
    { enabled: !!sessionData?.user, staleTime: ONE_DAY_IN_SECONDS },
  );

  const fails = stats ? stats.gamesPlayed - stats.scores.reduce((sum, e) => sum + e, 0) : 0;
  const maxScore = stats ? Math.max(...stats.scores, fails) : 0;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="px-2 py-2 text-white">
        <BarChartBig size={24} />
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="max-h-[90%] items-center bg-neutral-900 text-white"
        aria-describedby={undefined}
      >
        <SheetHeader>
          <SheetTitle className="text-center text-white">Statistics</SheetTitle>

          {!sessionData?.user ? (
            <p>Sign in to see your stats</p>
          ) : (
            <>
              <div className="mb-8 flex flex-row justify-evenly text-white">Games Played: {stats?.gamesPlayed}</div>

              <div className="flex h-40 w-full items-end justify-evenly space-x-2">
                <div className="flex h-full w-10 flex-col-reverse items-center" title={`Fails: ${fails}`}>
                  <span className="mt-2 text-sm text-white">X</span>
                  <div
                    className="bg-primary w-full transition-all duration-300"
                    style={{
                      height: `${(fails / maxScore) * 100}%`,
                    }}
                  />
                </div>
                {stats?.scores.map((score, index) => (
                  <div
                    key={index}
                    className="flex h-full w-10 flex-col-reverse items-center"
                    title={`${index + 1}${index + 1 === 6 ? "+" : ""} guesses: ${score}`}
                  >
                    <span className="mt-2 text-sm text-white">
                      {index + 1}
                      {index + 1 === 6 ? "+" : ""}
                    </span>
                    <div
                      className="bg-primary w-full transition-all duration-300"
                      style={{
                        height: `${(score / maxScore) * 100}%`,
                      }}
                    />
                  </div>
                ))}
              </div>
            </>
          )}
          {/* <div className="mt-4 flex flex-col items-center">
            <div className="text-md mb-1 text-center">Share</div>
            <div className="flex flex-row">
              <Button
                className="mx-2 h-[48px] w-[48px] rounded-3xl border-none bg-white hover:bg-white hover:text-[#131921] focus-visible:ring-0"
                variant="outline"
                size="icon"
                onClick={() => {
                  void navigator.clipboard.writeText(
                    tweet.header + "\n" + tweet.stats,
                  );
                  toast({ title: "Results copied to clipboard" });
                }}
              >
                <Share className="mx-2 my-4 text-[#131921] hover:cursor-pointer" />
              </Button>
               <div className="mx-2">
                  <TwitterShareButton
                    url={""}
                    title={tweet.header + "\n" + tweet.stats}
                  >
                    <TwitterIcon size={48} round />
                  </TwitterShareButton>
                </div> *
            </div>
          </div> */}
        </SheetHeader>
      </SheetContent>
    </Sheet>
  );
}
