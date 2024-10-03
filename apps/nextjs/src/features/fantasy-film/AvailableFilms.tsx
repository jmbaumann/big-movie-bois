import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { format, sub } from "date-fns";
import { CircleDollarSign, DollarSign, ExternalLink, Lock, Star } from "lucide-react";
import { useSession } from "next-auth/react";
import { io } from "socket.io-client";

import { RouterOutputs } from "@repo/api";
import { DraftState } from "@repo/api/src/router/fantasy-film/draft";
import { LeagueSessionStudio, TMDBDetails } from "@repo/db";

import { api } from "~/utils/api";
import { getUnlockedSlots } from "~/utils/fantasy-film-helpers";
import { cn } from "~/utils/shadcn";
import AdminMenu from "~/components/AdminMenu";
import SortChips from "~/components/SortChips";
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
import { DropdownMenuContent, DropdownMenuItem } from "~/components/ui/dropdown-menu";
import { toast } from "~/components/ui/hooks/use-toast";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { env } from "~/env.mjs";
import { ONE_DAY_IN_SECONDS, unique } from "~/utils";

type Film = TMDBDetails & { price?: number };
type Session = RouterOutputs["ffLeagueSession"]["getById"];

export default function AvailableFilms({
  session,
  studioId,
  buyNow,
  isDraft,
  drafting,
  draftDisabled = false,
  gridCols,
}: {
  session: Session;
  studioId: string;
  buyNow?: boolean;
  isDraft?: boolean;
  drafting?: LeagueSessionStudio;
  draftDisabled?: boolean;
  gridCols?: number;
}) {
  const { data: sessionData } = useSession();
  const trpc = api.useContext();

  const [films, setFilms] = useState<Film[]>([]);
  const [availableFilms, setAvailableFilms] = useState<Film[]>([]);
  const [acquiredFilms, setAcquiredFilms] = useState<number[]>([]);
  const [showWatchlist, setShowWatchlist] = useState(false);
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [selectedFilm, setSelectedFilm] = useState<Film>();
  const [selectedSlot, setSelectedSlot] = useState<string>();
  const [bidAmount, setBidAmount] = useState("0");

  const isAdmin = session?.league.ownerId === sessionData?.user.id;
  const sortOptions = [
    { label: "Popularity", value: "popularity" },
    { label: "Release Date", value: "releaseDate" },
    { label: "A-Z", value: "abc" },
  ];
  const sort = (a: Film, b: Film, value: string, desc: boolean) => {
    if (value === "popularity") return desc ? b.popularity - a.popularity : a.popularity - b.popularity;
    if (value === "releaseDate")
      return desc
        ? new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime()
        : new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime();
    if (value === "abc") {
      const compTitleA = a.title.toLowerCase().startsWith("the ") ? a.title.slice(4) : a.title;
      const compTitleB = b.title.toLowerCase().startsWith("the ") ? b.title.slice(4) : b.title;
      return desc ? compTitleA.localeCompare(compTitleB) : compTitleB.localeCompare(compTitleA);
    } else return 1;
  };

  const {
    data: sessionFilms,
    refetch: refreshFilms,
    isLoading: loadingFilms,
  } = api.tmdb.getFilmsForSession.useQuery(
    {
      sessionId: session?.id ?? "",
      studioId,
      page,
      options: { today: !isDraft, excludeAcquiredFilms: !buyNow, excludeMyFilms: buyNow },
    },
    { staleTime: ONE_DAY_IN_SECONDS, enabled: !!session?.id },
  );
  const { data: myStudio } = api.ffStudio.getMyStudio.useQuery(
    { sessionId: session?.id ?? "" },
    {
      enabled: !!session?.id,
      staleTime: ONE_DAY_IN_SECONDS,
    },
  );
  const { data: favorites, refetch: refreshFavorites } = api.ffStudio.getFavorites.useQuery(
    { studioId },
    {
      enabled: !!studioId,
      staleTime: ONE_DAY_IN_SECONDS,
    },
  );
  const { data: bids, refetch: refreshBids } = api.ffStudio.getBids.useQuery(
    { studioId },
    {
      enabled: !!studioId && !isDraft && !buyNow,
      staleTime: ONE_DAY_IN_SECONDS,
    },
  );
  const { data: studios } = api.ffStudio.getStudios.useQuery(
    { sessionId: session?.id ?? "" },
    { enabled: !!session?.id && isAdmin, staleTime: ONE_DAY_IN_SECONDS },
  );
  const { mutate: addFavorite } = api.ffStudio.addFavorite.useMutation();
  const { mutate: removeFavorite } = api.ffStudio.removeFavorite.useMutation();
  const { mutate: makeBid, isLoading: bidding } = api.ffStudio.bid.useMutation();
  const { mutate: makePick, isLoading: picking } = api.ffDraft.pick.useMutation();
  const { mutate: adminAdd } = api.ffAdmin.addStudioFilm.useMutation();

  const slotsFilled = new Set(myStudio?.films.map((e) => e.slot));
  const availableSlots =
    myStudio && session
      ? buyNow || isDraft
        ? session.settings.teamStructure.filter((e) => !slotsFilled.has(e.pos))
        : getUnlockedSlots(session, myStudio)
      : [];
  const canPick =
    (isDraft ? drafting?.id === studioId || isAdmin : true) && !!availableSlots?.length && !picking && !draftDisabled;
  const isFavorite = selectedFilm ? favorites?.map((e) => e.id).includes(selectedFilm.id) : false;
  const bidPlaced = selectedFilm ? bids?.map((e) => e.tmdbId).includes(selectedFilm.id) : false;
  const insufficientFunds = selectedFilm && myStudio ? (selectedFilm.price ?? 0) > myStudio?.budget : false;

  useEffect(() => {
    if (sessionFilms?.data) {
      const films = sessionFilms.data.map((e) => ({
        ...e,
        price: Math.min(Math.round((e.popularity / 100) * 40), 40),
      }));
      const ids = new Set(acquiredFilms);
      setFilms((s) => unique([...s, ...films]).filter((e) => !ids.has(e.id)));
    }
  }, [sessionFilms]);

  useEffect(() => {
    if (!showWatchlist) setAvailableFilms(films);
  }, [films]);

  useEffect(() => {
    if (showWatchlist) setAvailableFilms(favorites ?? []);
    else setAvailableFilms(films);
  }, [showWatchlist, favorites]);

  useEffect(() => {
    const ids = new Set(acquiredFilms);
    setAvailableFilms((s) => s.filter((e) => !ids.has(e.id)));
  }, [acquiredFilms]);

  useEffect(() => {
    if (buyNow && selectedFilm) {
      setBidAmount(String(selectedFilm.price));
    }
  }, [selectedFilm]);

  useEffect(() => {
    setSelectedSlot(undefined);
  }, [open]);

  useEffect(() => {
    if (isDraft) {
      const socket = io(env.NEXT_PUBLIC_WEBSOCKET_SERVER, {
        // withCredentials: true,
      });

      socket.on("connect", () => {
        console.log("Connected to the WebSocket server");
      });

      socket.on(`draft:${session!.id}:draft-update`, (data: DraftState) => {
        if (data.lastPick) setAcquiredFilms((s) => [...s, data.lastPick!.tmdbId]);
      });

      return () => {
        socket.disconnect();
      };
    }
  }, [session]);

  function handleFavorite() {
    if (selectedFilm)
      if (isFavorite) removeFavorite({ studioId, tmdbId: selectedFilm.id }, { onSuccess: () => refreshFavorites() });
      else addFavorite({ studioId, tmdbId: selectedFilm.id }, { onSuccess: () => refreshFavorites() });
  }

  function handleBid() {
    if (selectedFilm)
      makeBid(
        {
          studioId,
          tmdbId: selectedFilm.id,
          amount: Number(bidAmount),
          slot: Number(selectedSlot),
          autoProcess: !!buyNow,
        },
        {
          onSuccess: () => {
            toast({ title: buyNow ? "Film added to Studio" : "Bid submitted" });
            setOpen(false);
            refreshFilms();
            trpc.ffStudio.getStudios.invalidate({ sessionId: session!.id });
            trpc.ffLeagueSession.getBids.invalidate({ sessionId: session!.id });
          },
          onError: (e) => {
            toast({ title: e.message, variant: "destructive" });
          },
        },
      );
  }

  function handleAdminAdd(studioId: string) {
    if (selectedFilm && selectedSlot)
      adminAdd(
        { studioId, tmdbId: selectedFilm.id, slot: Number(selectedSlot) },
        {
          onSuccess: () => {
            toast({ title: "Film added to studio" });
            setAcquiredFilms((s) => [...s, selectedFilm.id]);
            setOpen(false);
            refreshFilms();
          },
          onError: (e) => {
            toast({ title: e.message, variant: "destructive" });
          },
        },
      );
  }

  function handleDraft() {
    if (session && selectedFilm && myStudio && selectedSlot) {
      const studioId = isAdmin && drafting && drafting?.id !== myStudio.id ? drafting.id : myStudio.id;
      makePick({
        sessionId: session.id,
        tmdbId: selectedFilm.id,
        title: selectedFilm.title,
        studioId,
        slot: Number(selectedSlot),
      });
      setOpen(false);
    }
  }

  return (
    <>
      <div className="flex items-center">
        <SortChips
          items={availableFilms}
          setItems={setAvailableFilms}
          options={sortOptions}
          sortFunc={sort}
          def={{ value: "popularity", desc: true }}
        ></SortChips>

        <Button className="text-lg" variant="ghost" onClick={() => setShowWatchlist((s) => !s)}>
          <Star className="mr-1" color="#fbbf24" fill={showWatchlist ? "#fbbf24" : ""} />
          Watchlist
        </Button>
      </div>

      <div className="max-h-[calc(100%-40px)] overflow-y-auto">
        <Dialog open={open} onOpenChange={setOpen}>
          <div className={cn("grid", gridCols ? `grid-cols-${gridCols}` : "grid-cols-5")}>
            {availableFilms.map((film, i) => {
              const price = Math.min(Math.round((film.popularity / 100) * 40), 40);

              return (
                <DialogTrigger
                  key={i}
                  className="hover:text-primary group mx-auto flex w-[170px] flex-col p-2 text-white hover:cursor-pointer"
                >
                  <div
                    className="group-hover:border-primary relative flex h-full w-[170px] flex-col overflow-hidden rounded-lg border-4 border-transparent bg-white shadow-md"
                    onClick={() => {
                      setSelectedFilm(film);
                      setOpen(true);
                    }}
                  >
                    <div className="relative h-[240px]">
                      {film.poster ? (
                        <Image
                          className="h-full w-full object-cover"
                          src={`https://image.tmdb.org/t/p/w1280${film.poster}`}
                          alt={`${film.title} poster`}
                          width={200}
                          height={300}
                        />
                      ) : (
                        <div className="h-[190px] w-[130px] bg-slate-300"> no poster </div>
                      )}
                    </div>
                    {buyNow && (
                      <div
                        className={cn(
                          "bg-primary absolute left-1 top-1 rounded px-2 py-1 text-sm font-bold text-white",
                          price > (myStudio?.budget ?? 0) && "bg-red-600",
                        )}
                      >
                        ${price}
                      </div>
                    )}
                    <div className="flex-grow bg-neutral-700 px-2 py-2 text-left">
                      <p className="text-balance break-words">{film.title}</p>
                      <p className="text-xs text-slate-400">{format(film.releaseDate, "LLL dd, yyyy")}</p>
                    </div>
                  </div>
                </DialogTrigger>
              );
            })}
            <DialogContent
              className="max-w-2/3 w-1/2 rounded-sm"
              forceMount
              autoFocus={false}
              onCloseAutoFocus={(e) => e.preventDefault()}
            >
              <DialogHeader>
                <DialogTitle className="text-white">{selectedFilm?.title}</DialogTitle>
                <DialogDescription>
                  {selectedFilm && (
                    <div className="flex">
                      <div className="flex flex-col">
                        {selectedFilm.poster ? (
                          <Image
                            className="group-hover:border-primary inset-0 min-w-[200px] border-4 border-transparent"
                            src={`https://image.tmdb.org/t/p/w1280${selectedFilm.poster}`}
                            alt={`${selectedFilm.title} poster`}
                            width={200}
                            height={300}
                          />
                        ) : (
                          <div className="h-[190px] w-[130px] bg-slate-300"> no poster </div>
                        )}
                      </div>
                      <div className="ml-4 w-full text-white">
                        <p className="mb-2 text-lg">
                          Release Date: {format(new Date(selectedFilm.releaseDate + "T00:00:00"), "LLL dd, yyyy")}
                        </p>
                        <p className="mb-2">{selectedFilm.overview}</p>

                        <Alert className="my-4">
                          <Lock className="h-4 w-4" />
                          <AlertTitle>
                            This film will no longer be available after{" "}
                            {format(
                              sub(new Date(selectedFilm.releaseDate + "T00:00:00" ?? ""), { days: 8 }),
                              "LLL dd, yyyy",
                            )}
                          </AlertTitle>
                        </Alert>

                        {canPick && !bidPlaced && (
                          <>
                            <div className="mt-4">
                              <Label>Slot</Label>
                              <Select value={selectedSlot} onValueChange={setSelectedSlot}>
                                <SelectTrigger className="w-2/3 text-black">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableSlots?.map((slot, i) => (
                                    <SelectItem key={i} value={String(slot.pos)}>
                                      {slot.type}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="mt-4 flex justify-between">
                              {!isDraft && (
                                <div className="flex flex-col">
                                  <Label>{!buyNow ? "Amount" : "Price"}</Label>
                                  {!buyNow ? (
                                    <Input
                                      className="w-2/3 text-black"
                                      value={bidAmount}
                                      onChange={(e) => setBidAmount(e.target.value)}
                                      type="number"
                                      min={0}
                                      startIcon={DollarSign}
                                    ></Input>
                                  ) : (
                                    <p
                                      className={cn(
                                        "flex items-center text-2xl text-white",
                                        insufficientFunds && "text-red-600",
                                      )}
                                    >
                                      <DollarSign />
                                      {bidAmount}
                                    </p>
                                  )}
                                </div>
                              )}
                              {buyNow && !insufficientFunds && (
                                <div className="flex flex-col">
                                  <Label>Remaining Budget</Label>
                                  <p className="flex items-center text-2xl text-white">
                                    <DollarSign />
                                    {(myStudio?.budget ?? 0) - Number(bidAmount)}
                                  </p>
                                </div>
                              )}
                            </div>
                          </>
                        )}

                        {bidPlaced && (
                          <Alert className="mt-4">
                            <CircleDollarSign className="h-4 w-4" />
                            <AlertTitle>Bid placed</AlertTitle>
                            <AlertDescription>
                              You have an active bid for this film. Manage your bids in the Bids tab.
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    </div>
                  )}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex-col sm:justify-between">
                <div className="flex items-center">
                  <Link
                    className="flex items-center"
                    href={`https://www.themoviedb.org/movie/${selectedFilm?.id}`}
                    target="_blank"
                  >
                    More Info <ExternalLink className="mx-1" size={16} />
                  </Link>
                  <Button onClick={() => handleFavorite()} variant="ghost">
                    <Star color="#fbbf24" fill={isFavorite ? "#fbbf24" : ""} />
                  </Button>
                </div>

                <div className="ml-auto flex items-center">
                  {isAdmin && !isDraft && (
                    <AdminMenu className="mr-4">
                      <DropdownMenuContent side="top">
                        {studios?.map((studio, i) => {
                          const slotUsed = !!studio.films.find((e) => e.slot === Number(selectedSlot));
                          return (
                            <DropdownMenuItem
                              key={i}
                              disabled={!selectedSlot || slotUsed}
                              onClick={() => handleAdminAdd(studio.id)}
                            >
                              Add to {studio.name}
                            </DropdownMenuItem>
                          );
                        })}
                      </DropdownMenuContent>
                    </AdminMenu>
                  )}
                  {isDraft && (
                    <Button disabled={!selectedFilm || !selectedSlot || !canPick} onClick={handleDraft}>
                      Draft {isAdmin && drafting?.id !== studioId && `for ${drafting?.name}`}
                    </Button>
                  )}
                  {!isDraft && canPick && !insufficientFunds && (
                    <Button
                      isLoading={bidding}
                      disabled={!selectedFilm || !canPick || !selectedSlot || bidPlaced}
                      onClick={handleBid}
                    >
                      {buyNow ? "Buy" : "Place Bid"}
                    </Button>
                  )}
                </div>
              </DialogFooter>
            </DialogContent>
          </div>
        </Dialog>

        {!!films.length && !showWatchlist && films.length < (sessionFilms?.total ?? 0) && (
          <div className="flex w-full">
            <Button className="mx-auto" onClick={() => setPage((s) => s + 1)} isLoading={loadingFilms}>
              Load More
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
