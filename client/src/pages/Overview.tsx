/**
 * Overview Page — Platform-wide dashboard with key metrics from real API
 */
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Activity, BarChart3, Clock, DollarSign, Globe, Loader2, Trophy, Users,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar,
} from "recharts";
import { trpc } from "@/lib/trpc";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import StatCard from "@/components/StatCard";
import StatusBadge from "@/components/StatusBadge";
import { TIER_CONFIG, type RankTier } from "@/lib/constants";

const SCOPE_OPTIONS = [
  { key: "human", label: "Human" },
  { key: "agent", label: "Agent" },
] as const;

export default function Overview() {
  const [scope, setScope] = useState<"human" | "agent">("human");
  const scopeLabel = scope === "agent" ? "Agent" : "Human";
  const profileScopeLabel = scope === "agent" ? "Agent 主人" : "Human";

  const { data: stats, isLoading: statsLoading } = trpc.stats.platform.useQuery({ scope });
  const { data: tierDist, isLoading: tierLoading } = trpc.stats.tierDistribution.useQuery({ scope });
  const { data: regTrend } = trpc.stats.registrationTrend.useQuery({ scope });
  const { data: countryDist } = trpc.stats.countryDistribution.useQuery({ scope });
  const { data: comps } = trpc.competitions.list.useQuery();

  const liveComps = comps?.filter(
    c => (c.participantMode ?? "human") === scope && (c.status === "live" || c.status === "registration_open")
  ) || [];

  // Enrich tier distribution with labels/colors
  const tierData = tierDist?.map(t => ({
    ...t,
    label: TIER_CONFIG[t.tier as RankTier]?.label || t.tier,
    color: TIER_CONFIG[t.tier as RankTier]?.color || "#848E9C",
  })) || [];

  if (statsLoading || tierLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#F0B90B]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1440px] space-y-6">
      <AdminPageHeader
        eyebrow="Operations Overview"
        title="总览"
        description={`${scopeLabel} 赛道的实时运营数据、赛况密度和关键风险项都集中在这里，方便你快速切换到需要处理的页面。`}
        accentColor={scope === "agent" ? "#F0B90B" : "#7AA2F7"}
        icon={<BarChart3 className="h-4 w-4" />}
        actions={
          <div className="flex items-center gap-2">
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
          </div>
        }
        stats={[
          {
            label: "当前赛道",
            value: scopeLabel,
            icon: <Users className="h-4 w-4" />,
            tone: scope === "agent" ? "gold" : "blue",
          },
          {
            label: "活跃比赛",
            value: liveComps.length,
            icon: <Trophy className="h-4 w-4" />,
            tone: "green",
          },
          {
            label: "待处理报名",
            value: stats?.pendingRegistrations ?? 0,
            icon: <Clock className="h-4 w-4" />,
            tone: "gold",
          },
          {
            label: "累计交易",
            value: (stats?.totalTrades ?? 0).toLocaleString(),
            icon: <Activity className="h-4 w-4" />,
            tone: "neutral",
          },
        ]}
      />

      {liveComps.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {liveComps.slice(0, 4).map((c) => (
            <div key={c.id} className="admin-chip">
              <StatusBadge status={c.status} pulse />
              <span className="text-xs text-[#D6DDE7]">{c.title}</span>
            </div>
          ))}
        </div>
      ) : null}

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-4">
        <StatCard
          title={`${scopeLabel}账户数`}
          value={stats?.totalUsers ?? 0}
          icon={<Users className="w-5 h-5" />}
          accentColor="#3B82F6"
          delay={0}
        />
        <StatCard
          title="总比赛数"
          value={stats?.totalCompetitions ?? 0}
          icon={<Trophy className="w-5 h-5" />}
          accentColor="#F0B90B"
          delay={0.05}
        />
        <StatCard
          title="待审核报名"
          value={stats?.pendingRegistrations ?? 0}
          subtitle="需要处理"
          icon={<Clock className="w-5 h-5" />}
          accentColor="#F0B90B"
          delay={0.1}
        />
        <StatCard
          title="总交易次数"
          value={(stats?.totalTrades ?? 0).toLocaleString()}
          icon={<Activity className="w-5 h-5" />}
          accentColor="#0ECB81"
          delay={0.15}
        />
        <StatCard
          title="总奖金发放"
          value={`$${(stats?.totalPrize ?? 0).toLocaleString()}`}
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
          className="admin-panel p-5 lg:col-span-2"
        >
          <h3 className="font-display font-semibold text-sm text-foreground mb-4">用户注册趋势（近14天）</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={regTrend || []}>
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
          className="admin-panel p-5"
        >
          <h3 className="font-display font-semibold text-sm text-foreground mb-4">{scopeLabel} 段位分布</h3>
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={tierData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={65}
                  paddingAngle={3}
                  dataKey="count"
                >
                  {tierData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
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
            {tierData.map((t) => (
              <div key={t.tier} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: t.color }} />
                <span className="text-[10px] text-muted-foreground">{t.label}</span>
                <span className="text-[10px] font-mono font-semibold text-foreground ml-auto">{t.count}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Country Distribution */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="admin-panel p-5"
      >
        <h3 className="font-display font-semibold text-sm text-foreground mb-4 flex items-center gap-2">
          <Globe className="w-4 h-4 text-[#3B82F6]" />
          {profileScopeLabel} 地区分布
        </h3>
        {(countryDist?.length ?? 0) > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={(countryDist || []).slice(0, 10)}>
              <XAxis dataKey="country" tick={{ fontSize: 10, fill: "#848E9C" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#848E9C" }} axisLine={false} tickLine={false} width={30} />
              <Tooltip
                contentStyle={{ background: "#1C2030", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12, color: "#D1D4DC" }}
              />
              <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">暂无地区数据</div>
        )}
      </motion.div>
    </div>
  );
}
