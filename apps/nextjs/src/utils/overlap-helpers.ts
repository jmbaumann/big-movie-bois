import { inferRouterOutputs } from "@trpc/server";

import { AppRouter } from "@repo/api";

import { toMoney } from ".";

type OverlapMovie = inferRouterOutputs<AppRouter>["overlap"]["todaysMovie"];

export function findOverlap(
  answerMovie: OverlapMovie,
  guessMovies: OverlapMovie[],
) {
  const answer = restructure(answerMovie);
  const guesses = guessMovies.map((e) => restructure(e));
  console.log(guessMovies.map((e) => e.details.title));

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

  const yearsArray = guesses.map((e) => e.releaseYear);
  const guessedYears = new Set(yearsArray);

  const directors = answer.directors.map((director) => ({
    ...director,
    revealed: guessedDirectors.has(director.name),
  }));
  const writers = answer.writers.map((writer) => ({
    ...writer,
    revealed: guessedWriters.has(writer.name),
  }));
  const cast = answer.cast.map((c) => ({
    ...c,
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
      revealed: new Set(guesses.map((e) => e.title)).has(answer.title),
    },
    releaseYear: {
      value: answer.releaseYear,
      gt: findClosest(yearsArray, answer.releaseYear, "gt"),
      lt: findClosest(yearsArray, answer.releaseYear, "lt"),
      revealed: guessedYears.has(answer.releaseYear),
    },
    runtime: {
      value: `${answer.runtime} mins`,
      revealed: new Set(guesses.map((e) => e.runtime)).has(answer.runtime),
    },
    rating: {
      value: answer.rating,
      revealed: new Set(guesses.map((e) => e.rating)).has(answer.rating),
    },
    budget: {
      value: toMoney(answer.budget),
      revealed: new Set(guesses.map((e) => e.budget)).has(answer.budget),
    },
    revenue: {
      value: toMoney(answer.revenue),
      revealed: new Set(guesses.map((e) => e.revenue)).has(answer.revenue),
    },
    directors,
    writers,
    cast: cast.slice(0, 12),
    genres,
    keywords,
  };

  return gameState;
}

function findClosest(
  guesses: (number | string)[],
  answer: number | string,
  flag: "gt" | "lt",
): number | string | undefined {
  const targetValue = typeof answer === "string" ? Date.parse(answer) : answer;

  let closestValue: number | string | undefined = undefined;
  let closestDifference = Infinity;

  for (const item of guesses) {
    const currentValue = typeof item === "string" ? Date.parse(item) : item;

    if (
      (flag === "gt" && currentValue > targetValue) ||
      (flag === "lt" && currentValue < targetValue)
    ) {
      const difference = Math.abs(currentValue - targetValue);

      if (difference < closestDifference) {
        closestDifference = difference;
        closestValue = item;
      }
    }
  }

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
