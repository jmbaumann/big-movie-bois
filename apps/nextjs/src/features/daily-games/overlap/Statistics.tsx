// import { TwitterShareButton, TwitterIcon } from "next-share";
import { BarChartBig, Share } from "lucide-react";

import { cn } from "~/utils/shadcn";
import { Button } from "~/components/ui/button";
import { toast } from "~/components/ui/hooks/use-toast";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "~/components/ui/sheet";
import { useLocalStore, useTweetStore } from "~/store/overlap";

export default function Statistics({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const stats = useLocalStore((state) => state.stats);
  const tweet = useTweetStore();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="px-2 py-2 text-white">
        <BarChartBig size={24} />
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="max-h-[90%] items-center bg-[#2d2d2d] text-white"
      >
        <SheetHeader>
          <SheetTitle className="text-center text-white">Statistics</SheetTitle>
          <SheetDescription className="text-white">
            <div className="mb-8 flex flex-row justify-evenly">
              <div className="w-[64px]">
                <div className="text-center text-xl font-semibold">
                  {stats.gamesPlayed}
                </div>
                <div className="text-center text-xs">Played</div>
              </div>
              <div className="w-[64px]">
                <div className="text-center text-xl font-semibold">
                  {stats.wins}
                </div>
                <div className="text-center text-xs">Record</div>
              </div>
              <div className="w-[64px]">
                <div
                  className={cn(
                    "text-center text-xl font-semibold",
                    stats.streak.startsWith("W") ? "text-green-400" : "",
                    stats.streak.startsWith("L") ? "text-red-600" : "",
                  )}
                >
                  {stats.streak}
                </div>
                <div className="text-center text-xs">Streak</div>
              </div>
              <div className="w-[64px]">
                <div className="text-center text-xl font-semibold">
                  {stats.winStreak}
                </div>
                <div className="text-center text-xs">Best Win Streak</div>
              </div>
            </div>

            <div className="mt-4 flex flex-col items-center">
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
                {/* <div className="mx-2">
                  <TwitterShareButton
                    url={""}
                    title={tweet.header + "\n" + tweet.stats}
                  >
                    <TwitterIcon size={48} round />
                  </TwitterShareButton>
                </div> */}
              </div>
            </div>
          </SheetDescription>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  );
}
