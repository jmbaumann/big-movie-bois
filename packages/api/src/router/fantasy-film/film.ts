import { inferRouterOutputs } from "@trpc/server";
import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
  TRPCContext,
} from "../../trpc";

const swap = protectedProcedure
  .input(
    z.object({ studioId: z.string(), fromPos: z.number(), toPos: z.number() }),
  )
  .mutation(async ({ ctx, input }) => {
    const inFromPos = await ctx.prisma.studioFilm.findFirst({
      where: { studioId: input.studioId, slot: input.fromPos },
    });
    const inToPos = await ctx.prisma.studioFilm.findFirst({
      where: { studioId: input.studioId, slot: input.toPos },
    });

    await ctx.prisma.studioFilm.update({
      data: { slot: input.toPos },
      where: { id: inFromPos?.id },
    });
    if (inToPos)
      await ctx.prisma.studioFilm.update({
        data: { slot: input.fromPos },
        where: { id: inToPos.id },
      });
  });

const trade = protectedProcedure
  .input(z.object({ fromPos: z.number(), toPos: z.number() }))
  .mutation(async ({ ctx, input }) => {});

const drop = protectedProcedure
  .input(z.object({ id: z.string() }))
  .mutation(async ({ ctx, input }) => {
    return await ctx.prisma.studioFilm.delete({ where: input });
  });

export const filmRouter = createTRPCRouter({
  swap,
  trade,
  drop,
});

////////////////
