import { ChangeEvent, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { inferRouterOutputs } from "@trpc/server";
import { differenceInDays, format, isSameDay, sub } from "date-fns";
import { useSession } from "next-auth/react";

import { AppRouter } from "@repo/api";

import { api } from "~/utils/api";
import useLocalStorage from "~/utils/hooks/use-local-storage";
import { defaultOverlapGameState, findOverlap } from "~/utils/overlap-helpers";
import { cn } from "~/utils/shadcn";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "~/components/ui/command";
import { Label } from "~/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import Layout from "~/layouts/main/Layout";
import Loading from "~/layouts/main/Loading";
import { OverlapAnswerDetails } from "~/store/overlap";
import { ONE_DAY_IN_SECONDS } from "~/utils";
import Archive from "./Archive";
import Logo from "./Logo";
import Settings from "./Settings";
import Statistics from "./Statistics";

type TMDBMovie = inferRouterOutputs<AppRouter>["tmdb"]["getById"];
type OverlapGameData = {
  guesses: NonNullable<TMDBMovie>[];
  gameOver: boolean;
  lastCompleted: number;
  lastPlayed: number;
};
type OverlapGameState = {
  title: OverlapAnswerDetails;
  releaseYear: OverlapAnswerDetails;
  runtime: OverlapAnswerDetails;
  certification: OverlapAnswerDetails;
  budget: OverlapAnswerDetails;
  revenue: OverlapAnswerDetails;
  directors: OverlapAnswerDetails[];
  writers: OverlapAnswerDetails[];
  cast: OverlapAnswerDetails[];
  genres: OverlapAnswerDetails[];
  keywords: OverlapAnswerDetails[];
};

export default function OverlapPage() {
  const router = useRouter();
  const archive = router.query.archive as string | undefined;
  const { data: sessionData } = useSession();
  const trpc = api.useContext();

  const [gameData, setGameData] = useLocalStorage<OverlapGameData>("bmb-overlap", {
    guesses: [],
    gameOver: false,
    lastCompleted: 0,
    lastPlayed: 0,
  });
  const [gameState, setGameState] = useState<OverlapGameState | undefined>(defaultOverlapGameState);
  const [overlaps, setOverlaps] = useState({
    details: 0,
    cast: 0,
    crew: 0,
  });

  const [guessId, setGuessId] = useState<number>(0);
  const [searchKeyword, setSearchKeyword] = useState<string>();

  const [openArchive, setOpenArchive] = useState(false);
  const [openSettings, setOpenSettings] = useState(false);
  const [openStatistics, setOpenStatistics] = useState(false);

  const { data: answer } = api.overlap.getAnswer.useQuery(
    {
      date: archive ?? undefined,
    },
    { staleTime: ONE_DAY_IN_SECONDS },
  );
  const { data: searchResult } = api.tmdb.search.useQuery(
    { keyword: searchKeyword ?? "" },
    { enabled: !!searchKeyword },
  );
  const { data: guessDetails, refetch: getGuessDetails } = api.tmdb.getById.useQuery(
    { id: guessId },
    { enabled: false },
  );

  const { mutate: saveScore, isLoading: savingScore } = api.overlap.saveScore.useMutation();

  useEffect(() => {
    if (!isSameDay(new Date(), new Date(gameData.lastPlayed))) {
      setGameData((s) => ({ ...s, guesses: [], gameOver: false, lastPlayed: new Date().getTime() }));
    }
  }, [gameData]);

  // useEffect(() => {
  //   if (answer) reset();
  // }, [answer]);

  useEffect(() => {
    if (guessId) getGuessDetails();
  }, [guessId]);

  useEffect(() => {
    if (guessDetails) {
      setGameData((s) => ({
        ...s,
        guesses: [...s.guesses, guessDetails],
        lastPlayed: new Date().getTime(),
      }));
      setGuessId(0);
    }
  }, [guessDetails]);

  useEffect(() => {
    if (answer) {
      const gameState = findOverlap(answer.tmdb, gameData.guesses);
      setGameState(gameState);
      if (gameData.guesses.length) {
        const latest = findOverlap(answer.tmdb, [gameData.guesses[gameData.guesses.length - 1]!]);
        if (latest.title.revealed) {
          setOverlaps({ details: 0, cast: 0, crew: 0 });
          if (!gameData.gameOver && sessionData?.user)
            saveScore(
              { userId: sessionData.user.id, answerId: answer.id, numGuesses: gameData.guesses.length },
              { onSettled: () => trpc.overlap.getStats.invalidate({ userId: sessionData?.user.id }) },
            );
          setGameData((s) => ({ ...s, gameOver: true, lastCompleted: new Date().getTime() }));
        } else
          setOverlaps({
            details: [
              latest.releaseYear,
              latest.runtime,
              latest.certification,
              ...latest.genres.flat(),
              latest.revenue,
              latest.budget,
              ...latest.keywords.flat(),
            ].filter((e) => e.revealed).length,
            cast: latest.cast.filter((e) => e.revealed).length,
            crew: latest.directors.filter((e) => e.revealed).length + latest.writers.filter((e) => e.revealed).length,
          });
      }
    }
  }, [gameData.guesses, answer]);

  function handleMovieSelect(id: number) {
    setGuessId(id);
    setSearchKeyword("");
  }

  function reset() {
    setGameState(defaultOverlapGameState);
    setOverlaps({
      details: 0,
      cast: 0,
      crew: 0,
    });
    setGuessId(0);
    setSearchKeyword("");
    setOpenArchive(false);
    setOpenSettings(false);
    setOpenStatistics(false);
  }

  if (!answer) return <Loading />;

  return (
    <Layout title="Overlap | Big Movie Bois">
      <main className="mb-72 flex flex-col items-center lg:mb-2">
        <div className="mb-1 flex w-full flex-row items-center p-2">
          <Link href={"/daily-games/overlap"}>
            <Logo />
          </Link>
          <div className="ml-auto flex items-center">
            {/* <Archive open={openArchive} setOpen={setOpenArchive} /> */}
            <Statistics open={openStatistics} setOpen={setOpenStatistics} />
            <Settings open={openSettings} setOpen={setOpenSettings} />
          </div>
        </div>

        <div className="w-full items-center text-center">
          {gameState && (
            <div className="flex w-full flex-col">
              <div className="flex flex-col lg:flex-row">
                {gameState.title.revealed && answer.tmdb.poster ? (
                  <div className="mx-auto mb-2 max-h-[450px] max-w-[300px] lg:mx-0 lg:mb-0 lg:block">
                    <Image
                      src={`https://image.tmdb.org/t/p/w1280${answer.tmdb.poster}`}
                      width={300}
                      height={450}
                      alt={`Poster for ${answer.tmdb.title}`}
                    />
                  </div>
                ) : (
                  <span className="hidden h-[375px] max-h-[450px] w-[250px] max-w-[300px] bg-gray-300 lg:block"></span>
                )}

                <Tabs defaultValue="details" className="w-full px-2 lg:px-4">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="details">
                      Details {overlaps.details > 0 && <OverlapsIndicator num={overlaps.details} />}
                    </TabsTrigger>
                    <TabsTrigger value="cast">
                      Cast {overlaps.cast > 0 && <OverlapsIndicator num={overlaps.cast} />}
                    </TabsTrigger>
                    <TabsTrigger value="crew">
                      Crew {overlaps.crew > 0 && <OverlapsIndicator num={overlaps.crew} />}
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="details">
                    <div className="mb-2 flex">
                      <MovieDetail className="w-full lg:w-2/3" label="Title" field={gameState.title} />
                      <MovieDetail className="hidden w-1/3 lg:flex" label="Year" field={gameState.releaseYear} />
                    </div>
                    <div className="mb-2 flex">
                      <MovieDetail className="w-1/2 lg:hidden" label="Year" field={gameState.releaseYear} />
                      <MovieDetail className="w-1/2 lg:w-1/3" label="Runtime" field={gameState.runtime} />
                      <MovieDetail className="hidden w-1/6 lg:flex" label="Rating" field={gameState.certification} />
                      <MovieDetail className="hidden w-1/2 lg:flex" label="Genre(s)" field={gameState.genres} />
                    </div>
                    <div className="mb-2 flex lg:hidden">
                      <MovieDetail className="w-1/3" label="Rating" field={gameState.certification} />
                      <MovieDetail className="w-2/3" label="Genres" field={gameState.genres} />
                    </div>
                    <div className="mb-2 flex">
                      <MovieDetail className="w-5/6 lg:w-1/2" label="Box Office" field={gameState.revenue} />
                      <MovieDetail className="hidden w-1/2 lg:flex" label="Budget" field={gameState.budget} />
                    </div>
                    <div className="mb-2 flex lg:hidden">
                      <MovieDetail className="w-5/6" label="Budget" field={gameState.budget} />
                    </div>
                    <div className="mb-2 flex">
                      <MovieDetail className="w-full" textSize="text-md" label="Keywords" field={gameState.keywords} />
                    </div>
                  </TabsContent>
                  <TabsContent value="cast">
                    <div className="flex w-full flex-col lg:grid lg:grid-cols-2 lg:gap-x-4 lg:gap-y-2">
                      {gameState.cast.map((c, i) => (
                        <CastDetail key={i} cast={c} />
                      ))}
                    </div>
                  </TabsContent>
                  <TabsContent value="crew">
                    <div className="mb-2 flex">
                      <CrewDetail className="w-full" label="Director(s)" field={gameState.directors} />
                    </div>
                    <div className="mb-2 flex">
                      <CrewDetail className="w-full" label="Writer(s)" field={gameState.writers} />
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              {!gameState.title?.revealed && (
                <>
                  <p className="mr-2 lg:block">Average Guesses: {answer.averageGuesses}</p>
                  <Command className="mx-auto mt-2 w-full lg:w-1/2">
                    <CommandInput
                      className="appearance-none"
                      placeholder="Guess a movie"
                      value={searchKeyword}
                      onChangeCapture={(e: ChangeEvent<HTMLInputElement>) => setSearchKeyword(e.target.value)}
                    />
                    <CommandList>
                      {!!searchKeyword && <CommandEmpty>No results found.</CommandEmpty>}
                      {searchResult?.map((result, i) => (
                        <CommandItem key={i} onSelect={() => handleMovieSelect(result.id)}>
                          {result.title}
                        </CommandItem>
                      ))}
                    </CommandList>
                  </Command>
                </>
              )}
            </div>
          )}

          {!!gameData.guesses.length && <p>Guesses</p>}
          <div className="mb-4 mt-4 flex overflow-x-auto">
            <div className="mx-auto flex gap-2">
              {gameData.guesses.map((guess, i) => {
                if (guess.poster)
                  return (
                    <Image
                      key={i}
                      src={`https://image.tmdb.org/t/p/w1280${guess.poster}`}
                      width={100}
                      height={150}
                      alt={`Poster for ${guess.title}`}
                    />
                  );
              })}
            </div>
          </div>
        </div>
      </main>
    </Layout>
  );
}

function MovieDetail({
  className,
  label,
  field,
  textSize,
}: {
  className?: string;
  label: string;
  field: OverlapAnswerDetails | OverlapAnswerDetails[];
  textSize?: string;
}) {
  const fields = Array.isArray(field) ? field : [field];

  const c =
    fields.length >= 2
      ? fields.length <= 3
        ? "grid w-full grid-cols-2 gap-x-2 gap-y-1"
        : "grid w-full grid-cols-4 gap-x-4 gap-y-1"
      : "w-full";

  return (
    <div className={cn("flex flex-col items-start px-2 lg:px-4", className)}>
      <Label className="float-left">{label}</Label>
      <div className={c}>
        {fields.map((field, i) => {
          if (field.revealed)
            return (
              <p key={i} className={cn("mt-1 text-left text-2xl text-white", textSize)}>
                {field.value}
              </p>
            );
          else
            return (
              <div key={i} className="flex items-center">
                {field.lt && !field.e && (
                  <p className="mr-1 mt-1 min-w-max text-left text-lg text-red-600">{field.lt} &lt;</p>
                )}
                {field.e && <p className="mr-1 mt-1 min-w-max text-left text-lg text-white">{field.e}</p>}
                <div className="mt-1 h-8 w-full rounded-3xl bg-gray-400"></div>
                {field.gt && !field.e && (
                  <p className="ml-1 mt-1 min-w-max text-right text-lg text-cyan-400">&lt; {field.gt}</p>
                )}
              </div>
            );
        })}
      </div>
    </div>
  );
}

function CastDetail({ cast }: { cast: OverlapAnswerDetails }) {
  return cast.revealed ? (
    <div className="flex items-center">
      {cast.image && (
        <Image
          src={`https://media.themoviedb.org/t/p/w600_and_h900_bestv2${cast.image}`}
          height={50}
          width={50}
          alt={`Headshot of ${cast.value}`}
        />
      )}
      <p className="ml-4 mt-1 text-2xl text-white">{cast.value}</p>
    </div>
  ) : (
    <div className="mb-1 flex w-full items-center">
      <div className="h-[40px] min-w-[40px] rounded-full bg-gray-400"></div>
      <div className="ml-4 h-8 w-full rounded-3xl bg-gray-400"></div>
    </div>
  );
}

function CrewDetail({
  className,
  label,
  field,
}: {
  className?: string;
  label: string;
  field: OverlapAnswerDetails | OverlapAnswerDetails[];
}) {
  const fields = Array.isArray(field) ? field : [field];

  return (
    <div className={cn("flex flex-col items-start px-4", className)}>
      <Label className="float-left mb-1">{label}</Label>
      <div className={fields.length >= 2 ? "w-full gap-y-2 lg:grid lg:grid-cols-2 lg:gap-x-4" : "w-full lg:w-1/2"}>
        {fields.map((crew, i) => {
          if (crew.revealed)
            return (
              <div key={i} className="flex items-center">
                {crew.image && (
                  <Image
                    src={`https://media.themoviedb.org/t/p/w600_and_h900_bestv2${crew.image}`}
                    height={50}
                    width={50}
                    alt={`Headshot of ${crew.value}`}
                  />
                )}
                <p className="ml-4 mt-1 text-2xl text-white">{crew.value}</p>
              </div>
            );
          else
            return (
              <div key={i} className="flex w-full items-center">
                <div className="h-[40px] min-w-[40px] rounded-full bg-gray-400"></div>
                <div className="ml-4 h-8 w-full rounded-3xl bg-gray-400"></div>
              </div>
            );
        })}
      </div>
    </div>
  );
}

function OverlapsIndicator({ num }: { num: number }) {
  return <span className="ml-1 w-5 rounded-full bg-red-600 text-white">{num}</span>;
}
