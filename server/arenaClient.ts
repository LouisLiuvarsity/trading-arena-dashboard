/**
 * Arena REST API client for admin operations.
 * Auto-logins via quick-login and caches the Bearer token.
 * Re-authenticates on 401 responses.
 */
import axios, { AxiosInstance, AxiosError } from "axios";
import { ENV } from "./_core/env";

let cachedToken: string | null = null;

function getBaseUrl(): string {
  if (!ENV.arenaApiUrl) throw new Error("ARENA_API_URL is not configured");
  return ENV.arenaApiUrl.replace(/\/+$/, "");
}

function createAxios(): AxiosInstance {
  return axios.create({
    baseURL: getBaseUrl(),
    timeout: 30_000,
    headers: { "Content-Type": "application/json" },
  });
}

async function login(): Promise<string> {
  if (!ENV.arenaAdminUsername || !ENV.arenaAdminPassword) {
    throw new Error("ARENA_ADMIN_USERNAME / ARENA_ADMIN_PASSWORD not configured");
  }
  const client = createAxios();
  const res = await client.post("/api/auth/quick-login", {
    username: ENV.arenaAdminUsername,
    password: ENV.arenaAdminPassword,
  });
  const token = res.data?.token;
  if (!token) throw new Error("Arena login failed: no token returned");
  cachedToken = token;
  return token;
}

async function getToken(): Promise<string> {
  if (cachedToken) return cachedToken;
  return login();
}

/** Execute an authenticated request, retry once on 401 */
async function request<T = any>(
  method: "get" | "post" | "put" | "delete",
  path: string,
  data?: unknown,
  params?: Record<string, unknown>,
): Promise<T> {
  const client = createAxios();

  const doRequest = async (token: string) => {
    const config = {
      method,
      url: path,
      headers: { Authorization: `Bearer ${token}` },
      ...(data !== undefined ? { data } : {}),
      ...(params ? { params } : {}),
    };
    return client.request<T>(config);
  };

  let token = await getToken();
  try {
    const res = await doRequest(token);
    return res.data;
  } catch (err) {
    if (err instanceof AxiosError && err.response?.status === 401) {
      // Token expired — re-login and retry once
      cachedToken = null;
      token = await login();
      const res = await doRequest(token);
      return res.data;
    }
    // Forward arena error message
    if (err instanceof AxiosError && err.response?.data?.error) {
      throw new Error(err.response.data.error);
    }
    throw err;
  }
}

// ─── Seasons ──────────────────────────────────────────────────────────────────

export async function listSeasons() {
  return request<any[]>("get", "/api/admin/seasons");
}

export async function createSeason(data: {
  name: string;
  slug: string;
  startDate: number;
  endDate: number;
}) {
  return request<{ id: number }>("post", "/api/admin/seasons", data);
}

// ─── Competitions ─────────────────────────────────────────────────────────────

export async function createCompetition(data: {
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
}) {
  return request<{ id: number }>("post", "/api/admin/competitions", data);
}

export async function updateCompetition(
  id: number,
  data: Record<string, unknown>,
) {
  return request<{ ok: true }>("put", `/api/admin/competitions/${id}`, data);
}

export async function transitionCompetition(id: number, status: string) {
  return request<{ ok: true }>(
    "post",
    `/api/admin/competitions/${id}/transition`,
    { status },
  );
}

export async function duplicateCompetition(id: number) {
  return request<{ id: number }>(
    "post",
    `/api/admin/competitions/${id}/duplicate`,
  );
}

// ─── Registrations ────────────────────────────────────────────────────────────

export async function getAdminCompetitionRegistrations(
  competitionId: number,
  status?: string,
) {
  return request<any[]>(
    "get",
    `/api/admin/competitions/${competitionId}/registrations`,
    undefined,
    status ? { status } : undefined,
  );
}

export async function reviewRegistration(
  registrationId: number,
  decision: "accepted" | "rejected" | "waitlisted",
) {
  return request<{ ok: true }>(
    "post",
    `/api/admin/registrations/${registrationId}/review`,
    { decision },
  );
}

export async function batchReviewRegistrations(
  competitionId: number,
  action: "accepted" | "rejected",
  ids: number[],
) {
  return request<{ ok: true; processed: number }>(
    "post",
    `/api/admin/competitions/${competitionId}/registrations/batch`,
    { action, ids },
  );
}
