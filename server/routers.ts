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
  getSeasons,
} from "./db";
import * as arenaClient from "./arenaClient";

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

  // ─── Seasons ────────────────────────────────────────────────────────────
  seasons: router({
    list: adminProcedure.query(() => getSeasons()),

    create: adminProcedure
      .input(z.object({
        name: z.string().min(1).max(128),
        slug: z.string().min(1).max(32),
        startDate: z.number().positive(),
        endDate: z.number().positive(),
      }))
      .mutation(async ({ input, ctx }) => {
        const result = await arenaClient.createSeason(input);
        await createAdminLog({
          adminUserId: ctx.user.id,
          adminName: ctx.user.name || "Admin",
          action: "season_create",
          targetType: "season",
          targetId: String(result.id),
          description: `创建赛季「${input.name}」`,
          metadata: JSON.stringify(input),
        });
        return result;
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

    create: adminProcedure
      .input(z.object({
        seasonId: z.number().positive(),
        title: z.string().min(1).max(256),
        slug: z.string().min(1).max(64),
        description: z.string().optional(),
        competitionNumber: z.number().int().positive(),
        competitionType: z.enum(["regular", "grand_final", "special", "practice"]).default("regular"),
        maxParticipants: z.number().int().positive().default(50),
        minParticipants: z.number().int().positive().default(5),
        registrationOpenAt: z.number().positive().optional(),
        registrationCloseAt: z.number().positive().optional(),
        startTime: z.number().positive(),
        endTime: z.number().positive(),
        symbol: z.string().default("SOLUSDT"),
        startingCapital: z.number().positive().default(5000),
        maxTradesPerMatch: z.number().int().positive().default(40),
        closeOnlySeconds: z.number().int().nonnegative().default(1800),
        feeRate: z.number().nonnegative().default(0.0005),
        prizePool: z.number().nonnegative().default(500),
        requireMinSeasonPoints: z.number().int().nonnegative().default(0),
        requireMinTier: z.string().optional(),
        inviteOnly: z.boolean().default(false),
      }))
      .mutation(async ({ input, ctx }) => {
        const result = await arenaClient.createCompetition(input);
        await createAdminLog({
          adminUserId: ctx.user.id,
          adminName: ctx.user.name || "Admin",
          action: "competition_create",
          targetType: "competition",
          targetId: String(result.id),
          description: `创建比赛「${input.title}」`,
          metadata: JSON.stringify({ title: input.title, slug: input.slug, seasonId: input.seasonId }),
        });
        return result;
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number().positive(),
        data: z.object({
          title: z.string().min(1).max(256).optional(),
          slug: z.string().min(1).max(64).optional(),
          description: z.string().optional(),
          competitionType: z.enum(["regular", "grand_final", "special", "practice"]).optional(),
          maxParticipants: z.number().int().positive().optional(),
          minParticipants: z.number().int().positive().optional(),
          registrationOpenAt: z.number().positive().optional(),
          registrationCloseAt: z.number().positive().optional(),
          startTime: z.number().positive().optional(),
          endTime: z.number().positive().optional(),
          symbol: z.string().optional(),
          startingCapital: z.number().positive().optional(),
          maxTradesPerMatch: z.number().int().positive().optional(),
          closeOnlySeconds: z.number().int().nonnegative().optional(),
          feeRate: z.number().nonnegative().optional(),
          prizePool: z.number().nonnegative().optional(),
          requireMinSeasonPoints: z.number().int().nonnegative().optional(),
          requireMinTier: z.string().optional(),
          inviteOnly: z.boolean().optional(),
        }),
      }))
      .mutation(async ({ input, ctx }) => {
        const result = await arenaClient.updateCompetition(input.id, input.data);
        await createAdminLog({
          adminUserId: ctx.user.id,
          adminName: ctx.user.name || "Admin",
          action: "competition_update",
          targetType: "competition",
          targetId: String(input.id),
          description: `更新比赛 #${input.id}`,
          metadata: JSON.stringify(input.data),
        });
        return result;
      }),

    transition: adminProcedure
      .input(z.object({
        id: z.number().positive(),
        status: z.enum(["announced", "registration_open", "registration_closed", "live", "cancelled"]),
      }))
      .mutation(async ({ input, ctx }) => {
        const result = await arenaClient.transitionCompetition(input.id, input.status);
        await createAdminLog({
          adminUserId: ctx.user.id,
          adminName: ctx.user.name || "Admin",
          action: "competition_transition",
          targetType: "competition",
          targetId: String(input.id),
          description: `比赛 #${input.id} 状态变更为 ${input.status}`,
          metadata: JSON.stringify({ status: input.status }),
        });
        return result;
      }),

    duplicate: adminProcedure
      .input(z.object({ id: z.number().positive() }))
      .mutation(async ({ input, ctx }) => {
        const result = await arenaClient.duplicateCompetition(input.id);
        await createAdminLog({
          adminUserId: ctx.user.id,
          adminName: ctx.user.name || "Admin",
          action: "competition_duplicate",
          targetType: "competition",
          targetId: String(input.id),
          description: `复制比赛 #${input.id} → 新比赛 #${result.id}`,
        });
        return result;
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
