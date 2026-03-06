/**
 * Shared constants for the Trading Arena Dashboard
 * These are UI display configurations, not mock data
 */

export type RankTier = "iron" | "bronze" | "silver" | "gold" | "platinum" | "diamond";
export type RegistrationStatus = "pending" | "accepted" | "rejected" | "waitlisted" | "withdrawn";
export type CompetitionStatus = "draft" | "announced" | "registration_open" | "registration_closed" | "live" | "settling" | "completed" | "ended_early" | "cancelled";
export type CompetitionType = "regular" | "grand_final" | "special" | "practice";
export type ChatMessageStatus = "visible" | "hidden" | "deleted";

export const TIER_CONFIG: Record<RankTier, { label: string; color: string; minPoints: number }> = {
  iron: { label: "Iron", color: "#5E6673", minPoints: 0 },
  bronze: { label: "Bronze", color: "#CD7F32", minPoints: 100 },
  silver: { label: "Silver", color: "#C0C0C0", minPoints: 350 },
  gold: { label: "Gold", color: "#F0B90B", minPoints: 700 },
  platinum: { label: "Platinum", color: "#00D4AA", minPoints: 1200 },
  diamond: { label: "Diamond", color: "#B9F2FF", minPoints: 2000 },
};

export const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "待审核", color: "#F0B90B" },
  accepted: { label: "已通过", color: "#0ECB81" },
  rejected: { label: "已拒绝", color: "#F6465D" },
  withdrawn: { label: "已撤回", color: "#5E6673" },
  waitlisted: { label: "候补", color: "#848E9C" },
  draft: { label: "草稿", color: "#5E6673" },
  announced: { label: "已公告", color: "#3B82F6" },
  registration_open: { label: "报名中", color: "#0ECB81" },
  registration_closed: { label: "报名截止", color: "#F0B90B" },
  live: { label: "进行中", color: "#0ECB81" },
  settling: { label: "结算中", color: "#F0B90B" },
  completed: { label: "已结束", color: "#848E9C" },
  ended_early: { label: "提前结束", color: "#FF6B35" },
  cancelled: { label: "已取消", color: "#F6465D" },
  visible: { label: "可见", color: "#0ECB81" },
  hidden: { label: "已隐藏", color: "#F0B90B" },
  deleted: { label: "已删除", color: "#F6465D" },
  active: { label: "活跃", color: "#0ECB81" },
  banned: { label: "已封禁", color: "#F6465D" },
  archived: { label: "已归档", color: "#6B7280" },
};

export const COMP_TYPE_CONFIG: Record<CompetitionType, { label: string; color: string }> = {
  regular: { label: "常规赛", color: "#3B82F6" },
  grand_final: { label: "总决赛", color: "#F0B90B" },
  special: { label: "特别赛", color: "#A855F7" },
  practice: { label: "练习赛", color: "#848E9C" },
};

/** Valid competition status transitions (state machine) */
export const VALID_TRANSITIONS: Record<string, CompetitionStatus[]> = {
  draft: ["announced", "cancelled"],
  announced: ["registration_open", "cancelled"],
  registration_open: ["registration_closed", "cancelled"],
  registration_closed: ["live", "cancelled"],
  live: ["ended_early"],
};

/** Compute tier from season points */
export function getTierFromPoints(points: number): RankTier {
  if (points >= 2000) return "diamond";
  if (points >= 1200) return "platinum";
  if (points >= 700) return "gold";
  if (points >= 350) return "silver";
  if (points >= 100) return "bronze";
  return "iron";
}

/** Format timestamp to readable date */
export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Format timestamp to short date */
export function formatShortDate(ts: number): string {
  return new Date(ts).toLocaleDateString("zh-CN", {
    month: "short",
    day: "numeric",
  });
}

/** Convert CSV data to downloadable blob */
export function downloadCSV(data: Record<string, unknown>[], filename: string) {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(","),
    ...data.map(row =>
      headers.map(h => {
        const val = row[h];
        const str = val === null || val === undefined ? "" : String(val);
        // Escape commas and quotes
        return str.includes(",") || str.includes('"') || str.includes("\n")
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      }).join(",")
    ),
  ].join("\n");

  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
