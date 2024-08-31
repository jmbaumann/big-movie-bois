import { z } from "zod";

import { Prisma } from "@repo/db";
import type { League, Session, Studio } from "@repo/db";

// import { movieList } from "../movies";
import type { TRPCContext } from "../../trpc";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "../../trpc";

const getMyLeagues = publicProcedure.query(async ({ ctx }) => {
  const user = ctx.session?.user;
  if (user) {
    const leagues = await getLeaguesForUser(ctx, user.id);
    return leagues;
  } else return [];
});

const getPublicLeagues = publicProcedure.query(({ ctx }) => {
  return [];
});

const getByUuid = protectedProcedure
  .input(z.object({ uuid: z.string(), year: z.string().optional() }))
  .query(async ({ ctx, input }) => {
    const league = await getLeagueByUuid(ctx, input.uuid);
    if (!league) return null;
    return league;
  });

const create = protectedProcedure
  .input(
    z.object({
      ownerId: z.string(),
      name: z.string(),
      public: z.boolean(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const league = await ctx.prisma.league.create({
      data: {
        ownerId: input.ownerId,
        name: input.name,
        public: input.public,
        createdAt: new Date(),
        createdBy: ctx.session.user.id,
      },
    });
    return league;
  });

const update = protectedProcedure
  .input(
    z.object({
      id: z.string(),
      leagueId: z.string(),
      ownerId: z.string(),
      name: z.string(),
      public: z.boolean(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const league = await ctx.prisma.league.update({
      data: {
        name: input.name,
        public: input.public,
      },
      where: { id: input.leagueId },
    });
    return league;
  });

// const invite = protectedProcedure
// .input(z.object({ SessionId: z.string(), userEmail: z.string() }))
// .mutation(async ({ ctx, input }) => {
//   const user = await ctx.prisma.user.findFirst({
//     where: { email: input.userEmail },
//   });
//   if (!user)
//     throw new Error("A user with that email address does not exist");
//   await ctx.prisma.studio.create({
//     data: {
//       SessionId: input.SessionId,
//       ownerId: user.id,
//       name: `${user.name} Studios`,
//       image: "film",
//       score: 0,
//     },
//   });
// })

export const leagueRouter = createTRPCRouter({
  getMyLeagues,
  getPublicLeagues,
  getByUuid,
  create,
  update,
  // invite,
});

////////////////

export async function getLeagueByUuid(
  ctx: TRPCContext,
  uuid: string,
  year?: string,
) {
  const Session = year ?? String(new Date().getFullYear());
  const r: (League & Session)[] = await ctx.prisma.$queryRaw(
    Prisma.sql`SELECT * FROM "League" l LEFT JOIN "Session" ly ON l.id=ly."leagueId" WHERE l.uuid=${uuid} AND ly.year=${Session}`,
  );
  return r[0] ?? undefined;
}

export async function getLeaguesForUser(
  ctx: TRPCContext,
  userId: string,
  year?: string,
) {
  const Session = year ?? String(new Date().getFullYear());
  const r: (League & Session & { ownerName: string })[] =
    await ctx.prisma.$queryRaw(
      Prisma.sql`SELECT l.*,ly.*,u.name as "ownerName" FROM "League" l 
      LEFT JOIN "Session" ly ON l.id=ly."leagueId" 
      LEFT JOIN "User" u ON u.id=l."ownerId"
      WHERE ly.id IN (SELECT "SessionId" FROM "Studio" WHERE "ownerId"=${userId}) AND ly.year=${Session}`,
    );
  return r ?? undefined;
}
