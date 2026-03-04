import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  getArenaUsers, getArenaUserDetail, banArenaUser, unbanArenaUser,
  getCompetitions, getCompetitionRegistrations, updateRegistrationStatus,
  getChatMessages, moderateMessage, batchModerateMessages,
  getPlatformStats, getTierDistribution, getCompetitionTrends,
  getCountryDistribution, getTopTraders, getInstitutionLeaderboard, getRegistrationTrend,
  createAdminLog, getAdminLogs,
  getAllArenaUsersForExport, getAllCompetitionsForExport, getAllAdminLogsForExport,
} from "./db";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Arena Users ────────────────────────────────────────────────────────
  users: router({
    list: adminProcedure
      .input(z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(12),
        search: z.string().optional(),
        tier: z.string().optional(),
        status: z.string().optional(),
        sortBy: z.string().optional(),
        sortOrder: z.enum(["asc", "desc"]).optional(),
      }))
      .query(({ input }) => getArenaUsers(input)),

    detail: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getArenaUserDetail(input.id)),

    ban: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const result = await banArenaUser(input.id);
        if (result) {
          await createAdminLog({
            adminUserId: ctx.user.id,
            adminName: ctx.user.name || "Admin",
            action: "user_ban",
            targetType: "user",
            targetId: String(input.id),
            description: `封禁用户 #${input.id}`,
          });
        }
        return { success: result };
      }),

    unban: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const result = await unbanArenaUser(input.id);
        if (result) {
          await createAdminLog({
            adminUserId: ctx.user.id,
            adminName: ctx.user.name || "Admin",
            action: "user_unban",
            targetType: "user",
            targetId: String(input.id),
            description: `解封用户 #${input.id}`,
          });
        }
        return { success: result };
      }),
  }),

  // ─── Competitions ───────────────────────────────────────────────────────
  competitions: router({
    list: adminProcedure.query(() => getCompetitions()),

    registrations: adminProcedure
      .input(z.object({
        competitionId: z.number(),
        status: z.string().optional(),
      }))
      .query(({ input }) => getCompetitionRegistrations(input.competitionId, input.status)),

    updateRegistration: adminProcedure
      .input(z.object({
        ids: z.array(z.number()),
        status: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const result = await updateRegistrationStatus(input.ids, input.status, ctx.user.id);
        if (result) {
          await createAdminLog({
            adminUserId: ctx.user.id,
            adminName: ctx.user.name || "Admin",
            action: `registration_${input.status}`,
            targetType: "registration",
            targetId: input.ids.join(","),
            description: `将 ${input.ids.length} 个报名状态更新为 ${input.status}`,
            metadata: JSON.stringify({ ids: input.ids, status: input.status }),
          });
        }
        return { success: result };
      }),
  }),

  // ─── Chat Messages ────────────────────────────────────────────────────
  chat: router({
    list: adminProcedure
      .input(z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(15),
        competitionId: z.number().optional(),
        status: z.string().optional(),
        search: z.string().optional(),
      }))
      .query(({ input }) => getChatMessages(input)),

    moderate: adminProcedure
      .input(z.object({
        messageId: z.string(),
        status: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const result = await moderateMessage(input.messageId, input.status, ctx.user.id, ctx.user.name || "Admin");
        if (result) {
          await createAdminLog({
            adminUserId: ctx.user.id,
            adminName: ctx.user.name || "Admin",
            action: `chat_${input.status}`,
            targetType: "chat_message",
            targetId: input.messageId,
            description: `将消息 ${input.messageId} 状态设为 ${input.status}`,
          });
        }
        return { success: result };
      }),

    batchModerate: adminProcedure
      .input(z.object({
        messageIds: z.array(z.string()),
        status: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const result = await batchModerateMessages(input.messageIds, input.status, ctx.user.id, ctx.user.name || "Admin");
        if (result) {
          await createAdminLog({
            adminUserId: ctx.user.id,
            adminName: ctx.user.name || "Admin",
            action: `chat_batch_${input.status}`,
            targetType: "chat_message",
            targetId: input.messageIds.join(","),
            description: `批量将 ${input.messageIds.length} 条消息状态设为 ${input.status}`,
          });
        }
        return { success: result };
      }),
  }),

  // ─── Statistics ───────────────────────────────────────────────────────
  stats: router({
    platform: adminProcedure.query(() => getPlatformStats()),
    tierDistribution: adminProcedure.query(() => getTierDistribution()),
    competitionTrends: adminProcedure.query(() => getCompetitionTrends()),
    countryDistribution: adminProcedure.query(() => getCountryDistribution()),
    topTraders: adminProcedure
      .input(z.object({ limit: z.number().min(1).max(50).default(10) }).optional())
      .query(({ input }) => getTopTraders(input?.limit)),
    institutionLeaderboard: adminProcedure
      .input(z.object({ limit: z.number().min(1).max(50).default(10) }).optional())
      .query(({ input }) => getInstitutionLeaderboard(input?.limit)),
    registrationTrend: adminProcedure
      .input(z.object({ days: z.number().min(1).max(90).default(14) }).optional())
      .query(({ input }) => getRegistrationTrend(input?.days)),
  }),

  // ─── Admin Logs ───────────────────────────────────────────────────────
  adminLogs: router({
    list: adminProcedure
      .input(z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(20),
        action: z.string().optional(),
        targetType: z.string().optional(),
        search: z.string().optional(),
      }))
      .query(({ input }) => getAdminLogs(input)),
  }),

  // ─── Export ───────────────────────────────────────────────────────────
  export: router({
    users: adminProcedure.query(() => getAllArenaUsersForExport()),
    competitions: adminProcedure.query(() => getAllCompetitionsForExport()),
    adminLogs: adminProcedure.query(() => getAllAdminLogsForExport()),
  }),
});

export type AppRouter = typeof appRouter;
