import { ChangeEvent, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { inferRouterOutputs } from "@trpc/server";
import { format } from "date-fns";

import { AppRouter } from "@repo/api";

import { api } from "~/utils/api";
import { findOverlap } from "~/utils/overlap-helpers";
import { cn } from "~/utils/shadcn";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import { Label } from "~/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import Layout from "~/layouts/main/Layout";
import { OverlapAnswerDetails, OverlapGameState } from "~/store/overlap";
import Archive from "./Archive";
import Logo from "./Logo";
import Settings from "./Settings";
import Statistics from "./Statistics";

type TMDBMovie = inferRouterOutputs<AppRouter>["tmdb"]["getById"];

export default function OverlapPage() {
  const router = useRouter();
  const archive = router.query.archive as string | undefined;

  const [gameState, setGameState] = useState<OverlapGameState | undefined>();
  const [overlaps, setOverlaps] = useState({
    details: 0,
    cast: 0,
    crew: 0,
  });
  const [guesses, setGuesses] = useState<TMDBMovie[]>([]);
  const [guessId, setGuessId] = useState<number>(0);
  const [searchKeyword, setSearchKeyword] = useState<string>();

  const [openArchive, setOpenArchive] = useState(false);
  const [openSettings, setOpenSettings] = useState(false);
  const [openStatistics, setOpenStatistics] = useState(false);

  const { data: answer } = api.overlap.todaysMovie.useQuery(
    {
      date: archive ?? format(new Date(), "yyyy-MM-dd"),
    },
    { staleTime: 60 * 1000 * 30 },
  );
  const { data: searchResult } = api.tmdb.search.useQuery(
    { keyword: searchKeyword ?? "" },
    { enabled: !!searchKeyword },
  );
  const { data: guessDetails, refetch: getGuessDetails } =
    api.tmdb.getById.useQuery({ id: guessId }, { enabled: false });

  useEffect(() => {
    if (answer) reset();
  }, [answer]);

  useEffect(() => {
    if (guessId) getGuessDetails();
  }, [guessId]);

  useEffect(() => {
    if (guessDetails) {
      setGuesses((s) => {
        return [...s, guessDetails];
      });
      setGuessId(0);
    }
  }, [guessDetails]);

  useEffect(() => {
    if (answer) {
      setGameState(findOverlap(answer, guesses));
      console.log(findOverlap(answer, guesses));
      if (guesses.length) {
        const latest = findOverlap(answer, [guesses[guesses.length - 1]!]);
        if (latest.title.revealed)
          setOverlaps({ details: 0, cast: 0, crew: 0 });
        else
          setOverlaps({
            details: [
              latest.releaseYear,
              latest.runtime,
              latest.rating,
              ...latest.genres.flat(),
              latest.revenue,
              latest.budget,
              ...latest.keywords.flat(),
            ].filter((e) => e.revealed).length,
            cast: latest.cast.filter((e) => e.revealed).length,
            crew:
              latest.directors.filter((e) => e.revealed).length +
              latest.writers.filter((e) => e.revealed).length,
          });
      }
    }
  }, [guesses]);

  function handleMovieSelect(id: number) {
    setGuessId(id);
    setSearchKeyword("");
  }

  function reset() {
    setGuesses([]);
    setGameState(undefined);
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

  return (
    <Layout>
      <main className="flex h-screen max-h-screen flex-col items-center">
        <div className="mb-1 flex w-full flex-row items-center p-2">
          <Link href={"/daily-games/overlap"}>
            <Logo />
          </Link>
          <div className="ml-auto flex items-center">
            <p className="mr-2 inline">Average Guesses: 4</p>
            <Archive open={openArchive} setOpen={setOpenArchive} />
            <Statistics open={openStatistics} setOpen={setOpenStatistics} />
            <Settings open={openSettings} setOpen={setOpenSettings} />
          </div>
        </div>

        <div className="w-full items-center text-center">
          {gameState && (
            <div className="flex w-full flex-col">
              <div className="flex">
                {gameState.title.revealed ? (
                  <div className="max-h-[450px] max-w-[300px]">
                    <Image
                      src={answer!.details.poster!}
                      width={300}
                      height={450}
                      alt={`Poster for ${answer?.details.title}`}
                    />
                  </div>
                ) : (
                  <span className="h-[375px] max-h-[450px] w-[250px] max-w-[300px] bg-gray-300"></span>
                )}

                <Tabs defaultValue="details" className="w-full px-4">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="details">
                      Details{" "}
                      {overlaps.details > 0 && (
                        <OverlapsIndicator num={overlaps.details} />
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="cast">
                      Cast{" "}
                      {overlaps.cast > 0 && (
                        <OverlapsIndicator num={overlaps.cast} />
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="crew">
                      Crew{" "}
                      {overlaps.crew > 0 && (
                        <OverlapsIndicator num={overlaps.crew} />
                      )}
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="details">
                    <div className="mb-2 flex">
                      <MovieDetail
                        className="w-2/3"
                        label="Title"
                        field={gameState.title}
                      />
                      <MovieDetail
                        className="w-1/3"
                        label="Year"
                        field={gameState.releaseYear}
                      />
                    </div>
                    <div className="mb-2 flex">
                      <MovieDetail
                        className="w-1/3"
                        label="Runtime (minutes)"
                        field={gameState.runtime}
                      />
                      <MovieDetail
                        className="w-1/6"
                        label="Rating"
                        field={gameState.rating}
                      />
                      <MovieDetail
                        className="w-1/3"
                        label="Genre(s)"
                        field={gameState.genres}
                      />
                    </div>
                    <div className="mb-2 flex">
                      <MovieDetail
                        className="w-1/3"
                        label="Box Office"
                        field={gameState.revenue}
                      />
                      <MovieDetail
                        className="w-1/3"
                        label="Budget"
                        field={gameState.budget}
                      />
                    </div>
                    <div className="mb-2 flex">
                      <MovieDetail
                        className="w-full"
                        label="Keywords"
                        field={gameState.keywords}
                      />
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
                      <CrewDetail
                        className="w-full"
                        label="Director(s)"
                        field={gameState.directors}
                      />
                    </div>
                    <div className="mb-2 flex">
                      <CrewDetail
                        className="w-full"
                        label="Writer(s)"
                        field={gameState.writers}
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              {!gameState.title?.revealed && (
                <Command className="mx-auto mt-2 w-1/2">
                  <CommandInput
                    placeholder="Guess a movie"
                    value={searchKeyword}
                    onChangeCapture={(e: ChangeEvent<HTMLInputElement>) =>
                      setSearchKeyword(e.target.value)
                    }
                  />
                  <CommandList>
                    {!!searchKeyword && (
                      <CommandEmpty>No results found.</CommandEmpty>
                    )}
                    {searchResult?.map((result, i) => (
                      <CommandItem
                        key={i}
                        onSelect={() => handleMovieSelect(result.id)}
                      >
                        {result.title}
                      </CommandItem>
                    ))}
                  </CommandList>
                </Command>
              )}
            </div>
          )}

          <div className="mt-4 flex justify-center">
            {guesses.map((guess, i) => (
              <Image
                key={i}
                className="mx-2"
                src={guess.details.poster}
                width={100}
                height={150}
                alt={`Poster for ${guess.details.title}`}
              />
            ))}
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
}: {
  className?: string;
  label: string;
  field: OverlapAnswerDetails | OverlapAnswerDetails[];
}) {
  const fields = Array.isArray(field) ? field : [field];

  return (
    <div className={cn("flex flex-col items-start px-4", className)}>
      <Label className="float-left">{label}</Label>
      <div
        className={
          fields.length > 3
            ? "grid w-full grid-cols-4 gap-x-4 gap-y-1"
            : "w-full"
        }
      >
        {fields.map((field, i) => {
          if (field.revealed)
            return (
              <p key={i} className="mt-1 text-left text-2xl text-white">
                {field.value}
              </p>
            );
          else
            return (
              <div key={i} className="flex items-center">
                {field.lt && !field.e && (
                  <p className="mr-1 mt-1 min-w-max text-left text-lg text-white">
                    {field.lt} &lt;
                  </p>
                )}
                {field.e && (
                  <p className="mr-1 mt-1 min-w-max text-left text-lg text-white">
                    {field.e}
                  </p>
                )}
                <div className="mt-1 h-8 w-full rounded-3xl bg-gray-400"></div>
                {field.gt && !field.e && (
                  <p className="ml-1 mt-1 min-w-max text-right text-lg text-white">
                    &lt; {field.gt}
                  </p>
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
      <Image
        src={cast.image ?? ""}
        height={50}
        width={50}
        alt={`Headshot of ${cast.value}`}
      />
      <p className="ml-4 mt-1 text-2xl text-white">{cast.value}</p>
    </div>
  ) : (
    <div className="flex w-full items-center">
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
      <div
        className={
          fields.length >= 2
            ? "grid w-full grid-cols-2 gap-x-4 gap-y-2"
            : "w-1/2"
        }
      >
        {fields.map((crew, i) => {
          if (crew.revealed)
            return (
              <div key={i} className="flex items-center">
                <Image
                  src={crew.image ?? ""}
                  height={50}
                  width={50}
                  alt={`Headshot of ${crew.value}`}
                />
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
  return (
    <span className="ml-1 w-5 rounded-full bg-red-600 text-white">{num}</span>
  );
}
