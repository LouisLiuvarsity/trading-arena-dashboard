/**
 * StatsPage — Statistics and analytics with real API
 */
import { useState } from "react";
import { Loader2, Trophy, Download, TrendingUp, Globe, Award, Building2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell,
} from "recharts";
import TierBadge from "@/components/TierBadge";
import { TIER_CONFIG, downloadCSV, getTierFromPoints } from "@/lib/constants";

const CHART_COLORS = ["#F0B90B", "#0ECB81", "#3B82F6", "#F6465D", "#8B5CF6", "#EC4899", "#06B6D4", "#F59E0B"];
const SCOPE_OPTIONS = [
  { key: "human", label: "Human" },
  { key: "agent", label: "Agent" },
] as const;

export default function StatsPage() {
  const [scope, setScope] = useState<"human" | "agent">("human");
  const scopeLabel = scope === "agent" ? "Agent" : "Human";
  const profileScopeLabel = scope === "agent" ? "Agent 主人" : "Human";

  const { data: tierDist, isLoading: tierLoading } = trpc.stats.tierDistribution.useQuery({ scope });
  const { data: compTrends, isLoading: trendsLoading } = trpc.stats.competitionTrends.useQuery({ scope });
  const { data: countryDist, isLoading: countryLoading } = trpc.stats.countryDistribution.useQuery({ scope });
  const { data: topTraders, isLoading: tradersLoading } = trpc.stats.topTraders.useQuery({ limit: 10, scope });
  const { data: instLeaderboard, isLoading: instLoading } = trpc.stats.institutionLeaderboard.useQuery({ limit: 10, scope });
  const { data: regTrend, isLoading: regLoading } = trpc.stats.registrationTrend.useQuery({ days: 14, scope });

  const handleExportStats = () => {
    if (!tierDist) return;
    const rows = tierDist.map(t => ({
      段位: t.tier,
      用户数: t.count,
    }));
    downloadCSV(rows, `trading_arena_${scope}_tier_distribution`);
    toast.success("段位分布数据已导出");
  };

  const isLoading = tierLoading || trendsLoading || countryLoading || tradersLoading || instLoading || regLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#F0B90B]" />
      </div>
    );
  }

  const tierChartData = (tierDist || []).map(t => ({
    name: TIER_CONFIG[t.tier as keyof typeof TIER_CONFIG]?.label || t.tier,
    value: t.count,
    fill: TIER_CONFIG[t.tier as keyof typeof TIER_CONFIG]?.color || "#848E9C",
  }));

  return (
    <div className="mx-auto max-w-[1440px] space-y-6">
      <AdminPageHeader
        eyebrow="Analytics"
        title="统计分析"
        description={`${scopeLabel} 赛道的段位分布、报名趋势和榜单表现都在这里统一查看。`}
        accentColor={scope === "agent" ? "#F0B90B" : "#0ECB81"}
        icon={<TrendingUp className="h-4 w-4" />}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {SCOPE_OPTIONS.map((option) => {
              const active = option.key === scope;
              return (
                <button
                  key={option.key}
                  onClick={() => setScope(option.key)}
                  className={`rounded-2xl border px-4 py-2.5 text-sm font-medium transition-colors ${
                    active
                      ? "border-[#F0B90B]/25 bg-[#F0B90B]/10 text-[#F0B90B]"
                      : "border-white/[0.08] bg-white/[0.03] text-[#AAB4C3] hover:bg-white/[0.05] hover:text-white"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
            <button
              onClick={handleExportStats}
              className="inline-flex items-center gap-2 rounded-2xl border border-[#F0B90B]/20 bg-[#F0B90B]/10 px-4 py-2.5 text-sm font-medium text-[#F0B90B] transition-colors hover:bg-[#F0B90B]/15"
            >
              <Download className="h-4 w-4" />
              导出统计
            </button>
          </div>
        }
        stats={[
          { label: "当前赛道", value: scopeLabel, icon: <Award className="h-4 w-4" />, tone: scope === "agent" ? "gold" : "green" },
          { label: "榜单人数", value: topTraders?.length ?? 0, icon: <Trophy className="h-4 w-4" />, tone: "gold" },
          { label: "国家分布", value: countryDist?.length ?? 0, icon: <Globe className="h-4 w-4" />, tone: "blue" },
          { label: "机构榜单", value: instLeaderboard?.length ?? 0, icon: <Building2 className="h-4 w-4" />, tone: "neutral" },
        ]}
      />

      {/* Row 1: Tier Distribution + Registration Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Tier Distribution */}
        <div className="admin-panel p-5">
          <h3 className="font-display font-bold text-sm text-foreground mb-4 flex items-center gap-2">
            <Award className="w-4 h-4 text-[#F0B90B]" />
            {scopeLabel} 段位分布
          </h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tierChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1C2030" />
                <XAxis dataKey="name" tick={{ fill: "#848E9C", fontSize: 11 }} />
                <YAxis tick={{ fill: "#848E9C", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: "#1C2030", border: "1px solid #2A2E3E", borderRadius: 8, color: "#EAECEF" }}
                />
                <Bar dataKey="value" name="用户数" radius={[4, 4, 0, 0]}>
                  {tierChartData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Registration Trend */}
        <div className="admin-panel p-5">
          <h3 className="font-display font-bold text-sm text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#0ECB81]" />
            注册趋势（近14天）
          </h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={regTrend || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1C2030" />
                <XAxis dataKey="date" tick={{ fill: "#848E9C", fontSize: 11 }} />
                <YAxis tick={{ fill: "#848E9C", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: "#1C2030", border: "1px solid #2A2E3E", borderRadius: 8, color: "#EAECEF" }}
                />
                <Line type="monotone" dataKey="count" name="注册数" stroke="#0ECB81" strokeWidth={2} dot={{ fill: "#0ECB81", r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 2: Competition Trends + Country Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Competition Trends */}
        <div className="admin-panel p-5">
          <h3 className="font-display font-bold text-sm text-foreground mb-4 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-[#F0B90B]" />
            {scopeLabel} 比赛参与趋势
          </h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={compTrends || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1C2030" />
                <XAxis dataKey="title" tick={{ fill: "#848E9C", fontSize: 10 }} angle={-20} textAnchor="end" height={50} />
                <YAxis tick={{ fill: "#848E9C", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: "#1C2030", border: "1px solid #2A2E3E", borderRadius: 8, color: "#EAECEF" }}
                />
                <Bar dataKey="participants" name="参赛人数" fill="#F0B90B" radius={[4, 4, 0, 0]} />
                <Bar dataKey="registrations" name="报名人数" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Country Distribution */}
        <div className="admin-panel p-5">
          <h3 className="font-display font-bold text-sm text-foreground mb-4 flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#3B82F6]" />
            {profileScopeLabel} 地区分布
          </h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={countryDist || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="count"
                  nameKey="country"
                  label={({ country, percent }: any) => `${country} ${(percent * 100).toFixed(0)}%`}
                >
                  {(countryDist || []).map((_: any, i: number) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "#1C2030", border: "1px solid #2A2E3E", borderRadius: 8, color: "#EAECEF" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 3: Top Traders + Institution Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Traders */}
        <div className="admin-panel p-5">
          <h3 className="font-display font-bold text-sm text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#0ECB81]" />
            {scopeLabel} 赛季排行榜 Top 10
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">#</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">选手</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">段位</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">排名分</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">积分</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">地区</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(topTraders || []).map((trader, i) => (
                  <tr key={trader.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-3 py-2">
                      <span className={`text-sm font-bold ${i < 3 ? "text-[#F0B90B]" : "text-muted-foreground"}`}>
                        {i + 1}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-sm font-medium text-foreground">{trader.username}</td>
                    <td className="px-3 py-2"><TierBadge tier={getTierFromPoints(trader.seasonPoints)} /></td>
                    <td className="px-3 py-2 text-right font-mono text-sm text-[#F0B90B]">{(trader as any).seasonRankScore ?? trader.seasonPoints}</td>
                    <td className="px-3 py-2 text-right font-mono text-sm text-muted-foreground">{trader.seasonPoints}</td>
                    <td className="px-3 py-2 text-right font-mono text-sm text-[#0ECB81]">{trader.country || "—"}</td>
                  </tr>
                ))}
                {(topTraders || []).length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">暂无数据</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Institution Leaderboard */}
        <div className="admin-panel p-5">
          <h3 className="font-display font-bold text-sm text-foreground mb-4 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#8B5CF6]" />
            {profileScopeLabel} 机构排行榜 Top 10
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">#</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">机构</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">成员</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">平均积分</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">平均胜率</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(instLeaderboard || []).map((inst, i) => (
                  <tr key={inst.institutionName || i} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-3 py-2">
                      <span className={`text-sm font-bold ${i < 3 ? "text-[#8B5CF6]" : "text-muted-foreground"}`}>
                        {i + 1}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-sm font-medium text-foreground">{inst.institutionName || "Unknown"}</td>
                    <td className="px-3 py-2 text-right font-mono text-sm text-muted-foreground">{inst.memberCount}</td>
                    <td className="px-3 py-2 text-right font-mono text-sm text-[#F0B90B]">—</td>
                    <td className="px-3 py-2 text-right font-mono text-sm text-[#0ECB81]">—</td>
                  </tr>
                ))}
                {(instLeaderboard || []).length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">暂无数据</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
