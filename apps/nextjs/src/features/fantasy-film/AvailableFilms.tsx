import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { format, sub } from "date-fns";
import { CircleDollarSign, DollarSign, ExternalLink, Lock, Star } from "lucide-react";

import { RouterOutputs } from "@repo/api";
import { TMDBDiscoverResult } from "@repo/api/src/router/tmdb/types";

import { api } from "~/utils/api";
import { getUnlockedSlots } from "~/utils/fantasy-film-helpers";
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
import { toast } from "~/components/ui/hooks/use-toast";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { ONE_DAY_IN_SECONDS } from "~/utils";

type Film = TMDBDiscoverResult & { price?: number };
type Session = RouterOutputs["ffLeagueSession"]["getById"];

export default function AvailableFilms({
  session,
  films,
  studioId,
  buyNow,
  isDraft,
  loadMoreFilms,
}: {
  session: Session;
  films: Film[];
  studioId: string;
  buyNow?: boolean;
  isDraft?: boolean;
  loadMoreFilms?: () => void;
}) {
  const [filmList, setFilmList] = useState<Film[]>(films);
  const [favoritesList, setFavoritesList] = useState<Film[]>([]);
  const [showWatchlist, setShowWatchlist] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedFilm, setSelectedFilm] = useState<Film>();
  const [selectedSlot, setSelectedSlot] = useState<string>();
  const [bidAmount, setBidAmount] = useState("0");

  const sortOptions = [
    { label: "Popularity", value: "popularity" },
    { label: "Release Date", value: "releaseDate" },
    { label: "A-Z", value: "abc" },
  ];
  const sort = (a: Film, b: Film, value: string, desc: boolean) => {
    if (value === "popularity") return desc ? b.popularity - a.popularity : a.popularity - b.popularity;
    if (value === "releaseDate")
      return desc
        ? new Date(a.release_date).getTime() - new Date(b.release_date).getTime()
        : new Date(b.release_date).getTime() - new Date(a.release_date).getTime();
    if (value === "abc") {
      const compTitleA = a.title.toLowerCase().startsWith("the ") ? a.title.slice(4) : a.title;
      const compTitleB = b.title.toLowerCase().startsWith("the ") ? b.title.slice(4) : b.title;
      return desc ? compTitleA.localeCompare(compTitleB) : compTitleB.localeCompare(compTitleA);
    } else return 1;
  };

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
  const { mutate: addFavorite } = api.ffStudio.addFavorite.useMutation();
  const { mutate: removeFavorite } = api.ffStudio.removeFavorite.useMutation();
  const { mutate: makeBid, isLoading: bidding } = api.ffStudio.bid.useMutation();
  const { mutate: makePick } = api.ffDraft.pick.useMutation();

  const availableSlots = myStudio && session ? getUnlockedSlots(session, myStudio) : [];
  const canPick = !!availableSlots?.length;
  const isFavorite = selectedFilm ? favorites?.map((e) => e.tmdbId).includes(selectedFilm.id) : false;
  const bidPlaced = selectedFilm ? bids?.map((e) => e.tmdbId).includes(selectedFilm.id) : false;

  useEffect(() => {
    if (films) setFilmList(films);
  }, [films]);

  useEffect(() => {
    const favoriteIds = new Set(favorites?.map((e) => e.tmdbId));
    setFavoritesList(films.filter((e) => favoriteIds?.has(e.id)));
  }, [filmList]);

  useEffect(() => {
    if (buyNow && selectedFilm) {
      setBidAmount(String(selectedFilm.price));
    }
  }, [selectedFilm]);

  // console.log(films.map((e) => ({ popularity: e.popularity, price: e.price })));

  useEffect(() => {
    setSelectedSlot(undefined);
  }, [open]);

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
          },
        },
      );
  }

  function handleDraft() {
    if (session && selectedFilm && myStudio && selectedSlot) {
      makePick({
        sessionId: session.id,
        tmdbId: selectedFilm.id,
        title: selectedFilm.title,
        studioId: myStudio.id,
        slot: Number(selectedSlot),
      });
      setOpen(false);
    }
  }

  return (
    <>
      <div className="flex items-center">
        <SortChips
          items={filmList}
          setItems={setFilmList}
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
          <div className="flex flex-wrap justify-around gap-4">
            {(showWatchlist ? favoritesList : filmList).map((film, i) => {
              return (
                <DialogTrigger
                  key={i}
                  className="hover:text-primary group flex w-[150px] flex-col p-2 hover:cursor-pointer"
                >
                  <div
                    onClick={() => {
                      setSelectedFilm(film);
                      setOpen(true);
                    }}
                  >
                    <Image
                      className="group-hover:border-primary inset-0 border-4 border-transparent"
                      src={`https://image.tmdb.org/t/p/w1280${film.poster_path}`}
                      alt={`${film.title} poster`}
                      width={200}
                      height={300}
                    />
                    <p className="text-center">{film.title}</p>
                    <p className="text-center">{film.price}</p>
                  </div>
                </DialogTrigger>
              );
            })}
            <DialogContent className="max-w-2/3 w-1/2 rounded-sm" forceMount>
              <DialogHeader>
                <DialogTitle className="text-white">{selectedFilm?.title}</DialogTitle>
                <DialogDescription>
                  {selectedFilm && (
                    <div className="flex">
                      <div className="flex flex-col">
                        <Image
                          className="group-hover:border-primary inset-0 min-w-[200px] border-4 border-transparent"
                          src={`https://image.tmdb.org/t/p/w1280${selectedFilm.poster_path}`}
                          alt={`${selectedFilm.title} poster`}
                          width={200}
                          height={300}
                        />
                      </div>
                      <div className="ml-4 w-full text-white">
                        <p className="mb-2 text-lg">
                          Release Date: {format(new Date(selectedFilm.release_date + "T00:00:00"), "LLL dd, yyyy")}
                        </p>
                        <p className="mb-2">{selectedFilm.overview}</p>

                        <Alert className="my-4">
                          <Lock className="h-4 w-4" />
                          <AlertTitle>
                            This film will no longer be available after{" "}
                            {format(
                              sub(new Date(selectedFilm.release_date + "T00:00:00" ?? ""), { days: 8 }),
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

                            <div className="mt-4">
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
                                <p className="flex items-center text-2xl">
                                  <DollarSign className="text-white" />
                                  {bidAmount}
                                </p>
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

                <div className="ml-auto">
                  {isDraft && (
                    <Button disabled={!selectedFilm || !selectedSlot || !canPick} onClick={handleDraft}>
                      Draft
                    </Button>
                  )}
                  {!isDraft && canPick && (
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

        {!!filmList.length && !!loadMoreFilms && (
          <div className="flex w-full">
            <Button className="mx-auto" onClick={() => loadMoreFilms()}>
              Load More
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
