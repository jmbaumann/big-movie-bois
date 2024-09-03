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
    // get movie data from tmdb
    return getByTMDBId(9087);

    // const details = {
    //   id: tmdbDetails.id,
    //   title: tmdbDetails.title,
    //   releaseYear: format(tmdbDetails.release_date, "yyyy"),
    //   genres: tmdbDetails.genres.map((e) => e.name),
    //   runtime: tmdbDetails.runtime,
    //   rating: tmdbCertifications.results
    //     .find((e) => e.iso_3166_1 === "US")
    //     ?.release_dates.find((e) => e.type === 3)?.certification,
    //   budget: tmdbDetails.budget,
    //   revenue: tmdbDetails.revenue,
    //   keywords: tmdbKeywords.keywords.map((e) => e.name),
    // };
    // const cast = tmdbCredits.cast.map((e) => ({
    //   name: e.name,
    //   image: `https://media.themoviedb.org/t/p/w600_and_h900_bestv2/${e.profile_path}`,
    // }));
    // const crew = tmdbCredits.crew.map((e) => ({
    //   name: e.name,
    //   department: e.department,
    //   job: e.job,
    //   image: `https://media.themoviedb.org/t/p/w600_and_h900_bestv2/${e.profile_path}`,
    // }));

    // return { details, cast, crew };
  });

export const overlapRouter = createTRPCRouter({
  todaysMovie,
});
