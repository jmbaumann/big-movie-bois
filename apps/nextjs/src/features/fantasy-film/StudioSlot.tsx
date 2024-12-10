import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { inferRouterOutputs } from "@trpc/server";
import { format, sub } from "date-fns";
import { ExternalLink, EyeOff, Lock, Shuffle, XCircle } from "lucide-react";
import { useSession } from "next-auth/react";

import { AppRouter } from "@repo/api";

import { api } from "~/utils/api";
import { getUnlockedSlots } from "~/utils/fantasy-film-helpers";
import { cn } from "~/utils/shadcn";
import AdminMenu from "~/components/AdminMenu";
import ResponsiveDialog from "~/components/ResponsiveDialog";
import { Alert, AlertTitle } from "~/components/ui/alert";
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
import { DropdownMenuContent, DropdownMenuItem } from "~/components/ui/dropdown-menu";
import { useConfirm } from "~/components/ui/hooks/use-confirm";
import { toast } from "~/components/ui/hooks/use-toast";
import { Label } from "~/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { formatDate, ONE_DAY_IN_SECONDS } from "~/utils";

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
  bidWar,
  refreshStudio,
}: {
  session?: Session;
  studio?: Studio;
  slot: string;
  film?: StudioFilm;
  showScore?: boolean;
  locked?: boolean;
  bidWar?: boolean;
  refreshStudio?: () => void;
}) {
  const trpc = api.useContext();
  const { data: sessionData } = useSession();
  const confirm = useConfirm();
  const [open, setOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string>(
    String(session?.settings.teamStructure.find((e) => e.type === slot)?.pos),
  );

  const isAdmin = session?.league.ownerId === sessionData?.user.id;
  const isMyStudio = studio?.ownerId === sessionData?.user.id;
  const canEdit = isMyStudio && !locked;

  const unlockedSlots = studio && session ? getUnlockedSlots(session, studio) : [];

  const { mutate: swap, isLoading: swapping } = api.ffFilm.swap.useMutation();
  const { mutate: trade } = api.ffFilm.trade.useMutation();
  const { mutate: drop, isLoading: dropping } = api.ffFilm.drop.useMutation();
  const { data: bid } = api.ffFilm.getBid.useQuery(
    { studioId: studio?.id ?? "", tmdbId: film?.tmdbId ?? 0 },
    { enabled: bidWar && !!studio && !!film, staleTime: ONE_DAY_IN_SECONDS },
  );

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
            if (refreshStudio) {
              refreshStudio();
              trpc.ffStudio.getMyStudio.invalidate({ sessionId: session!.id });
            }
            setOpen(false);
          },
        },
      );
    }
  }

  async function handleDrop() {
    if (film) {
      const ok = await confirm(
        "Are you sure you want to drop this film?" +
          (bidWar ? ` You will recoup $${Math.round((bid?.amount ?? 0) * 0.8)} back to your budget.` : ""),
      );
      if (ok)
        drop(
          { id: film.id, bidWar },
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
    <div className={cn("flex lg:h-[260px]")}>
      <div className="mb-4 flex rounded-sm rounded-r-none border-2 border-[#9ac] lg:mb-0">
        <p className="my-2 flex rotate-180 items-center justify-center text-white [writing-mode:vertical-lr] lg:h-full">
          {locked && <Lock size={16} className="mb-2 inline-block rotate-90" />}
          {slot}
        </p>
        <div className="flex aspect-[2/3] flex-col justify-center p-2">
          {!!film && (!bidWar || isMyStudio) ? (
            <ResponsiveDialog open={open} setOpen={setOpen}>
              <ResponsiveDialog.Trigger>
                <div className="relative">
                  {showScore && (
                    <div
                      className={cn("bg-primary absolute right-1 top-1 rounded px-2 py-1 text-sm font-bold text-white")}
                    >
                      {film?.score} pts
                    </div>
                  )}
                  <Image
                    src={`https://image.tmdb.org/t/p/w1280${film?.tmdb?.poster}`}
                    alt={`${film?.tmdb?.title} poster`}
                    width={200}
                    height={300}
                  />
                </div>
              </ResponsiveDialog.Trigger>

              <ResponsiveDialog.Content className="max-w-2/3 w-1/2 rounded-sm" forceMount>
                <ResponsiveDialog.Header>
                  <ResponsiveDialog.Title>{film?.tmdb?.title ?? ""}</ResponsiveDialog.Title>

                  <div className="flex flex-col pb-4 lg:flex-row">
                    <div className="mx-auto flex flex-col">
                      <Image
                        className="group-hover:border-primary inset-0 min-w-[200px] border-4 border-transparent"
                        src={`https://image.tmdb.org/t/p/w1280${film?.tmdb?.poster}`}
                        alt={`${film?.tmdb?.title} poster`}
                        width={200}
                        height={300}
                      />
                    </div>
                    <div className="w-full text-white lg:ml-4">
                      <p className="mb-2 text-lg">
                        Release Date: {formatDate(film?.tmdb?.releaseDate!, "LLL dd, yyyy")}
                      </p>
                      <p className="mb-4">{film?.tmdb?.overview}</p>

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
                            {format(sub(new Date(film?.tmdb?.releaseDate ?? ""), { days: 7 }), "LLL dd, yyyy")}
                          </AlertTitle>
                        </Alert>
                      )}
                      {(canEdit || isAdmin) && (
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
                          {(canEdit || isAdmin) && (
                            <Button
                              className="ml-2"
                              disabled={slot === session?.settings.teamStructure[Number(selectedSlot) - 1]?.type}
                              onClick={handleSwap}
                              isLoading={swapping}
                            >
                              <Shuffle className="mr-1" />
                              Swap
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </ResponsiveDialog.Header>

                <ResponsiveDialog.Footer className="flex-row sm:justify-between">
                  <div className="flex items-center">
                    <Link
                      className="flex items-center"
                      href={`https://www.themoviedb.org/movie/${film.tmdb?.id}`}
                      target="_blank"
                    >
                      More Info <ExternalLink className="mx-1" size={16} />
                    </Link>
                  </div>

                  <div className="ml-auto flex items-center">
                    {isAdmin && (
                      <AdminMenu className="mr-4">
                        <DropdownMenuContent side="top">
                          <DropdownMenuItem
                            disabled={film.slot === session?.settings.teamStructure[Number(selectedSlot) - 1]?.pos}
                            onClick={handleDrop}
                          >
                            <Shuffle className="mr-1" />
                            Swap
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={handleDrop}>
                            <XCircle className="mr-1 text-red-600" />
                            Drop
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </AdminMenu>
                    )}
                    {canEdit && (
                      <>
                        {/* <Button className="mx-1">
                      <ArrowRightLeft className="mr-1" />
                      Trade
                    </Button> */}
                        <Button className="mx-1" variant="destructive" onClick={handleDrop} isLoading={dropping}>
                          <XCircle className="mr-1" />
                          Drop
                        </Button>
                      </>
                    )}
                  </div>
                </ResponsiveDialog.Footer>
              </ResponsiveDialog.Content>
            </ResponsiveDialog>
          ) : (
            // <Dialog open={open} onOpenChange={setOpen}>
            //   <DialogTrigger className="flex">

            //   </DialogTrigger>
            //   <DialogContent className="max-w-2/3 w-1/2 rounded-sm" forceMount>
            //     <DialogHeader>
            //       <DialogTitle className="text-white">{film?.tmdb?.title}</DialogTitle>
            //       <DialogDescription>

            //       </DialogDescription>
            //     </DialogHeader>
            //     <DialogFooter className="flex-col sm:justify-between">

            //     </DialogFooter>
            //   </DialogContent>
            // </Dialog>
            <div
              className={cn(
                "flex h-full max-h-[300px] min-h-[220px] max-w-[200px] items-center justify-center bg-[#9ac] font-sans text-black",
                film && bidWar && "bg-primary",
              )}
            >
              {film && bidWar ? <EyeOff size={48} /> : <Label>Empty Slot</Label>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
