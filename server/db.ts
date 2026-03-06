import { eq, and, like, or, desc, asc, sql, count, inArray, SQL } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, arenaAccounts, userProfiles, competitions, competitionRegistrations, matchResults, chatMessages, chatModeration, trades, seasons, institutions, behaviorEvents, adminLogs } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (_db) return _db;
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }
  _db = drizzle(process.env.DATABASE_URL);
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Seasons ────────────────────────────────────────────────────────────────

export async function getSeasons() {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select({
      id: seasons.id,
      name: seasons.name,
      slug: seasons.slug,
      status: seasons.status,
      startDate: seasons.startDate,
      endDate: seasons.endDate,
      pointsDecayFactor: seasons.pointsDecayFactor,
      archived: seasons.archived,
      createdAt: seasons.createdAt,
    })
    .from(seasons)
    .orderBy(desc(seasons.startDate));

  // Enrich with competition counts
  const compCounts = await db
    .select({
      seasonId: competitions.seasonId,
      total: count(),
      completed: sql<number>`SUM(CASE WHEN ${competitions.status} = 'completed' THEN 1 ELSE 0 END)`,
      unarchived: sql<number>`SUM(CASE WHEN ${competitions.archived} = 0 THEN 1 ELSE 0 END)`,
    })
    .from(competitions)
    .groupBy(competitions.seasonId);

  const countMap = new Map(compCounts.map(c => [c.seasonId, c]));

  return rows.map(s => ({
    ...s,
    competitionCount: countMap.get(s.id)?.total ?? 0,
    completedCount: countMap.get(s.id)?.completed ?? 0,
    unarchivedCompCount: countMap.get(s.id)?.unarchived ?? 0,
  }));
}

export async function getSeasonById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db.select().from(seasons).where(eq(seasons.id, id)).limit(1);
  return row ?? null;
}

export async function getCompetitionById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db.select().from(competitions).where(eq(competitions.id, id)).limit(1);
  return row ?? null;
}

export async function getCompetitionsBySeasonId(seasonId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ id: competitions.id, archived: competitions.archived }).from(competitions).where(eq(competitions.seasonId, seasonId));
}

// ─── Arena Users ────────────────────────────────────────────────────────────

export async function getArenaUsers(opts: {
  page: number;
  pageSize: number;
  search?: string;
  tier?: string;
  status?: string; // "active" | "banned"
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}) {
  const db = await getDb();
  if (!db) return { users: [], total: 0 };

  const { page, pageSize, search, tier, status, sortBy = "createdAt", sortOrder = "desc" } = opts;
  const offset = (page - 1) * pageSize;

  // Build conditions
  const conditions: SQL[] = [];
  if (search) {
    conditions.push(
      or(
        like(arenaAccounts.username, `%${search}%`),
        like(userProfiles.country, `%${search}%`),
        like(userProfiles.city, `%${search}%`),
        like(userProfiles.institutionName, `%${search}%`)
      )!
    );
  }
  if (tier && tier !== "all") {
    // Tier is computed from seasonPoints, filter after query
  }
  if (status === "banned") {
    conditions.push(eq(arenaAccounts.role, "banned"));
  } else if (status === "active") {
    conditions.push(sql`${arenaAccounts.role} != 'banned'`);
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Get total count
  const countResult = await db
    .select({ total: count() })
    .from(arenaAccounts)
    .leftJoin(userProfiles, eq(arenaAccounts.id, userProfiles.arenaAccountId))
    .where(whereClause);
  const total = countResult[0]?.total ?? 0;

  // Get paginated results
  let orderClause;
  switch (sortBy) {
    case "username": orderClause = sortOrder === "asc" ? asc(arenaAccounts.username) : desc(arenaAccounts.username); break;
    case "seasonPoints": orderClause = sortOrder === "asc" ? asc(arenaAccounts.seasonPoints) : desc(arenaAccounts.seasonPoints); break;
    case "capital": orderClause = sortOrder === "asc" ? asc(arenaAccounts.capital) : desc(arenaAccounts.capital); break;
    case "createdAt": orderClause = sortOrder === "asc" ? asc(arenaAccounts.createdAt) : desc(arenaAccounts.createdAt); break;
    default: orderClause = desc(arenaAccounts.createdAt);
  }

  const rows = await db
    .select({
      id: arenaAccounts.id,
      userId: arenaAccounts.userId,
      username: arenaAccounts.username,
      inviteCode: arenaAccounts.inviteCode,
      role: arenaAccounts.role,
      capital: arenaAccounts.capital,
      seasonPoints: arenaAccounts.seasonPoints,
      createdAt: arenaAccounts.createdAt,
      updatedAt: arenaAccounts.updatedAt,
      // Profile fields
      displayName: userProfiles.displayName,
      country: userProfiles.country,
      region: userProfiles.region,
      city: userProfiles.city,
      institutionName: userProfiles.institutionName,
      department: userProfiles.department,
      graduationYear: userProfiles.graduationYear,
      participantType: userProfiles.participantType,
      bio: userProfiles.bio,
      isProfilePublic: userProfiles.isProfilePublic,
    })
    .from(arenaAccounts)
    .leftJoin(userProfiles, eq(arenaAccounts.id, userProfiles.arenaAccountId))
    .where(whereClause)
    .orderBy(orderClause)
    .limit(pageSize)
    .offset(offset);

  return { users: rows, total };
}

export async function getArenaUserDetail(arenaAccountId: number) {
  const db = await getDb();
  if (!db) return null;

  const [account] = await db
    .select()
    .from(arenaAccounts)
    .where(eq(arenaAccounts.id, arenaAccountId))
    .limit(1);
  if (!account) return null;

  const [profile] = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.arenaAccountId, arenaAccountId))
    .limit(1);

  // Get match results for this user
  const results = await db
    .select({
      id: matchResults.id,
      competitionId: matchResults.competitionId,
      finalRank: matchResults.finalRank,
      totalPnl: matchResults.totalPnl,
      totalPnlPct: matchResults.totalPnlPct,
      tradesCount: matchResults.tradesCount,
      winCount: matchResults.winCount,
      lossCount: matchResults.lossCount,
      pointsEarned: matchResults.pointsEarned,
      prizeWon: matchResults.prizeWon,
      finalEquity: matchResults.finalEquity,
      createdAt: matchResults.createdAt,
      competitionTitle: competitions.title,
    })
    .from(matchResults)
    .leftJoin(competitions, eq(matchResults.competitionId, competitions.id))
    .where(eq(matchResults.arenaAccountId, arenaAccountId))
    .orderBy(desc(matchResults.createdAt));

  // Get registration history
  const registrations = await db
    .select({
      id: competitionRegistrations.id,
      competitionId: competitionRegistrations.competitionId,
      status: competitionRegistrations.status,
      appliedAt: competitionRegistrations.appliedAt,
      competitionTitle: competitions.title,
    })
    .from(competitionRegistrations)
    .leftJoin(competitions, eq(competitionRegistrations.competitionId, competitions.id))
    .where(eq(competitionRegistrations.arenaAccountId, arenaAccountId))
    .orderBy(desc(competitionRegistrations.appliedAt));

  // Get behavior events for IP info
  const ipEvents = await db
    .select({
      payload: behaviorEvents.payload,
      timestamp: behaviorEvents.timestamp,
    })
    .from(behaviorEvents)
    .where(
      and(
        eq(behaviorEvents.arenaAccountId, arenaAccountId),
        eq(behaviorEvents.eventType, "login")
      )
    )
    .orderBy(desc(behaviorEvents.timestamp))
    .limit(5);

  // Compute stats
  const totalMatches = results.length;
  const totalWins = results.reduce((s, r) => s + r.winCount, 0);
  const totalLosses = results.reduce((s, r) => s + r.lossCount, 0);
  const totalTrades = results.reduce((s, r) => s + r.tradesCount, 0);
  const winRate = totalTrades > 0 ? Math.round((totalWins / (totalWins + totalLosses)) * 1000) / 10 : 0;
  const totalPnl = results.reduce((s, r) => s + r.totalPnl, 0);
  const totalPrize = results.reduce((s, r) => s + r.prizeWon, 0);
  const bestRank = results.length > 0 ? Math.min(...results.map(r => r.finalRank)) : 0;

  return {
    account,
    profile: profile || null,
    matchResults: results,
    registrations,
    ipEvents,
    stats: { totalMatches, totalWins, totalLosses, totalTrades, winRate, totalPnl, totalPrize, bestRank },
  };
}

export async function banArenaUser(arenaAccountId: number) {
  const db = await getDb();
  if (!db) return false;
  await db.update(arenaAccounts).set({ role: "banned", updatedAt: Date.now() }).where(eq(arenaAccounts.id, arenaAccountId));
  return true;
}

export async function deleteUserChatMessages(arenaAccountId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  // 查出该用户所有消息ID
  const msgs = await db.select({ id: chatMessages.id })
    .from(chatMessages)
    .where(eq(chatMessages.arenaAccountId, arenaAccountId));

  if (msgs.length === 0) return 0;

  const msgIds = msgs.map(m => m.id);

  // 删除关联的审核记录
  await db.delete(chatModeration).where(inArray(chatModeration.chatMessageId, msgIds));
  // 删除聊天消息
  await db.delete(chatMessages).where(eq(chatMessages.arenaAccountId, arenaAccountId));

  return msgs.length;
}

export async function unbanArenaUser(arenaAccountId: number) {
  const db = await getDb();
  if (!db) return false;
  await db.update(arenaAccounts).set({ role: "user", updatedAt: Date.now() }).where(eq(arenaAccounts.id, arenaAccountId));
  return true;
}

// ─── Seasons (Direct DB Write) ──────────────────────────────────────────────

export async function createSeasonDirect(input: {
  name: string;
  slug: string;
  startDate: number;
  endDate: number;
  pointsDecayFactor?: number;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const now = Date.now();
  const result = await db.insert(seasons).values({
    name: input.name,
    slug: input.slug,
    status: "active",
    startDate: input.startDate,
    endDate: input.endDate,
    pointsDecayFactor: input.pointsDecayFactor ?? 0.8,
    createdAt: now,
  });
  return Number(result[0].insertId);
}

// ─── Competitions (Direct DB Write) ─────────────────────────────────────────

export async function createCompetitionDirect(input: {
  seasonId: number;
  title: string;
  slug: string;
  description?: string;
  competitionNumber: number;
  competitionType?: string;
  maxParticipants?: number;
  minParticipants?: number;
  registrationOpenAt?: number;
  registrationCloseAt?: number;
  startTime: number;
  endTime: number;
  symbol?: string;
  startingCapital?: number;
  maxTradesPerMatch?: number;
  closeOnlySeconds?: number;
  feeRate?: number;
  prizePool?: number;
  requireMinSeasonPoints?: number;
  requireMinTier?: string;
  inviteOnly?: boolean;
  createdBy?: number;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const now = Date.now();
  // Explicitly set all fields to avoid Drizzle generating `default` keyword
  // which causes issues with mysql2 prepared statements
  const result = await db.insert(competitions).values({
    seasonId: input.seasonId,
    title: input.title,
    slug: input.slug,
    description: input.description ?? null,
    competitionNumber: input.competitionNumber,
    competitionType: input.competitionType ?? "regular",
    status: "draft",
    matchId: null,
    maxParticipants: input.maxParticipants ?? 50,
    minParticipants: input.minParticipants ?? 5,
    registrationOpenAt: input.registrationOpenAt ?? null,
    registrationCloseAt: input.registrationCloseAt ?? null,
    startTime: input.startTime,
    endTime: input.endTime,
    symbol: input.symbol ?? "SOLUSDT",
    startingCapital: input.startingCapital ?? 5000,
    maxTradesPerMatch: input.maxTradesPerMatch ?? 40,
    closeOnlySeconds: input.closeOnlySeconds ?? 1800,
    feeRate: input.feeRate ?? 0.0005,
    prizePool: input.prizePool ?? 500,
    prizeTableJson: null,
    pointsTableJson: null,
    requireMinSeasonPoints: input.requireMinSeasonPoints ?? 0,
    requireMinTier: input.requireMinTier ?? null,
    inviteOnly: input.inviteOnly ? 1 : 0,
    createdBy: input.createdBy ?? null,
    archived: 0,
    createdAt: now,
    updatedAt: now,
  });
  return Number(result[0].insertId);
}

export async function updateCompetitionDirect(
  id: number,
  updates: Record<string, unknown>,
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Clean undefined values → null, and handle inviteOnly boolean → int
  const cleanUpdates: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(updates)) {
    if (val === undefined) continue;
    if (key === "inviteOnly") {
      cleanUpdates[key] = val ? 1 : 0;
    } else {
      cleanUpdates[key] = val;
    }
  }
  cleanUpdates.updatedAt = Date.now();

  await db
    .update(competitions)
    .set(cleanUpdates)
    .where(eq(competitions.id, id));
}

// ─── Competitions (Read) ────────────────────────────────────────────────────

export async function getCompetitions() {
  const db = await getDb();
  if (!db) return [];

  const comps = await db
    .select({
      id: competitions.id,
      seasonId: competitions.seasonId,
      title: competitions.title,
      slug: competitions.slug,
      description: competitions.description,
      competitionNumber: competitions.competitionNumber,
      competitionType: competitions.competitionType,
      status: competitions.status,
      maxParticipants: competitions.maxParticipants,
      startTime: competitions.startTime,
      endTime: competitions.endTime,
      registrationOpenAt: competitions.registrationOpenAt,
      registrationCloseAt: competitions.registrationCloseAt,
      symbol: competitions.symbol,
      startingCapital: competitions.startingCapital,
      prizePool: competitions.prizePool,
      archived: competitions.archived,
      createdAt: competitions.createdAt,
    })
    .from(competitions)
    .orderBy(desc(competitions.startTime));

  // Get registration counts for each competition
  const regCounts = await db
    .select({
      competitionId: competitionRegistrations.competitionId,
      total: count(),
      accepted: sql<number>`SUM(CASE WHEN ${competitionRegistrations.status} = 'accepted' THEN 1 ELSE 0 END)`,
      pending: sql<number>`SUM(CASE WHEN ${competitionRegistrations.status} = 'pending' THEN 1 ELSE 0 END)`,
    })
    .from(competitionRegistrations)
    .groupBy(competitionRegistrations.competitionId);

  const regMap = new Map(regCounts.map(r => [r.competitionId, r]));

  return comps.map(c => ({
    ...c,
    registeredCount: regMap.get(c.id)?.total ?? 0,
    acceptedCount: regMap.get(c.id)?.accepted ?? 0,
    pendingCount: regMap.get(c.id)?.pending ?? 0,
  }));
}

export async function getCompetitionRegistrations(competitionId: number, statusFilter?: string) {
  const db = await getDb();
  if (!db) return [];

  const conditions: SQL[] = [eq(competitionRegistrations.competitionId, competitionId)];
  if (statusFilter && statusFilter !== "all") {
    conditions.push(eq(competitionRegistrations.status, statusFilter));
  }

  return db
    .select({
      id: competitionRegistrations.id,
      competitionId: competitionRegistrations.competitionId,
      arenaAccountId: competitionRegistrations.arenaAccountId,
      status: competitionRegistrations.status,
      appliedAt: competitionRegistrations.appliedAt,
      reviewedAt: competitionRegistrations.reviewedAt,
      adminNote: competitionRegistrations.adminNote,
      // Account info
      username: arenaAccounts.username,
      seasonPoints: arenaAccounts.seasonPoints,
      capital: arenaAccounts.capital,
      // Profile info
      country: userProfiles.country,
      institutionName: userProfiles.institutionName,
      participantType: userProfiles.participantType,
    })
    .from(competitionRegistrations)
    .leftJoin(arenaAccounts, eq(competitionRegistrations.arenaAccountId, arenaAccounts.id))
    .leftJoin(userProfiles, eq(competitionRegistrations.arenaAccountId, userProfiles.arenaAccountId))
    .where(and(...conditions))
    .orderBy(desc(competitionRegistrations.appliedAt));
}

export async function updateRegistrationStatus(ids: number[], status: string, reviewedBy: number) {
  const db = await getDb();
  if (!db) return false;
  await db
    .update(competitionRegistrations)
    .set({ status, reviewedAt: Date.now(), reviewedBy })
    .where(inArray(competitionRegistrations.id, ids));
  return true;
}

// ─── Chat Messages ──────────────────────────────────────────────────────────

export async function getChatMessages(opts: {
  page: number;
  pageSize: number;
  competitionId?: number;
  status?: string; // "all" | "visible" | "hidden" | "deleted"
  search?: string;
}) {
  const db = await getDb();
  if (!db) return { messages: [], total: 0 };

  const { page, pageSize, competitionId, status, search } = opts;
  const offset = (page - 1) * pageSize;

  const conditions: SQL[] = [];
  if (competitionId) {
    conditions.push(eq(chatMessages.competitionId, competitionId));
  }
  if (search) {
    conditions.push(
      or(
        like(chatMessages.message, `%${search}%`),
        like(chatMessages.username, `%${search}%`)
      )!
    );
  }
  if (status && status !== "all") {
    conditions.push(eq(chatModeration.status, status));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const countResult = await db
    .select({ total: count() })
    .from(chatMessages)
    .leftJoin(chatModeration, eq(chatMessages.id, chatModeration.chatMessageId))
    .where(whereClause);
  const total = countResult[0]?.total ?? 0;

  const rows = await db
    .select({
      id: chatMessages.id,
      arenaAccountId: chatMessages.arenaAccountId,
      competitionId: chatMessages.competitionId,
      username: chatMessages.username,
      message: chatMessages.message,
      type: chatMessages.type,
      timestamp: chatMessages.timestamp,
      // Moderation
      moderationStatus: chatModeration.status,
      moderatedBy: chatModeration.moderatedByName,
      moderatedAt: chatModeration.moderatedAt,
    })
    .from(chatMessages)
    .leftJoin(chatModeration, eq(chatMessages.id, chatModeration.chatMessageId))
    .where(whereClause)
    .orderBy(desc(chatMessages.timestamp))
    .limit(pageSize)
    .offset(offset);

  // Get competition titles
  const compIds = Array.from(new Set(rows.filter(r => r.competitionId).map(r => r.competitionId!)));
  let compMap = new Map<number, string>();
  if (compIds.length > 0) {
    const comps = await db
      .select({ id: competitions.id, title: competitions.title })
      .from(competitions)
      .where(inArray(competitions.id, compIds));
    compMap = new Map(comps.map(c => [c.id, c.title]));
  }

  const messages = rows.map(r => ({
    ...r,
    competitionTitle: r.competitionId ? compMap.get(r.competitionId) || `Competition #${r.competitionId}` : "General",
    moderationStatus: r.moderationStatus || "visible",
  }));

  return { messages, total };
}

export async function moderateMessage(messageId: string, status: string, moderatedBy: number, moderatedByName: string) {
  const db = await getDb();
  if (!db) return false;

  // Upsert moderation record
  await db
    .insert(chatModeration)
    .values({
      chatMessageId: messageId,
      status,
      moderatedBy,
      moderatedByName,
      moderatedAt: Date.now(),
    })
    .onDuplicateKeyUpdate({
      set: { status, moderatedBy, moderatedByName, moderatedAt: Date.now() },
    });
  return true;
}

export async function batchModerateMessages(messageIds: string[], status: string, moderatedBy: number, moderatedByName: string) {
  const db = await getDb();
  if (!db) return false;

  for (const id of messageIds) {
    await moderateMessage(id, status, moderatedBy, moderatedByName);
  }
  return true;
}

// ─── Statistics ─────────────────────────────────────────────────────────────

export async function getPlatformStats() {
  const db = await getDb();
  if (!db) return null;

  const [userCount] = await db.select({ total: count() }).from(arenaAccounts);
  const [compCount] = await db.select({ total: count() }).from(competitions);
  const [tradeCount] = await db.select({ total: count() }).from(trades);
  const [msgCount] = await db.select({ total: count() }).from(chatMessages);

  // Total prize paid
  const [prizeSum] = await db
    .select({ total: sql<number>`COALESCE(SUM(${matchResults.prizeWon}), 0)` })
    .from(matchResults);

  // Pending registrations
  const [pendingRegs] = await db
    .select({ total: count() })
    .from(competitionRegistrations)
    .where(eq(competitionRegistrations.status, "pending"));

  // Average win rate
  const allResults = await db
    .select({
      winCount: matchResults.winCount,
      lossCount: matchResults.lossCount,
    })
    .from(matchResults);
  const totalWins = allResults.reduce((s, r) => s + r.winCount, 0);
  const totalLosses = allResults.reduce((s, r) => s + r.lossCount, 0);
  const avgWinRate = (totalWins + totalLosses) > 0 ? Math.round((totalWins / (totalWins + totalLosses)) * 1000) / 10 : 0;

  return {
    totalUsers: userCount?.total ?? 0,
    totalCompetitions: compCount?.total ?? 0,
    totalTrades: tradeCount?.total ?? 0,
    totalMessages: msgCount?.total ?? 0,
    totalPrize: prizeSum?.total ?? 0,
    pendingRegistrations: pendingRegs?.total ?? 0,
    avgWinRate,
  };
}

export async function getTierDistribution() {
  const db = await getDb();
  if (!db) return [];

  const allAccounts = await db
    .select({ seasonPoints: arenaAccounts.seasonPoints })
    .from(arenaAccounts);

  // Compute tiers based on season points (must match TA/server/constants.ts RANK_TIERS)
  const tiers = { iron: 0, bronze: 0, silver: 0, gold: 0, platinum: 0, diamond: 0 };
  for (const a of allAccounts) {
    const pts = a.seasonPoints;
    if (pts >= 1500) tiers.diamond++;
    else if (pts >= 1000) tiers.platinum++;
    else if (pts >= 600) tiers.gold++;
    else if (pts >= 300) tiers.silver++;
    else if (pts >= 100) tiers.bronze++;
    else tiers.iron++;
  }

  return Object.entries(tiers).map(([tier, count]) => ({ tier, count }));
}

export async function getCompetitionTrends() {
  const db = await getDb();
  if (!db) return [];

  const comps = await db
    .select({
      id: competitions.id,
      title: competitions.title,
      competitionNumber: competitions.competitionNumber,
      startTime: competitions.startTime,
      status: competitions.status,
    })
    .from(competitions)
    .where(sql`${competitions.status} IN ('completed', 'live', 'settling')`)
    .orderBy(asc(competitions.competitionNumber));

  const result = [];
  for (const c of comps) {
    const [regCount] = await db
      .select({ total: count() })
      .from(competitionRegistrations)
      .where(and(
        eq(competitionRegistrations.competitionId, c.id),
        eq(competitionRegistrations.status, "accepted")
      ));

    const [avgPnl] = await db
      .select({ avg: sql<number>`COALESCE(AVG(${matchResults.totalPnlPct}), 0)` })
      .from(matchResults)
      .where(eq(matchResults.competitionId, c.id));

    result.push({
      competitionNumber: c.competitionNumber,
      title: c.title,
      participants: regCount?.total ?? 0,
      avgPnlPct: Math.round((avgPnl?.avg ?? 0) * 100) / 100,
    });
  }

  return result;
}

export async function getCountryDistribution() {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select({
      country: userProfiles.country,
      count: count(),
    })
    .from(userProfiles)
    .where(sql`${userProfiles.country} IS NOT NULL AND ${userProfiles.country} != ''`)
    .groupBy(userProfiles.country)
    .orderBy(desc(count()));

  return rows;
}

export async function getTopTraders(limit = 10) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      id: arenaAccounts.id,
      username: arenaAccounts.username,
      seasonPoints: arenaAccounts.seasonPoints,
      country: userProfiles.country,
    })
    .from(arenaAccounts)
    .leftJoin(userProfiles, eq(arenaAccounts.id, userProfiles.arenaAccountId))
    .orderBy(desc(arenaAccounts.seasonPoints))
    .limit(limit);
}

export async function getInstitutionLeaderboard(limit = 10) {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select({
      institutionName: userProfiles.institutionName,
      memberCount: count(),
    })
    .from(userProfiles)
    .where(sql`${userProfiles.institutionName} IS NOT NULL AND ${userProfiles.institutionName} != ''`)
    .groupBy(userProfiles.institutionName)
    .orderBy(desc(count()))
    .limit(limit);

  return rows;
}

export async function getRegistrationTrend(days = 14) {
  const db = await getDb();
  if (!db) return [];

  const since = Date.now() - days * 86400000;
  const rows = await db
    .select({
      createdAt: arenaAccounts.createdAt,
    })
    .from(arenaAccounts)
    .where(sql`${arenaAccounts.createdAt} > ${since}`)
    .orderBy(asc(arenaAccounts.createdAt));

  // Group by day
  const dayMap = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const key = `${d.getMonth() + 1}月${d.getDate()}日`;
    dayMap.set(key, 0);
  }

  for (const r of rows) {
    const d = new Date(r.createdAt);
    const key = `${d.getMonth() + 1}月${d.getDate()}日`;
    dayMap.set(key, (dayMap.get(key) || 0) + 1);
  }

  return Array.from(dayMap.entries()).map(([date, count]) => ({ date, count }));
}

// ─── Admin Logs ─────────────────────────────────────────────────────────────

export async function createAdminLog(log: {
  adminUserId: number;
  adminName: string;
  action: string;
  targetType: string;
  targetId: string;
  description: string;
  metadata?: string;
  ipAddress?: string;
}) {
  const db = await getDb();
  if (!db) return;

  await db.insert(adminLogs).values({
    ...log,
    createdAt: Date.now(),
  });
}

export async function getAdminLogs(opts: {
  page: number;
  pageSize: number;
  action?: string;
  targetType?: string;
  search?: string;
}) {
  const db = await getDb();
  if (!db) return { logs: [], total: 0 };

  const { page, pageSize, action, targetType, search } = opts;
  const offset = (page - 1) * pageSize;

  const conditions: SQL[] = [];
  if (action && action !== "all") {
    conditions.push(eq(adminLogs.action, action));
  }
  if (targetType && targetType !== "all") {
    conditions.push(eq(adminLogs.targetType, targetType));
  }
  if (search) {
    conditions.push(
      or(
        like(adminLogs.description, `%${search}%`),
        like(adminLogs.adminName, `%${search}%`),
        like(adminLogs.targetId, `%${search}%`)
      )!
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [countResult] = await db.select({ total: count() }).from(adminLogs).where(whereClause);
  const total = countResult?.total ?? 0;

  const logs = await db
    .select()
    .from(adminLogs)
    .where(whereClause)
    .orderBy(desc(adminLogs.createdAt))
    .limit(pageSize)
    .offset(offset);

  return { logs, total };
}

// ─── Export Helpers ──────────────────────────────────────────────────────────

export async function getAllArenaUsersForExport() {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      id: arenaAccounts.id,
      username: arenaAccounts.username,
      role: arenaAccounts.role,
      capital: arenaAccounts.capital,
      seasonPoints: arenaAccounts.seasonPoints,
      createdAt: arenaAccounts.createdAt,
      country: userProfiles.country,
      city: userProfiles.city,
      institutionName: userProfiles.institutionName,
      participantType: userProfiles.participantType,
    })
    .from(arenaAccounts)
    .leftJoin(userProfiles, eq(arenaAccounts.id, userProfiles.arenaAccountId))
    .orderBy(desc(arenaAccounts.seasonPoints))
    .limit(10000);
}

export async function getAllCompetitionsForExport() {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      id: competitions.id,
      title: competitions.title,
      competitionType: competitions.competitionType,
      status: competitions.status,
      archived: competitions.archived,
      maxParticipants: competitions.maxParticipants,
      startTime: competitions.startTime,
      endTime: competitions.endTime,
      symbol: competitions.symbol,
      prizePool: competitions.prizePool,
    })
    .from(competitions)
    .orderBy(desc(competitions.startTime))
    .limit(10000);
}

export async function getAllAdminLogsForExport() {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(adminLogs)
    .orderBy(desc(adminLogs.createdAt))
    .limit(10000);
}

// ─── Archive ─────────────────────────────────────────────────────────────────

export async function archiveCompetition(id: number, archived: boolean) {
  const db = await getDb();
  if (!db) return false;
  await db.update(competitions).set({ archived: archived ? 1 : 0, updatedAt: Date.now() }).where(eq(competitions.id, id));
  return true;
}

export async function archiveSeason(id: number, archived: boolean) {
  const db = await getDb();
  if (!db) return false;
  await db.update(seasons).set({ archived: archived ? 1 : 0 }).where(eq(seasons.id, id));
  return true;
}

// ─── Permanent Delete ────────────────────────────────────────────────────────

export async function deleteCompetitionCascade(id: number): Promise<{
  registrations: number;
  matchResultRows: number;
  tradeRows: number;
  chatRows: number;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get competition to find matchId
  const [comp] = await db.select({ matchId: competitions.matchId }).from(competitions).where(eq(competitions.id, id)).limit(1);
  if (!comp) throw new Error(`Competition #${id} not found`);

  // Wrap all deletes in a transaction for atomicity
  const result = await db.transaction(async (tx) => {
    // 1. Delete trades via matchId
    let tradeRows = 0;
    if (comp.matchId) {
      const tradeResult = await tx.delete(trades).where(eq(trades.matchId, comp.matchId));
      tradeRows = tradeResult[0].affectedRows ?? 0;
    }

    // 2. Delete match results
    const mrResult = await tx.delete(matchResults).where(eq(matchResults.competitionId, id));
    const matchResultRows = mrResult[0].affectedRows ?? 0;

    // 3. Delete registrations
    const regResult = await tx.delete(competitionRegistrations).where(eq(competitionRegistrations.competitionId, id));
    const registrations = regResult[0].affectedRows ?? 0;

    // 4. Delete chat messages + their moderation records
    const msgs = await tx.select({ id: chatMessages.id }).from(chatMessages).where(eq(chatMessages.competitionId, id));
    let chatRows = 0;
    if (msgs.length > 0) {
      const msgIds = msgs.map(m => m.id);
      await tx.delete(chatModeration).where(inArray(chatModeration.chatMessageId, msgIds));
      const chatResult = await tx.delete(chatMessages).where(eq(chatMessages.competitionId, id));
      chatRows = chatResult[0].affectedRows ?? 0;
    }

    // 5. Delete competition itself
    await tx.delete(competitions).where(eq(competitions.id, id));

    return { registrations, matchResultRows, tradeRows, chatRows };
  });

  return result;
}

export async function deleteSeasonCascade(id: number): Promise<{ competitionsDeleted: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Find all competitions in this season
  const comps = await db.select({ id: competitions.id }).from(competitions).where(eq(competitions.seasonId, id));

  // Cascade delete each competition (each already uses its own transaction)
  for (const comp of comps) {
    await deleteCompetitionCascade(comp.id);
  }

  // Delete the season itself
  await db.delete(seasons).where(eq(seasons.id, id));

  return { competitionsDeleted: comps.length };
}
