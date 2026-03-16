import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  getArenaUsers, getArenaUserDetail, banArenaUser, unbanArenaUser, deleteUserChatMessages,
  getCompetitions, getCompetitionRegistrations, updateRegistrationStatus,
  getChatMessages, moderateMessage, batchModerateMessages,
  getPlatformStats, getTierDistribution, getCompetitionTrends,
  getCountryDistribution, getTopTraders, getInstitutionLeaderboard, getRegistrationTrend,
  createAdminLog, getAdminLogs,
  getAllArenaUsersForExport, getAllCompetitionsForExport, getAllAdminLogsForExport,
  getSeasons, getSeasonById, getCompetitionById, getCompetitionsBySeasonId,
  createSeasonDirect, createCompetitionDirect, updateCompetitionDirect,
  archiveCompetition, archiveSeason,
  deleteCompetitionCascade, deleteSeasonCascade,
} from "./db";
import * as arenaClient from "./arenaClient";
import { storagePut } from "./storage";

const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ["announced", "cancelled"],
  announced: ["registration_open", "cancelled"],
  registration_open: ["registration_closed", "cancelled"],
  registration_closed: ["live", "cancelled"],
  live: ["ended_early"],
};

const USER_TIER_FILTERS = ["all", "iron", "bronze", "silver", "gold", "platinum", "diamond"] as const;
const USER_STATUS_FILTERS = ["all", "active", "banned"] as const;
const REGISTRATION_FILTER_STATUSES = ["all", "pending", "accepted", "rejected", "waitlisted", "withdrawn"] as const;
const REGISTRATION_UPDATE_STATUSES = ["pending", "accepted", "rejected", "waitlisted"] as const;
const CHAT_FILTER_STATUSES = ["all", "visible", "hidden", "deleted"] as const;
const CHAT_UPDATE_STATUSES = ["visible", "hidden", "deleted"] as const;

// NOTE: ensureArenaCompetition has been removed.
// Dashboard and Arena share the same database, so competitions created here
// are already visible to Arena. No need to create them via Arena API.
// For status transitions, we call Arena's transition endpoint directly
// using the local competition ID (which is the same as Arena's ID).

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
        const id = await createSeasonDirect(input);
        await createAdminLog({
          adminUserId: ctx.user.id,
          adminName: ctx.user.name || "Admin",
          action: "season_create",
          targetType: "season",
          targetId: String(id),
          description: `创建赛季「${input.name}」`,
          metadata: JSON.stringify(input),
        });
        return { id };
      }),

    archive: adminProcedure
      .input(z.object({ id: z.number().positive(), archived: z.boolean() }))
      .mutation(async ({ input, ctx }) => {
        const result = await archiveSeason(input.id, input.archived);
        if (result) {
          await createAdminLog({
            adminUserId: ctx.user.id,
            adminName: ctx.user.name || "Admin",
            action: input.archived ? "season_archive" : "season_unarchive",
            targetType: "season",
            targetId: String(input.id),
            description: `${input.archived ? "归档" : "取消归档"}赛季 #${input.id}`,
          });
        }
        return result;
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number().positive() }))
      .mutation(async ({ input, ctx }) => {
        // Validate: season must be archived
        const season = await getSeasonById(input.id);
        if (!season) throw new Error("赛季不存在");
        if (season.archived !== 1) throw new Error("赛季必须先归档才能删除");

        // Validate: all competitions under this season must be archived
        const comps = await getCompetitionsBySeasonId(input.id);
        const unarchivedComps = comps.filter(c => c.archived !== 1);
        if (unarchivedComps.length > 0) {
          throw new Error(`该赛季下还有 ${unarchivedComps.length} 场比赛未归档，请先归档所有比赛后再删除赛季`);
        }

        const stats = await deleteSeasonCascade(input.id);
        await createAdminLog({
          adminUserId: ctx.user.id,
          adminName: ctx.user.name || "Admin",
          action: "season_delete",
          targetType: "season",
          targetId: String(input.id),
          description: `永久删除赛季 #${input.id}（级联删除 ${stats.competitionsDeleted} 场比赛）`,
          metadata: JSON.stringify(stats),
        });
        return { success: true, ...stats };
      }),
  }),

  // ─── Arena Users ────────────────────────────────────────────────────────
  users: router({
    list: adminProcedure
      .input(z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(12),
        search: z.string().optional(),
        tier: z.enum(USER_TIER_FILTERS).optional(),
        status: z.enum(USER_STATUS_FILTERS).optional(),
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
          const deletedCount = await deleteUserChatMessages(input.id);
          await createAdminLog({
            adminUserId: ctx.user.id,
            adminName: ctx.user.name || "Admin",
            action: "user_ban",
            targetType: "user",
            targetId: String(input.id),
            description: `封禁用户 #${input.id}，清除 ${deletedCount} 条聊天记录`,
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
        status: z.enum(REGISTRATION_FILTER_STATUSES).optional(),
      }))
      .query(({ input }) => getCompetitionRegistrations(input.competitionId, input.status)),

    updateRegistration: adminProcedure
      .input(z.object({
        ids: z.array(z.number()),
        status: z.enum(REGISTRATION_UPDATE_STATUSES),
      }))
      .mutation(async ({ input, ctx }) => {
        // For accept/reject, use Arena API so user notifications are sent
        if ((input.status === "accepted" || input.status === "rejected") && input.ids.length > 0) {
          for (const regId of input.ids) {
            try {
              await arenaClient.reviewRegistration(regId, input.status);
            } catch (err) {
              console.error(`[updateRegistration] Arena review failed for #${regId}:`, err);
              // Fallback to direct DB write if Arena API fails
              await updateRegistrationStatus([regId], input.status, ctx.user.id);
            }
          }
        } else {
          // For pending/waitlisted, direct DB is fine (no user notification needed)
          await updateRegistrationStatus(input.ids, input.status, ctx.user.id);
        }
        await createAdminLog({
          adminUserId: ctx.user.id,
          adminName: ctx.user.name || "Admin",
          action: `registration_${input.status}`,
          targetType: "registration",
          targetId: input.ids.join(","),
          description: `将 ${input.ids.length} 个报名状态更新为 ${input.status}`,
          metadata: JSON.stringify({ ids: input.ids, status: input.status }),
        });
        return { success: true };
      }),

    create: adminProcedure
      .input(z.object({
        seasonId: z.number().positive(),
        title: z.string().min(1).max(256),
        slug: z.string().min(1).max(64),
        description: z.string().optional(),
        competitionNumber: z.number().int().positive(),
        competitionType: z.enum(["regular", "grand_final", "special", "practice"]).default("regular"),
        participantMode: z.enum(["human", "agent"]).default("human"),
        maxParticipants: z.number().int().positive().default(50),
        minParticipants: z.number().int().positive().default(5),
        registrationOpenAt: z.number().positive().optional(),
        registrationCloseAt: z.number().positive().optional(),
        startTime: z.number().positive(),
        endTime: z.number().positive(),
        symbol: z.string().regex(/^[A-Z]{2,10}(?:USDT|USDC)$/, "必须是有效的 Binance USDT/USDC 交易对").default("SOLUSDT"),
        startingCapital: z.number().positive().default(5000),
        maxTradesPerMatch: z.number().int().positive().default(40),
        closeOnlySeconds: z.number().int().nonnegative().default(1800),
        feeRate: z.number().nonnegative().default(0.0005),
        prizePool: z.number().nonnegative().default(500),
        requireMinSeasonPoints: z.number().int().nonnegative().default(0),
        requireMinTier: z.string().optional(),
        inviteOnly: z.boolean().default(false),
        coverImageUrl: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await createCompetitionDirect({
          ...input,
          createdBy: ctx.user.id,
        });

        // Dashboard and Arena share the same database.
        // No need to sync to Arena API — the competition is already visible to Arena.

        await createAdminLog({
          adminUserId: ctx.user.id,
          adminName: ctx.user.name || "Admin",
          action: "competition_create",
          targetType: "competition",
          targetId: String(id),
          description: `创建比赛「${input.title}」`,
          metadata: JSON.stringify({ title: input.title, slug: input.slug, seasonId: input.seasonId }),
        });
        return { id };
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number().positive(),
        data: z.object({
          title: z.string().min(1).max(256).optional(),
          slug: z.string().min(1).max(64).optional(),
          description: z.string().optional(),
          competitionType: z.enum(["regular", "grand_final", "special", "practice"]).optional(),
          participantMode: z.enum(["human", "agent"]).optional(),
          maxParticipants: z.number().int().positive().optional(),
          minParticipants: z.number().int().positive().optional(),
          registrationOpenAt: z.number().positive().optional(),
          registrationCloseAt: z.number().positive().optional(),
          startTime: z.number().positive().optional(),
          endTime: z.number().positive().optional(),
          symbol: z.string().regex(/^[A-Z]{2,10}(?:USDT|USDC)$/, "必须是有效的 Binance USDT/USDC 交易对").optional(),
          startingCapital: z.number().positive().optional(),
          maxTradesPerMatch: z.number().int().positive().optional(),
          closeOnlySeconds: z.number().int().nonnegative().optional(),
          feeRate: z.number().nonnegative().optional(),
          prizePool: z.number().nonnegative().optional(),
          requireMinSeasonPoints: z.number().int().nonnegative().optional(),
          requireMinTier: z.string().optional(),
          inviteOnly: z.boolean().optional(),
          coverImageUrl: z.string().optional(),
        }),
      }))
      .mutation(async ({ input, ctx }) => {
        await updateCompetitionDirect(input.id, input.data);

        // Dashboard and Arena share the same database.
        // No need to sync to Arena API — the update is already visible to Arena.

        await createAdminLog({
          adminUserId: ctx.user.id,
          adminName: ctx.user.name || "Admin",
          action: "competition_update",
          targetType: "competition",
          targetId: String(input.id),
          description: `更新比赛 #${input.id}`,
          metadata: JSON.stringify(input.data),
        });
        return { ok: true };
      }),

    transition: adminProcedure
      .input(z.object({
        id: z.number().positive(),
        status: z.enum(["announced", "registration_open", "registration_closed", "live", "ended_early", "cancelled"]),
      }))
      .mutation(async ({ input, ctx }) => {
        // Server-side state machine validation
        const comp = await getCompetitionById(input.id);
        if (!comp) throw new Error("比赛不存在");
        const allowed = VALID_TRANSITIONS[comp.status];
        if (!allowed || !allowed.includes(input.status)) {
          throw new Error(`无法从「${comp.status}」转换到「${input.status}」`);
        }

        // Dashboard and Arena share the same database.
        // Start/end transitions must go through Arena so engine-side logic runs.
        const arenaTransitionStatuses = ["announced", "registration_open", "registration_closed", "live", "ended_early", "cancelled"];
        const noFallbackStatuses = new Set(["live", "ended_early"]);
        if (arenaTransitionStatuses.includes(input.status)) {
          try {
            await arenaClient.transitionCompetition(input.id, input.status);
          } catch (err) {
            if (noFallbackStatuses.has(input.status)) {
              throw new Error(`Arena API 状态转换失败: ${(err as Error).message}`);
            }
            console.error(`[transition] Arena API failed for ${input.status}, falling back to direct DB:`, err);
            await updateCompetitionDirect(input.id, { status: input.status });
          }
        }

        // Re-read actual status from DB — Arena may have changed it
        // (e.g., auto-cancel if accepted registrations < minParticipants)
        const actual = await getCompetitionById(input.id);
        const actualStatus = actual?.status || input.status;

        await createAdminLog({
          adminUserId: ctx.user.id,
          adminName: ctx.user.name || "Admin",
          action: "competition_transition",
          targetType: "competition",
          targetId: String(input.id),
          description: actualStatus !== input.status
            ? `比赛 #${input.id} 请求变更为 ${input.status}，Arena 实际设为 ${actualStatus}`
            : `比赛 #${input.id} 状态变更为 ${actualStatus}`,
          metadata: JSON.stringify({ requested: input.status, actual: actualStatus }),
        });

        if (actualStatus !== input.status) {
          throw new Error(
            `Arena 未接受状态变更为「${input.status}」，实际状态为「${actualStatus}」。` +
            (actualStatus === "cancelled" ? "请检查是否有足够的「已通过」报名（非 pending 状态）。" : "")
          );
        }
        return { ok: true };
      }),

    duplicate: adminProcedure
      .input(z.object({ id: z.number().positive() }))
      .mutation(async ({ input, ctx }) => {
        const source = await getCompetitionById(input.id);
        if (!source) throw new Error("比赛不存在");

        // Create local DB copy directly (shared DB, no need for Arena API)
        const newLocalId = await createCompetitionDirect({
          seasonId: source.seasonId,
          title: `${source.title} (副本)`,
          slug: `${source.slug}-copy-${Date.now()}`,
          description: source.description ?? undefined,
          competitionNumber: source.competitionNumber,
          competitionType: source.competitionType,
          participantMode: source.participantMode,
          maxParticipants: source.maxParticipants,
          minParticipants: source.minParticipants,
          registrationOpenAt: source.registrationOpenAt ?? undefined,
          registrationCloseAt: source.registrationCloseAt ?? undefined,
          startTime: source.startTime,
          endTime: source.endTime,
          symbol: source.symbol,
          startingCapital: source.startingCapital,
          maxTradesPerMatch: source.maxTradesPerMatch,
          closeOnlySeconds: source.closeOnlySeconds,
          feeRate: source.feeRate,
          prizePool: source.prizePool,
          requireMinSeasonPoints: source.requireMinSeasonPoints,
          requireMinTier: source.requireMinTier ?? undefined,
          inviteOnly: source.inviteOnly === 1,
          createdBy: ctx.user.id,
        });

        await createAdminLog({
          adminUserId: ctx.user.id,
          adminName: ctx.user.name || "Admin",
          action: "competition_duplicate",
          targetType: "competition",
          targetId: String(input.id),
          description: `复制比赛 #${input.id} → 新比赛 #${newLocalId}`,
        });
        return { id: newLocalId };
      }),

    uploadCover: adminProcedure
      .input(z.object({
        competitionId: z.number().positive(),
        base64: z.string().min(1),
        mimeType: z.string().regex(/^image\/(jpeg|png|webp|gif)$/),
      }))
      .mutation(async ({ input, ctx }) => {
        const ext = input.mimeType.split("/")[1] ?? "png";
        const key = `competitions/covers/${input.competitionId}-${Date.now()}.${ext}`;
        const buf = Buffer.from(input.base64, "base64");
        const { url } = await storagePut(key, buf, input.mimeType);
        await updateCompetitionDirect(input.competitionId, { coverImageUrl: url });
        await createAdminLog({
          adminUserId: ctx.user.id,
          adminName: ctx.user.name || "Admin",
          action: "competition_update",
          targetType: "competition",
          targetId: String(input.competitionId),
          description: `上传比赛 #${input.competitionId} 封面图`,
        });
        return { url };
      }),

    archive: adminProcedure
      .input(z.object({ id: z.number().positive(), archived: z.boolean() }))
      .mutation(async ({ input, ctx }) => {
        const result = await archiveCompetition(input.id, input.archived);
        if (result.success) {
          await createAdminLog({
            adminUserId: ctx.user.id,
            adminName: ctx.user.name || "Admin",
            action: input.archived ? "competition_archive" : "competition_unarchive",
            targetType: "competition",
            targetId: String(input.id),
            description: result.purged
              ? `归档并清理比赛 #${input.id}`
              : `${input.archived ? "归档" : "取消归档"}比赛 #${input.id}`,
            metadata: JSON.stringify({
              archived: input.archived,
              purged: result.purged,
              stats: result.stats ?? null,
            }),
          });
        }
        return result;
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number().positive() }))
      .mutation(async ({ input, ctx }) => {
        // Validate: competition must be archived
        const comp = await getCompetitionById(input.id);
        if (!comp) throw new Error("比赛不存在");
        if (comp.archived !== 1) throw new Error("比赛必须先归档才能删除");

        const stats = await deleteCompetitionCascade(input.id);
        await createAdminLog({
          adminUserId: ctx.user.id,
          adminName: ctx.user.name || "Admin",
          action: "competition_delete",
          targetType: "competition",
          targetId: String(input.id),
          description: `永久删除比赛 #${input.id}（报名 ${stats.registrations}、结果 ${stats.matchResultRows}、仓位 ${stats.positionRows}、预测 ${stats.predictionRows}、交易 ${stats.tradeRows}、通知 ${stats.notificationRows}、成就 ${stats.achievementRows}、聊天 ${stats.chatRows}、场次 ${stats.matchRows} 条）`,
          metadata: JSON.stringify(stats),
        });
        return { success: true, ...stats };
      }),
  }),

  // ─── Chat Messages ────────────────────────────────────────────────────
  chat: router({
    list: adminProcedure
      .input(z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(15),
        competitionId: z.number().optional(),
        status: z.enum(CHAT_FILTER_STATUSES).optional(),
        search: z.string().optional(),
      }))
      .query(({ input }) => getChatMessages(input)),

    moderate: adminProcedure
      .input(z.object({
        messageId: z.string(),
        status: z.enum(CHAT_UPDATE_STATUSES),
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
        status: z.enum(CHAT_UPDATE_STATUSES),
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
