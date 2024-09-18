import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { inferRouterOutputs } from "@trpc/server";
import { format, sub } from "date-fns";
import { ArrowRightLeft, ExternalLink, Lock, Shuffle, XCircle } from "lucide-react";
import { useSession } from "next-auth/react";

import { AppRouter } from "@repo/api";

import { api } from "~/utils/api";
import { getUnlockedSlots } from "~/utils/fantasy-film-helpers";
import { cn } from "~/utils/shadcn";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { useConfirm } from "~/components/ui/hooks/use-confirm";
import { toast } from "~/components/ui/hooks/use-toast";
import { Label } from "~/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";

type Session = inferRouterOutputs<AppRouter>["ffLeagueSession"]["getById"];
type Studio = inferRouterOutputs<AppRouter>["ffStudio"]["getStudios"][number];
type StudioFilm = Studio["films"][number];

export default function StudioSlot({
  session,
  studio,
  slot,
  film,
  showScore,
  locked,
  refreshStudio,
}: {
  session?: Session;
  studio?: Studio;
  slot: string;
  film?: StudioFilm;
  showScore?: boolean;
  locked?: boolean;
  showManageTools?: boolean;
  refreshStudio?: () => void;
}) {
  const { data: sessionData } = useSession();
  const confirm = useConfirm();
  const [open, setOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string>(
    String(session?.settings.teamStructure.find((e) => e.type === slot)?.pos),
  );
  const canEdit = studio?.ownerId === sessionData?.user.id && !locked;

  const unlockedSlots = studio && session ? getUnlockedSlots(session, studio) : [];

  const { mutate: swap } = api.ffFilm.swap.useMutation();
  const { mutate: trade } = api.ffFilm.trade.useMutation();
  const { mutate: drop } = api.ffFilm.drop.useMutation();

  function handleSwap() {
    if (film) {
      swap(
        {
          studioId: film.studioId,
          fromPos: film.slot,
          toPos: Number(selectedSlot),
        },
        {
          onSuccess: () => {
            toast({ title: "Film slots swapped" });
            if (refreshStudio) refreshStudio();
            setOpen(false);
          },
        },
      );
    }
  }

  async function handleDrop() {
    if (film) {
      const ok = await confirm("Are you sure you want to drop this film from your studio?");
      if (ok)
        drop(
          { id: film.id },
          {
            onSuccess: () => {
              toast({ title: "Film dropped" });
              if (refreshStudio) refreshStudio();
              setOpen(false);
            },
          },
        );
    }
  }

  return (
    <div className={cn("flex h-[260px] w-[242px]")}>
      <div className="flex rounded-sm rounded-r-none border-2 border-[#9ac]">
        <p className="bg-lb-blue flex h-full rotate-180 items-center justify-center text-white [writing-mode:vertical-lr]">
          {locked && <Lock size={16} className="mb-2 inline-block rotate-90" />}
          {slot}
        </p>
        <div className="flex aspect-[2/3] flex-col justify-center p-2">
          {film ? (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger className="flex">
                <Image
                  src={`https://image.tmdb.org/t/p/w1280${film.tmdb.details.poster}`}
                  alt={`${film.tmdb.details.title} poster`}
                  width={200}
                  height={300}
                />
              </DialogTrigger>
              <DialogContent className="max-w-2/3 w-1/2 rounded-sm" forceMount>
                <DialogHeader>
                  <DialogTitle className="text-white">{film.tmdb.details.title}</DialogTitle>
                  <DialogDescription>
                    <div className="flex">
                      <div className="flex flex-col">
                        <Image
                          className="group-hover:border-primary inset-0 min-w-[200px] border-4 border-transparent"
                          src={`https://image.tmdb.org/t/p/w1280${film.tmdb.details.poster}`}
                          alt={`${film.tmdb.details.title} poster`}
                          width={200}
                          height={300}
                        />
                      </div>
                      <div className="ml-4 w-full text-white">
                        <p className="mb-2 text-lg">
                          Release Date: {format(film.tmdb.details.releaseDate, "LLL dd, yyyy")}
                        </p>
                        <p className="mb-4">{film.tmdb.details.overview}</p>

                        {showScore ? (
                          <div className="mb-2 grid grid-cols-2 gap-y-2">
                            <div className="">
                              <p>Total Box Office</p>
                              <p className="text-lg">{film.scores.totalBoxOffice}</p>
                            </div>
                            <div className="">
                              <p>Opening Weekend Box Office</p>
                              <p className="text-lg">{film.scores.openingWeekendBoxOffice}</p>
                            </div>
                            <div className="">
                              <p>Rating</p>
                              <p className="text-lg">{film.scores.rating}</p>
                            </div>
                            <div className="">
                              <p>Reverse Rating</p>
                              <p className="text-lg">{film.scores.reverseRating}</p>
                            </div>
                          </div>
                        ) : (
                          <Alert className="my-4">
                            <Lock className="h-4 w-4" />
                            <AlertTitle>
                              This film will lock on{" "}
                              {format(sub(new Date(film.tmdb.details.releaseDate ?? ""), { days: 7 }), "LLL dd, yyyy")}
                            </AlertTitle>
                          </Alert>
                        )}
                        {canEdit && (
                          <div className="flex items-center">
                            <Select value={selectedSlot} onValueChange={setSelectedSlot}>
                              <SelectTrigger className="w-2/3 text-black">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {unlockedSlots?.map((slot, i) => (
                                  <SelectItem key={i} value={String(slot.pos)}>
                                    {slot.type}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              className="ml-2"
                              disabled={slot === session?.settings.teamStructure[Number(selectedSlot) - 1]?.type}
                              onClick={handleSwap}
                            >
                              <Shuffle className="mr-1" />
                              Swap
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="flex-col sm:justify-between">
                  <div className="flex items-center">
                    <Link
                      className="flex items-center"
                      href={`https://www.themoviedb.org/movie/${film.tmdb.details?.id}`}
                      target="_blank"
                    >
                      More Info <ExternalLink className="mx-1" size={16} />
                    </Link>
                  </div>

                  {canEdit && (
                    <div className="ml-auto">
                      {/* <Button className="mx-1">
                      <ArrowRightLeft className="mr-1" />
                      Trade
                    </Button> */}
                      <Button className="mx-1" variant="destructive" onClick={handleDrop}>
                        <XCircle className="mr-1" />
                        Drop
                      </Button>
                    </div>
                  )}
                </DialogFooter>
              </DialogContent>
            </Dialog>
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
            <p className="text-2xl">{film?.score}</p>
            <p className="text-md">pts</p>
          </div>
        )}
      </div>
    </div>
  );
}
