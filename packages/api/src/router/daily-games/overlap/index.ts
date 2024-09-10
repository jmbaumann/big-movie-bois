import { format } from "date-fns";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "../../../trpc";
import { getByTMDBId } from "../../tmdb";
import {
  tmdbCertifications,
  tmdbCredits,
  tmdbDetails,
  tmdbKeywords,
} from "./movieData";

const todaysMovie = publicProcedure
  .input(z.object({ date: z.string() }))
  .query(async ({ ctx, input }) => {
    const idsByDate = {
      "Sep 10": 280, // T2
      "Sep 9": 102899, // ant-man
      "Sep 8": 920, // cars
      "Sep 7": 929590, // civil war
      "Sep 6": 95, // armageddon
      "Sep 5": 6977, // no country for old men
      "Sep 4": 27205, // inception
      "Sep 3": 27581, // the other guys
      "Sep 2": 1374, // rocky iv
      "Sep 1": 603, // the matrix
    };

    // @ts-ignore
    const id = idsByDate[input.date] ?? 27205;

    // get movie data from tmdb
    return getByTMDBId(id);

    const details = {
      id: tmdbDetails.id,
      title: tmdbDetails.title,
      releaseYear: format(tmdbDetails.release_date, "yyyy"),
      genres: tmdbDetails.genres.map((e) => e.name),
      runtime: tmdbDetails.runtime,
      rating: tmdbCertifications.results
        .find((e) => e.iso_3166_1 === "US")
        ?.release_dates.find((e) => e.type === 3)?.certification,
      budget: tmdbDetails.budget,
      revenue: tmdbDetails.revenue,
      keywords: tmdbKeywords.keywords.map((e) => e.name).slice(0, 12),
      poster: `https://image.tmdb.org/t/p/w1280/${tmdbDetails.poster_path}`,
    };
    const cast = tmdbCredits.cast.map((e) => ({
      name: e.name,
      image: `https://media.themoviedb.org/t/p/w600_and_h900_bestv2/${e.profile_path}`,
    }));
    const crew = tmdbCredits.crew.map((e) => ({
      name: e.name,
      department: e.department,
      job: e.job,
      image: `https://media.themoviedb.org/t/p/w600_and_h900_bestv2/${e.profile_path}`,
    }));

    return { details, cast, crew };
  });

export const overlapRouter = createTRPCRouter({
  todaysMovie,
});
