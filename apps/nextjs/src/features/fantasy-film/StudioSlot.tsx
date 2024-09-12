import type { Dispatch, SetStateAction } from "react";
import Image from "next/image";
import { ArrowRightLeft, Lock } from "lucide-react";

import { cn } from "~/utils/shadcn";
import { Label } from "~/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";

export default function StudioSlot({
  slot,
  // movie,
  showScore,
  locked,
  showManageTools, // selectedToSwap,
} // setSelectedToSwap,
: {
  slot: string;
  // movie?: StudioFilm;
  showScore?: boolean;
  locked?: boolean;
  showManageTools?: boolean;
  // selectedToSwap?: boolean;
  // setSelectedToSwap?: Dispatch<SetStateAction<StudioFilm[] | undefined>>;
}) {
  return (
    <div
      className={cn(
        "flex h-[194px] w-[160px]",
        showScore ? "h-[260px] w-[242px]" : "",
      )}
    >
      <div className="flex rounded-sm rounded-r-none border-2 border-[#9ac]">
        <p className="bg-lb-blue flex h-full rotate-180 items-center justify-center text-white [writing-mode:vertical-lr]">
          {locked && <Lock size={16} className="mb-2 inline-block rotate-90" />}
          {slot}
        </p>
        <div className="flex aspect-[2/3] flex-col p-2">
          {false ? (
            <TooltipProvider>
              <Tooltip>
                {/* <TooltipTrigger className="">
                  <Image
                    src={`https://image.tmdb.org/t/p/w1280/${movie.details?.poster_path}`}
                    alt={`${movie.details?.title} poster`}
                    width={200}
                    height={300}
                  />
                </TooltipTrigger>
                <TooltipContent className="bg-[#456]">
                  <p className="text-xs">
                    {`${movie.details?.title} (${new Date(
                      movie.details?.release_date ?? "",
                    ).getFullYear()})` ?? ""}
                  </p>
                </TooltipContent> */}
              </Tooltip>
            </TooltipProvider>
          ) : (
            <div className="flex h-full max-h-[300px] max-w-[200px] items-center justify-center bg-[#9ac] font-sans text-black">
              <Label>Empty Slot</Label>
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-col justify-between">
        {showScore && (
          <div className="flex h-min flex-col rounded-sm rounded-l-none bg-[#9ac] px-2 text-center text-black">
            <p className="text-2xl">0</p>
            <p className="text-md">pts</p>
          </div>
        )}
        {/* {showManageTools && (
          <div
            className={cn(
              "hover:bg-lb-blue flex h-min max-w-[40px] flex-col rounded-sm rounded-l-none bg-[#9ac] p-2 text-center text-black hover:cursor-pointer hover:text-white",
              selectedToSwap ? "bg-lb-orange text-white" : "",
            )}
            onClick={() => {
              if (setSelectedToSwap)
                setSelectedToSwap((s) => {
                  if (movie && s?.map((e) => e.id).includes(movie.id))
                    return s.filter((e) => e.id !== movie.id);
                  else
                    return s && movie
                      ? [...s, movie]
                      : movie
                      ? [movie]
                      : undefined;
                });
            }}
          >
            <p className="mx-auto">
              <ArrowRightLeft />
            </p>
          </div>
        )} */}
      </div>
    </div>
  );
}
