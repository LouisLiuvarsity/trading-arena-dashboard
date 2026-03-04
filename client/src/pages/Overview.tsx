/**
 * Overview Page — Platform-wide dashboard with key metrics
 * Design: Dark Trading Desk — high information density with gold accents
 */
import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Users, Trophy, MessageSquare, TrendingUp, DollarSign,
  AlertTriangle, Clock, Activity, Globe,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area,
} from "recharts";
import StatCard from "@/components/StatCard";
import TierBadge from "@/components/TierBadge";
import StatusBadge from "@/components/StatusBadge";
import {
  getPlatformStats, competitions, users, registrations,
  chatMessages, TIER_CONFIG, type RankTier,
} from "@/lib/mock-data";

const HERO_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663325188422/6Yq9eJsfZbyndNatnSjnyG/hero-banner-dBxu2K7U3KYfS6RayVCXPZ.webp";

const tierColors = Object.values(TIER_CONFIG).map((t) => t.color);

export default function Overview() {
  const stats = useMemo(() => getPlatformStats(), []);

  const recentUsers = useMemo(
    () => [...users].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5),
    []
  );

  const pendingRegs = useMemo(
    () => registrations.filter((r) => r.status === "pending").slice(0, 5),
    []
  );

  const flaggedChats = useMemo(
    () => chatMessages.filter((m) => m.status !== "visible").slice(0, 5),
    []
  );

  const liveComps = useMemo(
    () => competitions.filter((c) => c.status === "live" || c.status === "registration_open"),
    []
  );

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Hero Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-2xl overflow-hidden border border-border"
      >
        <img src={HERO_BG} alt="" className="w-full h-36 lg:h-44 object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0B0E11]/90 via-[#0B0E11]/60 to-transparent" />
        <div className="absolute inset-0 flex items-center px-6 lg:px-8">
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-bold text-white tracking-tight">
              Trading Arena <span className="text-[#F0B90B]">管理后台</span>
            </h1>
            <p className="text-sm text-[#D1D4DC] mt-1">
              平台运营数据一览 · 实时监控 · 快速管理
            </p>
            <div className="flex items-center gap-4 mt-3">
              {liveComps.map((c) => (
                <div key={c.id} className="flex items-center gap-2">
                  <StatusBadge status={c.status} pulse />
                  <span className="text-xs text-[#D1D4DC]">{c.title}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-4">
        <StatCard
          title="总用户数"
          value={stats.totalUsers}
          subtitle={`${stats.activeUsers} 人本周活跃`}
          icon={<Users className="w-5 h-5" />}
          accentColor="#3B82F6"
          delay={0}
        />
        <StatCard
          title="总比赛数"
          value={stats.totalCompetitions}
          subtitle={`${stats.liveCompetitions} 场进行中`}
          icon={<Trophy className="w-5 h-5" />}
          accentColor="#F0B90B"
          delay={0.05}
        />
        <StatCard
          title="待审核报名"
          value={stats.pendingRegistrations}
          subtitle="需要处理"
          icon={<Clock className="w-5 h-5" />}
          accentColor="#F0B90B"
          trend={stats.pendingRegistrations > 10 ? { value: 15, label: "较上周" } : undefined}
          delay={0.1}
        />
        <StatCard
          title="总交易次数"
          value={stats.totalTrades.toLocaleString()}
          icon={<Activity className="w-5 h-5" />}
          accentColor="#0ECB81"
          delay={0.15}
        />
        <StatCard
          title="总奖金发放"
          value={`$${stats.totalPrize.toLocaleString()}`}
          icon={<DollarSign className="w-5 h-5" />}
          accentColor="#0ECB81"
          delay={0.2}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Registration Trend */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="lg:col-span-2 rounded-xl border border-border bg-card p-5"
        >
          <h3 className="font-display font-semibold text-sm text-foreground mb-4">用户注册趋势（近14天）</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={stats.registrationTrend}>
              <defs>
                <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F0B90B" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#F0B90B" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#848E9C" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#848E9C" }} axisLine={false} tickLine={false} width={30} />
              <Tooltip
                contentStyle={{ background: "#1C2030", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12, color: "#D1D4DC" }}
              />
              <Area type="monotone" dataKey="count" stroke="#F0B90B" fill="url(#goldGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Tier Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-xl border border-border bg-card p-5"
        >
          <h3 className="font-display font-semibold text-sm text-foreground mb-4">段位分布</h3>
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={stats.tierDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={65}
                  paddingAngle={3}
                  dataKey="count"
                >
                  {stats.tierDistribution.map((entry, i) => (
                    <Cell key={i} fill={tierColors[i]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "#1C2030", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12, color: "#D1D4DC" }}
                  formatter={(value: number, name: string, props: any) => [value, props.payload.label]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-2">
            {stats.tierDistribution.map((t) => (
              <div key={t.tier} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: t.color }} />
                <span className="text-[10px] text-muted-foreground">{t.label}</span>
                <span className="text-[10px] font-mono font-semibold text-foreground ml-auto">{t.count}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Bottom Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Users */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="rounded-xl border border-border bg-card"
        >
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <h3 className="font-display font-semibold text-sm text-foreground">最新注册用户</h3>
            <a href="/users" className="text-[10px] text-[#F0B90B] hover:underline font-medium">查看全部</a>
          </div>
          <div className="divide-y divide-border">
            {recentUsers.map((u) => (
              <div key={u.id} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-foreground shrink-0">
                    {u.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{u.username}</p>
                    <p className="text-[10px] text-muted-foreground">{u.country} · {new Date(u.createdAt).toLocaleDateString("zh-CN")}</p>
                  </div>
                </div>
                <TierBadge tier={u.rankTier} />
              </div>
            ))}
          </div>
        </motion.div>

        {/* Pending Registrations */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-xl border border-border bg-card"
        >
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <h3 className="font-display font-semibold text-sm text-foreground">待审核报名</h3>
            <a href="/competitions" className="text-[10px] text-[#F0B90B] hover:underline font-medium">查看全部</a>
          </div>
          <div className="divide-y divide-border">
            {pendingRegs.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">暂无待审核报名</div>
            ) : (
              pendingRegs.map((r) => (
                <div key={r.id} className="px-5 py-3 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{r.username}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{r.competitionTitle}</p>
                  </div>
                  <StatusBadge status="pending" />
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Flagged Messages */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="rounded-xl border border-border bg-card"
        >
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <h3 className="font-display font-semibold text-sm text-foreground flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#F6465D]" />
              标记消息
            </h3>
            <a href="/chat" className="text-[10px] text-[#F0B90B] hover:underline font-medium">查看全部</a>
          </div>
          <div className="divide-y divide-border">
            {flaggedChats.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">暂无标记消息</div>
            ) : (
              flaggedChats.map((m) => (
                <div key={m.id} className="px-5 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-foreground">{m.username}</span>
                    <StatusBadge status={m.status} />
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{m.message}</p>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>

      {/* Country Distribution */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="rounded-xl border border-border bg-card p-5"
      >
        <h3 className="font-display font-semibold text-sm text-foreground mb-4 flex items-center gap-2">
          <Globe className="w-4 h-4 text-[#3B82F6]" />
          用户地区分布
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={stats.countryDistribution.slice(0, 10)}>
            <XAxis dataKey="country" tick={{ fontSize: 10, fill: "#848E9C" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#848E9C" }} axisLine={false} tickLine={false} width={30} />
            <Tooltip
              contentStyle={{ background: "#1C2030", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12, color: "#D1D4DC" }}
            />
            <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>
    </div>
  );
}
