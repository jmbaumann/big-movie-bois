import { inferRouterOutputs } from "@trpc/server";

import { AppRouter } from "@repo/api";

import { OverlapGameState } from "~/store/overlap";
import { toMoney } from ".";

type OverlapMovie = inferRouterOutputs<AppRouter>["overlap"]["todaysMovie"];

export function findOverlap(
  answerMovie: OverlapMovie,
  guessMovies: OverlapMovie[],
) {
  const answer = restructure(answerMovie);
  const guesses = guessMovies.map((e) => restructure(e));

  const titlesArray = guesses.map((e) => e.title);
  const yearsArray = guesses.map((e) => e.releaseYear);
  const runtimesArray = guesses.map((e) => e.runtime);
  const ratingsArray = guesses.map((e) => e.rating!);
  const budgetsArray = guesses.map((e) => e.budget);
  const revenuesArray = guesses.map((e) => e.revenue);

  const guessedDirectors = new Set(
    guesses.map((e) => e.directors.map((d) => d.name)).flat(),
  );
  const guessedWriters = new Set(
    guesses.map((e) => e.writers.map((w) => w.name)).flat(),
  );
  const guessedCast = new Set(
    guesses.map((e) => e.cast.map((c) => c.name)).flat(),
  );
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
      value: answer.releaseYear,
      revealed: new Set(yearsArray).has(answer.releaseYear),
      gt: findClosest(yearsArray, answer.releaseYear, { flag: "gt" }),
      lt: findClosest(yearsArray, answer.releaseYear, { flag: "lt" }),
    },
    runtime: {
      value: `${answer.runtime} mins`,
      revealed: new Set(runtimesArray).has(answer.runtime),
      gt: findClosest(runtimesArray, answer.runtime, { flag: "gt" }),
      lt: findClosest(runtimesArray, answer.runtime, { flag: "lt" }),
    },
    rating: {
      value: answer.rating,
      revealed: new Set(ratingsArray).has(answer.rating!),
      // gt: findClosest(ratingsArray, answer.rating, {flag: "gt"}),
      // lt: findClosest(ratingsArray, answer.rating, {flag: "lt"}),
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
      value: toMoney(answer.revenue),
      revealed: new Set(revenuesArray).has(answer.revenue),
      gt: findClosest(revenuesArray, answer.revenue, {
        flag: "gt",
        firstChar: true,
      }),
      lt: findClosest(revenuesArray, answer.revenue, {
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
  guesses: (number | string)[],
  answer: number | string,
  options: {
    flag: "gt" | "lt";
    firstChar?: boolean;
    checkEqual?: boolean;
  },
): number | string | undefined {
  const targetValue =
    typeof answer === "string" && Number.isInteger(answer)
      ? Number(answer)
      : answer;

  let closestValue: number | string | undefined = undefined;
  let closestDifference = Infinity;

  for (const item of guesses) {
    const currentValue =
      typeof item === "string" && Number.isInteger(item) ? Number(item) : item;

    if (
      (options.flag === "gt" && currentValue > targetValue) ||
      (options.flag === "lt" && currentValue < targetValue)
    ) {
      const d1 =
        typeof currentValue === "string"
          ? currentValue[0]!.toLowerCase().charCodeAt(0) - "a".charCodeAt(0) + 1
          : currentValue;
      const d2 =
        typeof targetValue === "string"
          ? targetValue[0]!.toLowerCase().charCodeAt(0) - "a".charCodeAt(0) + 1
          : targetValue;
      const difference = Math.abs(d1 - d2);

      if (difference < closestDifference) {
        closestDifference = difference;
        closestValue = options.firstChar
          ? typeof item === "string"
            ? item[0]
            : `$${Math.round((item / 1000000) * 10) / 10}M`
          : item;
      }
    }
  }

  if (options.checkEqual)
    return closestDifference === 0 ? closestValue : undefined;

  return closestValue;
}

function restructure(movie: OverlapMovie) {
  const directors = movie.crew.filter((e) => e.job === "Director");
  const writers = movie.crew.filter((e) => e.department === "Writing");
  return {
    ...movie.details,
    cast: movie.cast,
    directors,
    writers,
  };
}
