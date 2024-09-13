import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { inferRouterOutputs } from "@trpc/server";
import { ExternalLink, Star } from "lucide-react";

import { AppRouter } from "@repo/api";
import { TMDBDiscoverResult } from "@repo/api/src/router/tmdb/types";

import { api } from "~/utils/api";
import { cn } from "~/utils/shadcn";
import SortChips from "~/components/SortChips";
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
import { Label } from "~/components/ui/label";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";

type Film = TMDBDiscoverResult;
type Session = inferRouterOutputs<AppRouter>["ffLeagueSession"]["getById"];

export default function AvailableFilms({
  session,
  films,
  studioId,
  canPick,
}: {
  session: Session;
  films: Film[];
  studioId: string;
  canPick: boolean;
}) {
  const [filmList, setFilmList] = useState(films);
  const [showWatchlist, setShowWatchlist] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedFilm, setSelectedFilm] = useState<Film>();
  const [selectedSlot, setSelectedSlot] = useState<string>();

  const sortOptions = [
    { label: "Popularity", value: "popularity" },
    { label: "Release Date", value: "releaseDate" },
    { label: "A-Z", value: "abc" },
  ];
  const sort = (a: Film, b: Film, value: string, desc: boolean) => {
    if (value === "popularity")
      return desc ? b.popularity - a.popularity : a.popularity - b.popularity;
    if (value === "releaseDate")
      return desc
        ? new Date(a.release_date).getTime() -
            new Date(b.release_date).getTime()
        : new Date(b.release_date).getTime() -
            new Date(a.release_date).getTime();
    if (value === "abc") {
      const compTitleA = a.title.toLowerCase().startsWith("the ")
        ? a.title.slice(4)
        : a.title;
      const compTitleB = b.title.toLowerCase().startsWith("the ")
        ? b.title.slice(4)
        : b.title;
      return desc
        ? compTitleA.localeCompare(compTitleB)
        : compTitleB.localeCompare(compTitleA);
    } else return 1;
  };

  const { data: myStudio } = api.ffLeagueSession.getMyStudio.useQuery(
    { sessionId: session?.id ?? "" },
    {
      enabled: !!session?.id,
    },
  );
  const { data: favorites, refetch: refreshFavorites } =
    api.ffStudio.getFavorites.useQuery(
      { studioId },
      {
        enabled: !!studioId,
      },
    );
  const { mutate: addFavorite } = api.ffStudio.addFavorite.useMutation();
  const { mutate: removeFavorite } = api.ffStudio.removeFavorite.useMutation();

  const sessionSlots = session?.settings.teamStructure;
  const availableSlots =
    sessionSlots?.filter(
      (e) => !myStudio?.films.map((e) => e.slot).includes(e.pos),
    ) ?? [];
  const isFavorite = selectedFilm
    ? favorites?.map((e) => e.tmdbId).includes(selectedFilm.id)
    : false;

  useEffect(() => {
    if (showWatchlist) {
      const favoriteIds = favorites?.map((e) => e.tmdbId);
      setFilmList(films.filter((e) => favoriteIds?.includes(e.id)));
    } else setFilmList(films);
  }, [showWatchlist, favorites]);

  useEffect(() => {
    setSelectedSlot(undefined);
  }, [open]);

  function handleFavorite() {
    if (selectedFilm)
      if (isFavorite)
        removeFavorite(
          { studioId, tmdbId: selectedFilm.id },
          { onSuccess: () => refreshFavorites() },
        );
      else
        addFavorite(
          { studioId, tmdbId: selectedFilm.id },
          { onSuccess: () => refreshFavorites() },
        );
  }

  return (
    <>
      <div className="flex items-center">
        <SortChips
          setItems={setFilmList}
          options={sortOptions}
          sortFunc={sort}
          def={{ value: "popularity", desc: true }}
        ></SortChips>

        <Button
          className="text-lg"
          variant="ghost"
          onClick={() => setShowWatchlist((s) => !s)}
        >
          <Star
            className="mr-1"
            color="#fbbf24"
            fill={showWatchlist ? "#fbbf24" : ""}
          />
          Watchlist
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <div className="flex max-h-[calc(100%-40px)] flex-wrap justify-around gap-4 overflow-y-auto">
          {filmList.map((film, i) => {
            return (
              <DialogTrigger
                key={i}
                className={cn(
                  "group flex w-[150px] flex-col p-2 hover:cursor-default",
                  canPick ? "hover:text-primary hover:cursor-pointer" : "",
                )}
              >
                <div
                  onClick={() => {
                    if (canPick) {
                      setSelectedFilm(film);
                      setOpen(true);
                    }
                  }}
                >
                  <Image
                    className={cn(
                      "inset-0 border-4 border-transparent",
                      canPick ? "group-hover:border-primary" : "",
                    )}
                    src={`https://image.tmdb.org/t/p/w1280${film.poster_path}`}
                    alt={`${film.title} poster`}
                    width={200}
                    height={300}
                  />
                  <p className="text-center">{film.title}</p>
                </div>
              </DialogTrigger>
            );
          })}
          <DialogContent className="max-w-2/3 w-1/2 rounded-sm" forceMount>
            <DialogHeader>
              <DialogTitle className="text-white">
                {selectedFilm?.title}
              </DialogTitle>
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
                        Release Date: {selectedFilm.release_date}
                      </p>
                      <p className="mb-2">{selectedFilm.overview}</p>

                      <RadioGroup
                        className="ml-6 mt-1 text-white"
                        value={selectedSlot}
                        onValueChange={setSelectedSlot}
                      >
                        {availableSlots.map((slot, i) => {
                          return (
                            <div
                              key={i}
                              className="flex items-center space-x-2"
                            >
                              <RadioGroupItem
                                value={String(slot.pos)}
                                id={String(slot.pos)}
                              />
                              <Label htmlFor={String(slot.pos)}>
                                {slot.type}
                              </Label>
                            </div>
                          );
                        })}
                      </RadioGroup>
                    </div>
                  </div>
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex-col sm:justify-start">
              <Link
                className="flex items-center"
                href={`https://www.themoviedb.org/movie/${selectedFilm?.id}`}
                target="_blank"
              >
                More Info <ExternalLink className="mx-1" size={16} />
              </Link>

              <div className="ml-auto">
                <Button onClick={() => handleFavorite()} variant="ghost">
                  <Star color="#fbbf24" fill={isFavorite ? "#fbbf24" : ""} />
                </Button>
              </div>

              {/* <Button
                  className="bg-lb-green absolute bottom-5 right-5"
                  disabled={!selectedFilm && !selectedSlot}
                  onClick={draftFilm}
                >
                  Draft
                </Button> */}
            </DialogFooter>
          </DialogContent>
        </div>
      </Dialog>
    </>
  );
}
