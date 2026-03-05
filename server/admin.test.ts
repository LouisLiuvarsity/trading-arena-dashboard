import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@example.com",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

function createNonAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "regular-user",
    email: "user@example.com",
    name: "Regular User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

function createUnauthContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("Admin API Access Control", () => {
  it("rejects unauthenticated users from users.list", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.users.list({ page: 1, pageSize: 10 })
    ).rejects.toThrow();
  });

  it("rejects non-admin users from users.list", async () => {
    const ctx = createNonAdminContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.users.list({ page: 1, pageSize: 10 })
    ).rejects.toThrow();
  });

  it("rejects unauthenticated users from competitions.list", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.competitions.list()).rejects.toThrow();
  });

  it("rejects non-admin users from competitions.list", async () => {
    const ctx = createNonAdminContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.competitions.list()).rejects.toThrow();
  });

  it("rejects unauthenticated users from stats.platform", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.stats.platform()).rejects.toThrow();
  });

  it("rejects non-admin users from stats.platform", async () => {
    const ctx = createNonAdminContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.stats.platform()).rejects.toThrow();
  });

  it("rejects unauthenticated users from chat.list", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.chat.list({ page: 1, pageSize: 10 })
    ).rejects.toThrow();
  });

  it("rejects non-admin users from chat.list", async () => {
    const ctx = createNonAdminContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.chat.list({ page: 1, pageSize: 10 })
    ).rejects.toThrow();
  });

  it("rejects unauthenticated users from adminLogs.list", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.adminLogs.list({ page: 1, pageSize: 10 })
    ).rejects.toThrow();
  });

  it("rejects non-admin users from adminLogs.list", async () => {
    const ctx = createNonAdminContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.adminLogs.list({ page: 1, pageSize: 10 })
    ).rejects.toThrow();
  });

  it("rejects non-admin users from users.ban", async () => {
    const ctx = createNonAdminContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.users.ban({ id: 1 })
    ).rejects.toThrow();
  });

  it("rejects non-admin users from chat.moderate", async () => {
    const ctx = createNonAdminContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.chat.moderate({ messageId: "1", status: "hidden" })
    ).rejects.toThrow();
  });

  it("rejects non-admin users from export.users", async () => {
    const ctx = createNonAdminContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.export.users()).rejects.toThrow();
  });
});

describe("Admin API - Admin user can access endpoints", () => {
  it("admin can call users.list without error (may return empty if no DB)", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // This should not throw - it may return empty data if DB is not connected
    const result = await caller.users.list({ page: 1, pageSize: 10 });
    expect(result).toBeDefined();
    expect(result).toHaveProperty("users");
    expect(result).toHaveProperty("total");
    expect(Array.isArray(result.users)).toBe(true);
    expect(typeof result.total).toBe("number");
  });

  it("admin can call competitions.list without error", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.competitions.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("admin can call stats.platform without error", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.stats.platform();
    expect(result).toBeDefined();
  });

  it("admin can call stats.tierDistribution without error", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.stats.tierDistribution();
    expect(Array.isArray(result)).toBe(true);
  });

  it("admin can call stats.competitionTrends without error", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.stats.competitionTrends();
    expect(Array.isArray(result)).toBe(true);
  });

  it("admin can call stats.countryDistribution without error", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.stats.countryDistribution();
    expect(Array.isArray(result)).toBe(true);
  });

  it("admin can call stats.topTraders without error", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.stats.topTraders({ limit: 5 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("admin can call stats.institutionLeaderboard without error", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.stats.institutionLeaderboard({ limit: 5 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("admin can call stats.registrationTrend without error", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.stats.registrationTrend({ days: 7 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("admin can call chat.list without error", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.chat.list({ page: 1, pageSize: 10 });
    expect(result).toBeDefined();
    expect(result).toHaveProperty("messages");
    expect(result).toHaveProperty("total");
  });

  it("admin can call adminLogs.list without error", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.adminLogs.list({ page: 1, pageSize: 10 });
    expect(result).toBeDefined();
    expect(result).toHaveProperty("logs");
    expect(result).toHaveProperty("total");
  });

  it("admin can call export.users without error", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.export.users();
    expect(Array.isArray(result)).toBe(true);
  });

  it("admin can call export.competitions without error", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.export.competitions();
    expect(Array.isArray(result)).toBe(true);
  });

  it("admin can call export.adminLogs without error", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.export.adminLogs();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("Input validation", () => {
  it("rejects invalid page number for users.list", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.users.list({ page: 0, pageSize: 10 })
    ).rejects.toThrow();
  });

  it("rejects invalid pageSize for users.list", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.users.list({ page: 1, pageSize: 200 })
    ).rejects.toThrow();
  });

  it("rejects invalid page number for chat.list", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.chat.list({ page: -1, pageSize: 10 })
    ).rejects.toThrow();
  });

  it("rejects invalid topTraders limit", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.stats.topTraders({ limit: 100 })
    ).rejects.toThrow();
  });

  it("rejects competition creation with missing required fields", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.competitions.create({
        seasonId: 1,
        title: "", // empty title should fail
        slug: "test",
        competitionNumber: 1,
        startTime: Date.now(),
        endTime: Date.now() + 86400000,
      })
    ).rejects.toThrow();
  });

  it("rejects competition creation with invalid competitionType", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.competitions.create({
        seasonId: 1,
        title: "Test",
        slug: "test",
        competitionNumber: 1,
        competitionType: "invalid_type" as any,
        startTime: Date.now(),
        endTime: Date.now() + 86400000,
      })
    ).rejects.toThrow();
  });

  it("rejects season creation with missing required fields", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.seasons.create({
        name: "", // empty name should fail
        slug: "test",
        startDate: Date.now(),
        endDate: Date.now() + 86400000,
      })
    ).rejects.toThrow();
  });

  it("rejects non-admin from creating competitions", async () => {
    const ctx = createNonAdminContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.competitions.create({
        seasonId: 1,
        title: "Test",
        slug: "test",
        competitionNumber: 1,
        startTime: Date.now(),
        endTime: Date.now() + 86400000,
      })
    ).rejects.toThrow();
  });

  it("rejects non-admin from creating seasons", async () => {
    const ctx = createNonAdminContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.seasons.create({
        name: "Test Season",
        slug: "test",
        startDate: Date.now(),
        endDate: Date.now() + 86400000,
      })
    ).rejects.toThrow();
  });
});
