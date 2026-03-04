/**
 * StatsPage — Comprehensive analytics and statistics
 * Design: Dark Trading Desk
 */
import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  BarChart3, Users, Trophy, TrendingUp, Globe, Building,
  Award, Target, Zap, DollarSign,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area,
  RadarChart, PolarGrid, PolarAngleAxis, Radar, CartesianGrid,
} from "recharts";
import TierBadge from "@/components/TierBadge";
import {
  users, competitions, matchResults, registrations,
  TIER_CONFIG, type RankTier,
} from "@/lib/mock-data";

const STATS_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663325188422/6Yq9eJsfZbyndNatnSjnyG/stats-bg-3AiPN5KeTe2sRFxBFBfiHa.webp";

const tierColors = Object.values(TIER_CONFIG).map((t) => t.color);

export default function StatsPage() {
  // Tier distribution
  const tierData = useMemo(() =>
    (Object.keys(TIER_CONFIG) as RankTier[]).map((t) => ({
      tier: t,
      label: TIER_CONFIG[t].label,
      count: users.filter((u) => u.rankTier === t).length,
      color: TIER_CONFIG[t].color,
      avgPoints: Math.round(users.filter((u) => u.rankTier === t).reduce((s, u) => s + u.seasonPoints, 0) / Math.max(1, users.filter((u) => u.rankTier === t).length)),
      avgWinRate: Math.round(users.filter((u) => u.rankTier === t).reduce((s, u) => s + u.winRate, 0) / Math.max(1, users.filter((u) => u.rankTier === t).length) * 10) / 10,
    })),
  []);

  // Country distribution
  const countryData = useMemo(() => {
    const map = new Map<string, { count: number; totalPnl: number; totalPrize: number }>();
    users.forEach((u) => {
      const existing = map.get(u.country) || { count: 0, totalPnl: 0, totalPrize: 0 };
      existing.count++;
      existing.totalPnl += u.totalPnl;
      existing.totalPrize += u.totalPrize;
      map.set(u.country, existing);
    });
    return Array.from(map.entries())
      .map(([country, data]) => ({ country, ...data, avgPnl: Math.round(data.totalPnl / data.count) }))
      .sort((a, b) => b.count - a.count);
  }, []);

  // Institution leaderboard
  const institutionData = useMemo(() => {
    const map = new Map<string, { count: number; totalPrize: number; avgWinRate: number; bestRank: number }>();
    users.filter((u) => u.institutionName).forEach((u) => {
      const name = u.institutionName!;
      const existing = map.get(name) || { count: 0, totalPrize: 0, avgWinRate: 0, bestRank: 999 };
      existing.count++;
      existing.totalPrize += u.totalPrize;
      existing.avgWinRate = (existing.avgWinRate * (existing.count - 1) + u.winRate) / existing.count;
      existing.bestRank = Math.min(existing.bestRank, u.bestRank);
      map.set(name, existing);
    });
    return Array.from(map.entries())
      .map(([name, data]) => ({ name, ...data, avgWinRate: Math.round(data.avgWinRate * 10) / 10 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, []);

  // Competition performance trend
  const compTrend = useMemo(() =>
    competitions
      .filter((c) => c.status === "completed")
      .sort((a, b) => a.competitionNumber - b.competitionNumber)
      .map((c) => {
        const results = matchResults.filter((r) => r.competitionId === c.id);
        const avgPnl = results.length > 0 ? Math.round(results.reduce((s, r) => s + r.totalPnlPct, 0) / results.length * 10) / 10 : 0;
        const totalTrades = results.reduce((s, r) => s + r.tradesCount, 0);
        return {
          name: `第${c.competitionNumber}周`,
          participants: results.length,
          avgPnl,
          totalTrades,
          prizePool: c.prizePool,
        };
      }),
  []);

  // Top traders
  const topTraders = useMemo(() =>
    [...users]
      .sort((a, b) => b.seasonPoints - a.seasonPoints)
      .slice(0, 10)
      .map((u, i) => ({ ...u, rank: i + 1 })),
  []);

  // Registration source distribution
  const sourceData = useMemo(() => {
    const map = new Map<string, number>();
    users.forEach((u) => {
      map.set(u.registrationSource, (map.get(u.registrationSource) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({
      name: name === "organic" ? "自然流量" : name === "referral" ? "推荐" : "社交媒体",
      value,
    }));
  }, []);

  const sourceColors = ["#3B82F6", "#0ECB81", "#F0B90B"];

  // Participant type distribution
  const typeData = useMemo(() => {
    const map = new Map<string, number>();
    users.forEach((u) => {
      const label = u.participantType === "student" ? "学生" : u.participantType === "professional" ? "专业人士" : "独立交易者";
      map.set(label, (map.get(label) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, []);

  const typeColors = ["#3B82F6", "#F0B90B", "#0ECB81"];

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Header with background */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-2xl overflow-hidden border border-border"
      >
        <img src={STATS_BG} alt="" className="w-full h-32 object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0B0E11]/95 via-[#0B0E11]/70 to-[#0B0E11]/40" />
        <div className="absolute inset-0 flex items-center px-6 lg:px-8">
          <div>
            <h1 className="font-display text-xl lg:text-2xl font-bold text-white tracking-tight flex items-center gap-3">
              <BarChart3 className="w-6 h-6 text-[#F0B90B]" />
              统计分析
            </h1>
            <p className="text-sm text-[#D1D4DC] mt-1">
              平台运营数据深度分析 · 用户画像 · 比赛趋势
            </p>
          </div>
        </div>
      </motion.div>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: "总用户", value: users.length, icon: <Users className="w-4 h-4" />, color: "#3B82F6" },
          { label: "总比赛", value: competitions.length, icon: <Trophy className="w-4 h-4" />, color: "#F0B90B" },
          { label: "总交易", value: matchResults.reduce((s, r) => s + r.tradesCount, 0).toLocaleString(), icon: <Zap className="w-4 h-4" />, color: "#0ECB81" },
          { label: "总奖金", value: `$${Math.round(matchResults.reduce((s, r) => s + r.prizeWon, 0)).toLocaleString()}`, icon: <DollarSign className="w-4 h-4" />, color: "#0ECB81" },
          { label: "平均胜率", value: `${Math.round(users.reduce((s, u) => s + u.winRate, 0) / users.length * 10) / 10}%`, icon: <Target className="w-4 h-4" />, color: "#F0B90B" },
        ].map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl border border-border bg-card p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <span style={{ color: m.color }}>{m.icon}</span>
              <span className="text-[10px] text-muted-foreground font-medium">{m.label}</span>
            </div>
            <p className="text-xl font-display font-bold text-foreground">{m.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Tier Distribution Bar */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl border border-border bg-card p-5"
        >
          <h3 className="font-display font-semibold text-sm text-foreground mb-4">段位分布</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={tierData}>
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#848E9C" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#848E9C" }} axisLine={false} tickLine={false} width={30} />
              <Tooltip
                contentStyle={{ background: "#1C2030", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12, color: "#D1D4DC" }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {tierData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {/* Tier stats table */}
          <div className="mt-4 space-y-1.5">
            {tierData.map((t) => (
              <div key={t.tier} className="flex items-center justify-between px-3 py-1.5 rounded-lg hover:bg-secondary/50 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: t.color }} />
                  <span className="text-xs font-medium text-foreground">{t.label}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[10px] text-muted-foreground">{t.count} 人</span>
                  <span className="text-[10px] text-muted-foreground">平均 {t.avgPoints} pts</span>
                  <span className="text-[10px] font-mono" style={{ color: t.avgWinRate >= 50 ? "#0ECB81" : "#F6465D" }}>
                    {t.avgWinRate}% 胜率
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Competition Trend */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="rounded-xl border border-border bg-card p-5"
        >
          <h3 className="font-display font-semibold text-sm text-foreground mb-4">比赛趋势</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={compTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#848E9C" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#848E9C" }} axisLine={false} tickLine={false} width={30} />
              <Tooltip
                contentStyle={{ background: "#1C2030", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12, color: "#D1D4DC" }}
              />
              <Line type="monotone" dataKey="participants" stroke="#3B82F6" strokeWidth={2} dot={{ r: 4, fill: "#3B82F6" }} name="参赛人数" />
              <Line type="monotone" dataKey="totalTrades" stroke="#0ECB81" strokeWidth={2} dot={{ r: 4, fill: "#0ECB81" }} name="总交易数" />
            </LineChart>
          </ResponsiveContainer>
          {/* Competition summary */}
          <div className="mt-4 grid grid-cols-3 gap-3">
            {compTrend.map((c) => (
              <div key={c.name} className="text-center px-2 py-2 rounded-lg bg-secondary/50 border border-border">
                <p className="text-[10px] text-muted-foreground">{c.name}</p>
                <p className="text-sm font-mono font-bold text-foreground">{c.participants}人</p>
                <p className="text-[10px] font-mono" style={{ color: c.avgPnl >= 0 ? "#0ECB81" : "#F6465D" }}>
                  平均 {c.avgPnl >= 0 ? "+" : ""}{c.avgPnl}%
                </p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Country Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-xl border border-border bg-card p-5"
        >
          <h3 className="font-display font-semibold text-sm text-foreground mb-4 flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#3B82F6]" />
            地区分布
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={countryData.slice(0, 8)} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 10, fill: "#848E9C" }} axisLine={false} tickLine={false} />
              <YAxis dataKey="country" type="category" tick={{ fontSize: 10, fill: "#848E9C" }} axisLine={false} tickLine={false} width={30} />
              <Tooltip
                contentStyle={{ background: "#1C2030", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12, color: "#D1D4DC" }}
              />
              <Bar dataKey="count" fill="#3B82F6" radius={[0, 4, 4, 0]} name="用户数" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Registration Source & Participant Type */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="rounded-xl border border-border bg-card p-5"
        >
          <h3 className="font-display font-semibold text-sm text-foreground mb-4">用户画像</h3>
          <div className="grid grid-cols-2 gap-4">
            {/* Source */}
            <div>
              <p className="text-[10px] text-muted-foreground font-medium mb-2 text-center">注册来源</p>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={sourceData} cx="50%" cy="50%" innerRadius={30} outerRadius={50} paddingAngle={3} dataKey="value">
                    {sourceData.map((_, i) => <Cell key={i} fill={sourceColors[i]} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "#1C2030", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11, color: "#D1D4DC" }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1 mt-1">
                {sourceData.map((s, i) => (
                  <div key={s.name} className="flex items-center justify-between text-[10px]">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ background: sourceColors[i] }} />
                      <span className="text-muted-foreground">{s.name}</span>
                    </span>
                    <span className="font-mono text-foreground">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Type */}
            <div>
              <p className="text-[10px] text-muted-foreground font-medium mb-2 text-center">参赛者类型</p>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={typeData} cx="50%" cy="50%" innerRadius={30} outerRadius={50} paddingAngle={3} dataKey="value">
                    {typeData.map((_, i) => <Cell key={i} fill={typeColors[i]} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "#1C2030", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11, color: "#D1D4DC" }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1 mt-1">
                {typeData.map((s, i) => (
                  <div key={s.name} className="flex items-center justify-between text-[10px]">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ background: typeColors[i] }} />
                      <span className="text-muted-foreground">{s.name}</span>
                    </span>
                    <span className="font-mono text-foreground">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Traders */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-xl border border-border bg-card"
        >
          <div className="px-5 py-3 border-b border-border">
            <h3 className="font-display font-semibold text-sm text-foreground flex items-center gap-2">
              <Award className="w-4 h-4 text-[#F0B90B]" />
              赛季排行榜 Top 10
            </h3>
          </div>
          <div className="divide-y divide-border">
            {topTraders.map((u) => (
              <div key={u.id} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    u.rank <= 3 ? "bg-[#F0B90B]/20 text-[#F0B90B]" : "bg-secondary text-muted-foreground"
                  }`}>
                    {u.rank}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{u.username}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <TierBadge tier={u.rankTier} size="sm" />
                      <span className="text-[10px] text-muted-foreground">{u.country}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-mono font-bold text-[#F0B90B]">{u.seasonPoints} pts</p>
                  <p className="text-[10px] font-mono" style={{ color: u.winRate >= 50 ? "#0ECB81" : "#F6465D" }}>
                    {u.winRate}% 胜率
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Institution Leaderboard */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="rounded-xl border border-border bg-card"
        >
          <div className="px-5 py-3 border-b border-border">
            <h3 className="font-display font-semibold text-sm text-foreground flex items-center gap-2">
              <Building className="w-4 h-4 text-[#3B82F6]" />
              机构排行榜 Top 10
            </h3>
          </div>
          <div className="divide-y divide-border">
            {institutionData.map((inst, i) => (
              <div key={inst.name} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    i < 3 ? "bg-[#3B82F6]/20 text-[#3B82F6]" : "bg-secondary text-muted-foreground"
                  }`}>
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{inst.name}</p>
                    <p className="text-[10px] text-muted-foreground">{inst.count} 名成员</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-mono font-bold text-foreground">${Math.round(inst.totalPrize)}</p>
                  <p className="text-[10px] font-mono" style={{ color: inst.avgWinRate >= 50 ? "#0ECB81" : "#F6465D" }}>
                    {inst.avgWinRate}% 胜率
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
