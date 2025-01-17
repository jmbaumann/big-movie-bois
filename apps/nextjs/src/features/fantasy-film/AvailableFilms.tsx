import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { format, sub } from "date-fns";
import { CircleDollarSign, DollarSign, ExternalLink, Lock, Star } from "lucide-react";
import { useSession } from "next-auth/react";
import { io } from "socket.io-client";

import { RouterOutputs } from "@repo/api";
import { DraftState } from "@repo/api/src/router/fantasy-film/draft";
import { TMDBDetails } from "@repo/db";

import { api } from "~/utils/api";
import { getFilmCost, getUnlockedSlots, type Slot } from "~/utils/fantasy-film-helpers";
import useBreakpoint from "~/utils/hooks/use-breakpoint";
import { cn } from "~/utils/shadcn";
import AdminMenu from "~/components/AdminMenu";
import ResponsiveDialog from "~/components/ResponsiveDialog";
import SortChips from "~/components/SortChips";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { DropdownMenuContent, DropdownMenuItem } from "~/components/ui/dropdown-menu";
import { toast } from "~/components/ui/hooks/use-toast";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { env } from "~/env.mjs";
import { formatDate, ONE_DAY_IN_SECONDS, unique } from "~/utils";

type Film = TMDBDetails & { price?: number };
type Session = RouterOutputs["ffLeagueSession"]["getById"];
type Studio = NonNullable<Session>["studios"][number];

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
  drafting?: Studio;
  draftDisabled?: boolean;
  gridCols?: number;
}) {
  const { data: sessionData } = useSession();
  const trpc = api.useContext();
  const breakpoint = useBreakpoint();

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
  const { data: myStudio, refetch: refreshMyStudio } = api.ffStudio.getMyStudio.useQuery(
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

  const slotsFilled = new Set(
    isDraft && drafting?.id !== myStudio?.id ? drafting?.films.map((e) => e.slot) : myStudio?.films.map((e) => e.slot),
  );
  const availableSlots: Slot[] | undefined =
    myStudio && session
      ? buyNow || isDraft
        ? session.settings.teamStructure.filter((e) => !slotsFilled.has(e.pos))
        : getUnlockedSlots(session, myStudio)
      : [];
  const filmInSelectedSlot = availableSlots?.find((e) => e.pos === Number(selectedSlot))?.currentFilm;

  const canPick =
    (isDraft ? drafting?.id === studioId || isAdmin : true) &&
    (isDraft || buyNow || !session?.settings.draft.conduct || session.settings.draft.complete) &&
    !!availableSlots?.length &&
    !picking &&
    !draftDisabled;

  const isFavorite = selectedFilm ? favorites?.map((e) => e.id).includes(selectedFilm.id) : false;
  const bidPlaced = selectedFilm ? bids?.map((e) => e.tmdbId).includes(selectedFilm.id) : false;
  const insufficientFunds = selectedFilm && myStudio ? (selectedFilm.price ?? 0) > myStudio?.budget : false;

  const myFilmsPopularity = myStudio?.films.map((e) => e.tmdb!.popularity);
  const maxPopularity =
    films && myFilmsPopularity ? Math.min(Math.max(...films.map((e) => e.popularity), ...myFilmsPopularity), 100) : 0;

  useEffect(() => {
    if (sessionFilms?.data) {
      const films = sessionFilms.data.map((e) => ({
        ...e,
        price: getFilmCost(maxPopularity, e.popularity),
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
      setBidAmount(String(getFilmCost(maxPopularity, selectedFilm.popularity)));
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
        // console.log("Connected to the WebSocket server");
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
            refreshMyStudio();
            refreshFilms();
            setAcquiredFilms((s) => [...s, selectedFilm.id]);
            setBidAmount("0");
            trpc.ffStudio.getStudios.invalidate({ sessionId: session!.id });
            trpc.ffLeagueSession.getBids.invalidate({ sessionId: session!.id });
          },
          onError: (e) => {
            // toast({ title: e.message, variant: "destructive" });
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
      makePick(
        {
          sessionId: session.id,
          tmdbId: selectedFilm.id,
          title: selectedFilm.title,
          studioId,
          slot: Number(selectedSlot),
        },
        {
          onError: () => {
            toast({ title: "An error ocurred, please try again" });
          },
        },
      );
      setOpen(false);
    }
  }

  return (
    <>
      <div className="scrollbar-hidden flex max-w-full items-center overflow-x-scroll">
        <SortChips
          items={availableFilms}
          setItems={setAvailableFilms}
          options={sortOptions}
          sortFunc={sort}
          def={{ value: "popularity", desc: true }}
        ></SortChips>

        <div className="flex flex-col">
          <Label>Budget</Label>
          <p className="flex items-center text-lg text-white">
            <DollarSign size={18} />
            {(myStudio?.budget ?? 0) - Number(bidAmount)}
          </p>
        </div>
        <Button className="text-lg" variant="ghost" onClick={() => setShowWatchlist((s) => !s)}>
          <Star className="mr-1" color="#fbbf24" fill={showWatchlist ? "#fbbf24" : ""} />
          Watchlist
        </Button>
      </div>

      <div className="scrollbar-hidden max-h-[calc(100%-40px)] overflow-y-auto">
        <ResponsiveDialog open={open} setOpen={setOpen}>
          <div className={cn("grid", gridCols ? `grid-cols-${gridCols}` : "grid-cols-5")}>
            {availableFilms.map((film, i) => {
              const price = getFilmCost(maxPopularity, film.popularity);

              return (
                <ResponsiveDialog.Trigger
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
                        <div className="h-full w-full bg-slate-300"> </div>
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
                </ResponsiveDialog.Trigger>
              );
            })}
            <ResponsiveDialog.Content
              className="max-w-2/3 w-1/2 rounded-sm"
              forceMount
              autoFocus={false}
              onCloseAutoFocus={(e) => e.preventDefault()}
            >
              <ResponsiveDialog.Header>
                <ResponsiveDialog.Title>{selectedFilm?.title}</ResponsiveDialog.Title>

                {selectedFilm && (
                  <div className="flex flex-col lg:flex-row">
                    <div className="flex flex-col">
                      {selectedFilm.poster ? (
                        <Image
                          className="group-hover:border-primary inset-0 mx-auto min-w-[200px] border-4 border-transparent"
                          src={`https://image.tmdb.org/t/p/w1280${selectedFilm.poster}`}
                          alt={`${selectedFilm.title} poster`}
                          width={200}
                          height={300}
                        />
                      ) : (
                        <div className="h-[190px] w-[130px] bg-slate-300"> no poster </div>
                      )}
                    </div>
                    <div className="w-full text-white lg:ml-4">
                      <p className="mb-2 text-lg">
                        Release Date: {formatDate(selectedFilm.releaseDate, "LLL dd, yyyy")}
                      </p>
                      <p className="mb-2">{selectedFilm.overview}</p>

                      {breakpoint.isMobile && (
                        <div className="flex items-center justify-between">
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
                      )}

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
                          <div className="mt-4 flex flex-col items-start">
                            <Label>Slot</Label>
                            <Select value={selectedSlot} onValueChange={setSelectedSlot}>
                              <SelectTrigger className="mt-1 text-black lg:w-2/3">
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

                          {!!filmInSelectedSlot && (
                            <p className="mt-1 text-xs italic">
                              If you win this bid you will drop {filmInSelectedSlot?.tmdb?.title} from your Studio
                            </p>
                          )}

                          <div className="mb-2 mt-4 flex justify-end lg:mb-0 lg:justify-between">
                            {!isDraft && (
                              <div className="flex flex-col items-start">
                                <Label>{!buyNow ? "Amount" : "Price"}</Label>
                                {!buyNow ? (
                                  <Input
                                    className="mt-1 text-black lg:w-2/3"
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
              </ResponsiveDialog.Header>
              <ResponsiveDialog.Footer className="mt-2 flex-row sm:justify-between lg:mt-0">
                {!breakpoint.isMobile && (
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
                )}

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
              </ResponsiveDialog.Footer>
            </ResponsiveDialog.Content>
          </div>
        </ResponsiveDialog>

        {!!films.length && !showWatchlist && films.length < (sessionFilms?.total ?? 0) && (
          <div className="mb-4 flex w-full lg:mb-0">
            <Button className="mx-auto" onClick={() => setPage((s) => s + 1)} isLoading={loadingFilms}>
              Load More
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
