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
    // const leagues = await getLeaguesForUser(ctx, user.id);
    const leagues = await ctx.prisma.league.findMany({
      where: { ownerId: user.id },
      include: { owner: { select: { name: true } }, sessions: true },
    });
    return leagues;
  } else return [];
});

const getPublicLeagues = publicProcedure.query(({ ctx }) => {
  return [];
});

const getById = protectedProcedure
  .input(z.object({ id: z.string() }))
  .query(async ({ ctx, input }) => {
    // const league = await getLeagueById(ctx, input.id);
    const league = await ctx.prisma.league.findFirst({
      where: { id: input.id },
      include: { sessions: true, members: { include: { user: true } } },
    });
    if (!league) return null;
    return league;
  });

const create = protectedProcedure
  .input(
    z.object({
      name: z.string(),
      public: z.boolean(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const league = await ctx.prisma.league.create({
      data: {
        name: input.name,
        public: input.public,
        ownerId: ctx.session.user.id,
        createdAt: new Date(),
        createdBy: ctx.session.user.id,
      },
    });
    await ctx.prisma.leagueMember.create({
      data: {
        userId: ctx.session.user.id,
        leagueId: league.id,
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

const addMember = protectedProcedure
  .input(z.object({ leagueId: z.string(), userId: z.string() }))
  .mutation(async ({ ctx, input }) => {
    return await ctx.prisma.leagueMember.create({
      data: input,
    });
  });

const removeMember = protectedProcedure
  .input(z.object({ id: z.string() }))
  .mutation(async ({ ctx, input }) => {
    return await ctx.prisma.leagueMember.delete({
      where: { id: input.id },
    });
  });

export const leagueRouter = createTRPCRouter({
  getMyLeagues,
  getPublicLeagues,
  getById,
  create,
  update,
  addMember,
  removeMember,
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
