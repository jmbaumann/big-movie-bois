import { format } from "date-fns";

import { RouterOutputs } from "@repo/api";

import { OverlapAnswerDetails, OverlapGameState } from "~/store/overlap";
import { toMoney } from ".";

type TMDBMovie = NonNullable<RouterOutputs["tmdb"]["getById"]>;

export function findOverlap(answerMovie: TMDBMovie, guessMovies: TMDBMovie[]) {
  const answer = restructure(answerMovie);
  const guesses = guessMovies.map((e) => restructure(e));

  const titlesArray = guesses.map((e) => e.title);
  const yearsArray = guesses.map((e) => Number(format(e.releaseDate, "yyyy")));
  const runtimesArray = guesses.map((e) => e.runtime);
  const certificationsArray = guesses.map((e) => e.certification!);
  const budgetsArray = guesses.map((e) => e.budget);
  const revenuesArray = guesses.map((e) => Number(e.revenue));

  const guessedDirectors = new Set(guesses.map((e) => e.directors.map((d) => d.name)).flat());
  const guessedWriters = new Set(guesses.map((e) => e.writers.map((w) => w.name)).flat());
  const guessedCast = new Set(guesses.map((e) => e.cast.map((c) => c.name)).flat());
  const guessedGenres = new Set(guesses.map((e) => e.genres).flat());
  const guessedKeywords = new Set(guesses.map((e) => e.keywords).flat());

  const directors = answer.directors.map((director) => ({
    value: director.name,
    image: director.image,
    revealed: guessedDirectors.has(director.name),
  }));
  const writers = answer.writers.map((writer) => ({
    value: writer.name,
    image: writer.image,
    revealed: guessedWriters.has(writer.name),
  }));
  const cast = answer.cast.map((c) => ({
    value: c.name,
    image: c.image,
    revealed: guessedCast.has(c.name),
  }));
  const genres = answer.genres.map((genre) => ({
    value: genre,
    revealed: guessedGenres.has(genre),
  }));
  const keywords = answer.keywords.map((keyword) => ({
    value: keyword,
    revealed: guessedKeywords.has(keyword),
  }));

  const gameState = {
    title: {
      value: answer.title,
      revealed: new Set(titlesArray).has(answer.title),
      gt: findClosest(titlesArray, answer.title, {
        flag: "gt",
        firstChar: true,
      }),
      lt: findClosest(titlesArray, answer.title, {
        flag: "lt",
        firstChar: true,
      }),
      e: findClosest(titlesArray, answer.title, {
        flag: "gt",
        firstChar: true,
        checkEqual: true,
      }),
    },
    releaseYear: {
      value: format(answer.releaseDate, "yyyy"),
      revealed: new Set(yearsArray).has(Number(format(answer.releaseDate, "yyyy"))),
      gt: findClosest(yearsArray, Number(format(answer.releaseDate, "yyyy")), { flag: "gt" }),
      lt: findClosest(yearsArray, Number(format(answer.releaseDate, "yyyy")), { flag: "lt" }),
    },
    runtime: {
      value: `${answer.runtime} mins`,
      revealed: new Set(runtimesArray).has(answer.runtime),
      gt: findClosest(runtimesArray, answer.runtime, { flag: "gt" }),
      lt: findClosest(runtimesArray, answer.runtime, { flag: "lt" }),
    },
    certification: {
      value: String(answer.certification),
      revealed: new Set(certificationsArray).has(answer.certification!),
      // gt: findClosest(certificationsArray, answer.certification, {flag: "gt"}),
      // lt: findClosest(certificationsArray, answer.certification, {flag: "lt"}),
    },
    budget: {
      value: toMoney(answer.budget),
      revealed: new Set(budgetsArray).has(answer.budget),
      gt: findClosest(budgetsArray, answer.budget, {
        flag: "gt",
        firstChar: true,
      }),
      lt: findClosest(budgetsArray, answer.budget, {
        flag: "lt",
        firstChar: true,
      }),
    },
    revenue: {
      value: toMoney(Number(answer.revenue)),
      revealed: new Set(revenuesArray).has(Number(answer.revenue)),
      gt: findClosest(revenuesArray, Number(answer.revenue), {
        flag: "gt",
        firstChar: true,
      }),
      lt: findClosest(revenuesArray, Number(answer.revenue), {
        flag: "lt",
        firstChar: true,
      }),
    },
    directors,
    writers,
    cast: cast.slice(0, 12),
    genres,
    keywords,
  };

  return gameState as OverlapGameState;
}

function findClosest(
  guesses: (number | bigint | string)[],
  answer: number | bigint | string,
  options: {
    flag: "gt" | "lt";
    firstChar?: boolean;
    checkEqual?: boolean;
  },
): number | string | undefined {
  const targetValue = typeof answer === "string" && Number.isInteger(answer) ? Number(answer) : answer;
  let closestValue: number | bigint | string | undefined = undefined;
  let closestDifference = Infinity;

  for (const item of guesses) {
    const currentValue = typeof item === "string" && Number.isInteger(item) ? Number(item) : item;

    if (
      (options.flag === "gt" && currentValue > targetValue) ||
      (options.flag === "lt" && currentValue < targetValue) ||
      options.checkEqual
    ) {
      const d1 =
        typeof currentValue === "string"
          ? currentValue[0]!.toLowerCase().charCodeAt(0) - "a".charCodeAt(0) + 1
          : currentValue;
      const d2 =
        typeof targetValue === "string"
          ? targetValue[0]!.toLowerCase().charCodeAt(0) - "a".charCodeAt(0) + 1
          : targetValue;
      const difference = Math.abs(Number(d1) - Number(d2));

      if (difference < closestDifference) {
        closestDifference = difference;
        closestValue = options.firstChar
          ? typeof currentValue === "string"
            ? currentValue[0]
            : `$${Math.round((Number(currentValue) / 1000000) * 10) / 10}M`
          : currentValue;
      }
    }
  }

  if (typeof closestValue === "bigint") closestValue = Number(closestValue);

  if (options.checkEqual) return closestDifference === 0 ? closestValue : undefined;

  return closestValue;
}

function restructure(movie: TMDBMovie) {
  const directors = movie?.crew.filter((e) => e.job === "Director");
  const writers = movie?.crew.filter((e) => e.department === "Writing");
  return {
    ...movie,
    cast: movie?.cast,
    directors,
    writers,
  };
}

function getMatchingStart(str1: string, str2: string) {
  let i = 0;
  while (i < str1.length && i < str2.length && str1[i] === str2[i]) i++;
  return str1.substring(0, i);
}

export const defaultOverlapGameState = {
  title: {} as OverlapAnswerDetails,
  releaseYear: {} as OverlapAnswerDetails,
  runtime: {} as OverlapAnswerDetails,
  certification: {} as OverlapAnswerDetails,
  budget: {} as OverlapAnswerDetails,
  revenue: {} as OverlapAnswerDetails,
  directors: [] as OverlapAnswerDetails[],
  writers: [] as OverlapAnswerDetails[],
  cast: [] as OverlapAnswerDetails[],
  genres: [] as OverlapAnswerDetails[],
  keywords: [] as OverlapAnswerDetails[],
};
