import { add, sub } from "date-fns";
import { z } from "zod";

import { Prisma } from "@repo/db";
import type { League, Session } from "@repo/db";

import { LEAGUE_INVITE_STATUSES } from "../../enums";
// import { movieList } from "../movies";
import type { TRPCContext } from "../../trpc";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../../trpc";
import { tmdb } from "../tmdb/tmdb";
import { LeagueSessionSettings } from "./zod";

const getSiteWideSessions = publicProcedure.query(async ({ ctx }) => {
  const list = await ctx.prisma.leagueSession.findMany({
    include: {
      league: true,
      studios: { include: { films: { include: { tmdb: true } } }, where: { ownerId: ctx.session?.user.id } },
      _count: {
        select: {
          studios: true,
        },
      },
    },
    where: {
      leagueId: "cm18qkt8o00056e9iscpz7ym8",
      OR: [
        {
          startDate: {
            lte: new Date(),
          },
          endDate: {
            gte: new Date(),
          },
        },
        {
          startDate: {
            gte: new Date(),
            lte: add(new Date(), { days: 30 }),
          },
        },
        {
          endDate: {
            lte: new Date(),
            gte: sub(new Date(), { days: 10 }),
          },
        },
      ],
    },
  });

  return list.map((e) => ({
    ...e,
    settings: JSON.parse(e.settings as string) as LeagueSessionSettings,
  }));
});

const getMyLeagues = publicProcedure.query(async ({ ctx }) => {
  const user = ctx.session?.user;
  if (user) {
    // const leagues = await getLeaguesForUser(ctx, user.id);
    const leagues = await ctx.prisma.league.findMany({
      where: { members: { some: { userId: user.id } } },
      include: {
        owner: { select: { username: true } },
        sessions: {
          include: {
            league: { select: { name: true } },
            studios: {
              include: { films: { include: { tmdb: true } }, owner: { select: { name: true } } },
              where: { ownerId: user.id },
            },
            _count: {
              select: {
                studios: true,
              },
            },
          },
        },
        members: true,
      },
    });

    return leagues.map((e) => ({
      ...e,
      sessions: e.sessions.map((s) => ({
        ...s,
        settings: JSON.parse(s.settings as string) as LeagueSessionSettings,
      })),
    }));
  } else return [];
});

const getPublicLeagues = publicProcedure.query(({ ctx }) => {
  return [];
});

const getById = protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
  const league = await ctx.prisma.league.findFirst({
    where: { id: input.id },
    include: {
      sessions: { include: { studios: { include: { films: true } } }, orderBy: { endDate: "asc" } },
      members: { include: { user: true } },
      invites: { include: { user: true } },
    },
  });
  if (!league) return null;
  return {
    ...league,
    sessions: league.sessions.map((e) => ({
      ...e,
      settings: JSON.parse(e.settings as string) as LeagueSessionSettings,
    })),
  };
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

const getInvitesByUserId = protectedProcedure.input(z.object({ userId: z.string() })).query(async ({ ctx, input }) => {
  return await ctx.prisma.leagueInvitation.findMany({
    where: { userId: input.userId, status: LEAGUE_INVITE_STATUSES.PENDING },
    include: {
      league: { select: { name: true, owner: true } },
    },
  });
});

const invite = protectedProcedure
  .input(z.object({ leagueId: z.string(), userId: z.string() }))
  .mutation(async ({ ctx, input }) => {
    const existing = await ctx.prisma.leagueInvitation.findFirst({
      where: { leagueId: input.leagueId, userId: input.userId },
    });
    if (existing) return;

    return await ctx.prisma.leagueInvitation.create({
      data: {
        leagueId: input.leagueId,
        userId: input.userId,
        status: LEAGUE_INVITE_STATUSES.PENDING,
        createdAt: new Date(),
      },
    });
  });

const updateInvite = protectedProcedure
  .input(z.object({ id: z.string(), status: z.string() }))
  .mutation(async ({ ctx, input }) => {
    return await ctx.prisma.leagueInvitation.update({
      data: { status: input.status },
      where: { id: input.id },
    });
  });

const removeInvite = protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
  return await ctx.prisma.leagueInvitation.delete({
    where: { id: input.id },
  });
});

const addMember = protectedProcedure
  .input(
    z.object({
      leagueId: z.string(),
      userId: z.string(),
      inviteId: z.string().optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    if (input.inviteId)
      await ctx.prisma.leagueInvitation.update({
        data: { status: LEAGUE_INVITE_STATUSES.ACCEPTED },
        where: { id: input.inviteId },
      });
    return await ctx.prisma.leagueMember.create({
      data: {
        leagueId: input.leagueId,
        userId: input.userId,
      },
    });
  });

const removeMember = protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
  return await ctx.prisma.leagueMember.delete({
    where: { id: input.id },
  });
});

export const leagueRouter = createTRPCRouter({
  getSiteWideSessions,
  getMyLeagues,
  getPublicLeagues,
  getById,
  create,
  update,
  getInvitesByUserId,
  invite,
  updateInvite,
  removeInvite,
  addMember,
  removeMember,
});

////////////////

export async function getLeagueByUuid(ctx: TRPCContext, uuid: string, year?: string) {
  const Session = year ?? String(new Date().getFullYear());
  const r: (League & Session)[] = await ctx.prisma.$queryRaw(
    Prisma.sql`SELECT * FROM "League" l LEFT JOIN "Session" ly ON l.id=ly."leagueId" WHERE l.uuid=${uuid} AND ly.year=${Session}`,
  );
  return r[0] ?? undefined;
}

export async function getLeaguesForUser(ctx: TRPCContext, userId: string, year?: string) {
  const Session = year ?? String(new Date().getFullYear());
  const r: (League & Session & { ownerName: string })[] = await ctx.prisma.$queryRaw(
    Prisma.sql`SELECT l.*,ly.*,u.name as "ownerName" FROM "League" l 
      LEFT JOIN "Session" ly ON l.id=ly."leagueId" 
      LEFT JOIN "User" u ON u.id=l."ownerId"
      WHERE ly.id IN (SELECT "SessionId" FROM "Studio" WHERE "ownerId"=${userId}) AND ly.year=${Session}`,
  );
  return r ?? undefined;
}
