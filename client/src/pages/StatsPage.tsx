/**
 * StatsPage — Statistics and analytics with real API
 */
import { Loader2, Trophy, Download, TrendingUp, Globe, Award, Building2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell,
} from "recharts";
import TierBadge from "@/components/TierBadge";
import { TIER_CONFIG, downloadCSV, getTierFromPoints } from "@/lib/constants";

const CHART_COLORS = ["#F0B90B", "#0ECB81", "#3B82F6", "#F6465D", "#8B5CF6", "#EC4899", "#06B6D4", "#F59E0B"];

export default function StatsPage() {
  const { data: tierDist, isLoading: tierLoading } = trpc.stats.tierDistribution.useQuery();
  const { data: compTrends, isLoading: trendsLoading } = trpc.stats.competitionTrends.useQuery();
  const { data: countryDist, isLoading: countryLoading } = trpc.stats.countryDistribution.useQuery();
  const { data: topTraders, isLoading: tradersLoading } = trpc.stats.topTraders.useQuery({ limit: 10 });
  const { data: instLeaderboard, isLoading: instLoading } = trpc.stats.institutionLeaderboard.useQuery({ limit: 10 });
  const { data: regTrend, isLoading: regLoading } = trpc.stats.registrationTrend.useQuery({ days: 14 });

  const handleExportStats = () => {
    if (!tierDist) return;
    const rows = tierDist.map(t => ({
      段位: t.tier,
      用户数: t.count,
    }));
    downloadCSV(rows, "trading_arena_tier_distribution");
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
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">统计分析</h2>
          <p className="text-xs text-muted-foreground mt-0.5">平台数据可视化与深度分析</p>
        </div>
        <button
          onClick={handleExportStats}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[oklch(0.82_0.15_85/10%)] text-[#F0B90B] text-sm font-medium hover:bg-[oklch(0.82_0.15_85/15%)] transition-colors"
        >
          <Download className="w-4 h-4" />
          导出统计
        </button>
      </div>

      {/* Row 1: Tier Distribution + Registration Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Tier Distribution */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-display font-bold text-sm text-foreground mb-4 flex items-center gap-2">
            <Award className="w-4 h-4 text-[#F0B90B]" />
            段位分布
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
        <div className="rounded-xl border border-border bg-card p-5">
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
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-display font-bold text-sm text-foreground mb-4 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-[#F0B90B]" />
            比赛参与趋势
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
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-display font-bold text-sm text-foreground mb-4 flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#3B82F6]" />
            地区分布
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
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-display font-bold text-sm text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#0ECB81]" />
            赛季排行榜 Top 10
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">#</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">选手</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">段位</th>
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
                    <td className="px-3 py-2 text-right font-mono text-sm text-[#F0B90B]">{trader.seasonPoints}</td>
                    <td className="px-3 py-2 text-right font-mono text-sm text-[#0ECB81]">{trader.country || "—"}</td>
                  </tr>
                ))}
                {(topTraders || []).length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">暂无数据</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Institution Leaderboard */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-display font-bold text-sm text-foreground mb-4 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#8B5CF6]" />
            机构排行榜 Top 10
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
