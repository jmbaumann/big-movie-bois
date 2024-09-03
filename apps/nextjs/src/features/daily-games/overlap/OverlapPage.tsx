import { ChangeEvent, useEffect, useState } from "react";
import Image from "next/image";
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
import Logo from "./Logo";
import Settings from "./Settings";
import Statistics from "./Statistics";

type TMDBMovie = inferRouterOutputs<AppRouter>["tmdb"]["getById"];

export default function OverlapPage() {
  const [gameState, setGameState] = useState<OverlapGameState>();
  const [guesses, setGuesses] = useState<TMDBMovie[]>([]);
  const [guessId, setGuessId] = useState<number>(0);
  const [searchKeyword, setSearchKeyword] = useState<string>();

  const [openSettings, setOpenSettings] = useState(false);
  const [openStatistics, setOpenStatistics] = useState(false);

  const { data: answer } = api.overlap.todaysMovie.useQuery(
    {
      date: format(new Date(), "yyyy-MM-dd"),
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
    if (answer) setGameState(findOverlap(answer, guesses));
  }, [answer]);

  useEffect(() => {
    if (guessId) getGuessDetails();
  }, [guessId]);

  useEffect(() => {
    if (guessDetails) {
      console.log(guessDetails);
      setGuesses((s) => {
        return [...s, guessDetails];
      });
      setGuessId(0);
    }
  }, [guessDetails]);

  useEffect(() => {
    if (answer) {
      console.log(findOverlap(answer, guesses));
      setGameState(findOverlap(answer, guesses));
    }
  }, [guesses]);

  function handleMovieSelect(id: number) {
    setGuessId(id);
    setSearchKeyword("");
  }

  return (
    <Layout>
      <main className="font-tektur flex h-screen max-h-screen flex-col items-center">
        <div className="mb-1 flex w-full flex-row items-center p-2">
          <Logo />
          <div className="ml-auto">
            <Statistics open={openStatistics} setOpen={setOpenStatistics} />
            <Settings open={openSettings} setOpen={setOpenSettings} />
          </div>
        </div>

        <div className="w-full items-center text-center">
          <p>Today's Average Guesses: 4</p>

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
                  <span className="h-[450px] max-h-[450px] w-[300px] max-w-[300px] bg-gray-300"></span>
                )}

                <Tabs defaultValue="details" className="w-full px-4">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="details">Details</TabsTrigger>
                    <TabsTrigger value="cast">Cast</TabsTrigger>
                    <TabsTrigger value="crew">Crew</TabsTrigger>
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
