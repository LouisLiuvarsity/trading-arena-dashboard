/**
 * UsersPage — Full user management with IP tracking, registration info, stats
 * Design: Dark Trading Desk
 */
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Globe, Monitor, Calendar, Ban, CheckCircle,
  X, Eye, EyeOff, Mail, Building, GraduationCap,
  TrendingUp, TrendingDown, Award, BarChart3, Shield, Trophy,
} from "lucide-react";
import DataTable, { type Column } from "@/components/DataTable";
import TierBadge from "@/components/TierBadge";
import StatCard from "@/components/StatCard";
import { users, matchResults, type User, TIER_CONFIG } from "@/lib/mock-data";
import { toast } from "sonner";

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function formatDateTime(ts: number) {
  return new Date(ts).toLocaleString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  return `${days}天前`;
}

export default function UsersPage() {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [filterTier, setFilterTier] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const filteredUsers = useMemo(() => {
    let result = users;
    if (filterTier !== "all") result = result.filter((u) => u.rankTier === filterTier);
    if (filterStatus === "banned") result = result.filter((u) => u.isBanned);
    if (filterStatus === "active") result = result.filter((u) => !u.isBanned);
    return result;
  }, [filterTier, filterStatus]);

  const userMatchResults = useMemo(() => {
    if (!selectedUser) return [];
    return matchResults.filter((r) => r.arenaAccountId === selectedUser.id);
  }, [selectedUser]);

  const columns: Column<User>[] = [
    {
      key: "username",
      label: "用户名",
      sortable: true,
      render: (u) => (
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
            style={{ background: `${TIER_CONFIG[u.rankTier].color}20`, color: TIER_CONFIG[u.rankTier].color }}
          >
            {u.username.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate flex items-center gap-1.5">
              {u.username}
              {u.isBanned && <Ban className="w-3 h-3 text-destructive" />}
            </p>
            <p className="text-[10px] text-muted-foreground">{u.email}</p>
          </div>
        </div>
      ),
      getValue: (u) => u.username,
    },
    {
      key: "tier",
      label: "段位",
      sortable: true,
      render: (u) => <TierBadge tier={u.rankTier} />,
      getValue: (u) => u.seasonPoints,
    },
    {
      key: "points",
      label: "赛季分",
      sortable: true,
      align: "right",
      render: (u) => <span className="font-mono text-sm">{u.seasonPoints}</span>,
      getValue: (u) => u.seasonPoints,
    },
    {
      key: "country",
      label: "地区",
      sortable: true,
      render: (u) => (
        <span className="text-sm text-muted-foreground">
          {u.country}{u.city ? ` · ${u.city}` : ""}
        </span>
      ),
      getValue: (u) => u.country,
    },
    {
      key: "ip",
      label: "IP地址",
      render: (u) => (
        <span className="font-mono text-xs text-muted-foreground">{u.ip}</span>
      ),
    },
    {
      key: "matches",
      label: "比赛数",
      sortable: true,
      align: "right",
      render: (u) => <span className="font-mono text-sm">{u.matchesPlayed}</span>,
      getValue: (u) => u.matchesPlayed,
    },
    {
      key: "winRate",
      label: "胜率",
      sortable: true,
      align: "right",
      render: (u) => (
        <span className="font-mono text-sm" style={{ color: u.winRate >= 50 ? "#0ECB81" : "#F6465D" }}>
          {u.winRate}%
        </span>
      ),
      getValue: (u) => u.winRate,
    },
    {
      key: "lastLogin",
      label: "最后登录",
      sortable: true,
      render: (u) => (
        <span className="text-xs text-muted-foreground">{timeAgo(u.lastLoginAt)}</span>
      ),
      getValue: (u) => u.lastLoginAt,
    },
  ];

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div>
        <h1 className="font-display text-xl font-bold text-foreground">用户管理</h1>
        <p className="text-sm text-muted-foreground mt-1">管理所有注册用户，查看 IP、注册信息和参赛数据</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="总用户" value={users.length} icon={<Users className="w-5 h-5" />} accentColor="#3B82F6" />
        <StatCard title="本周活跃" value={users.filter((u) => u.lastLoginAt > Date.now() - 7 * 86400000).length} icon={<CheckCircle className="w-5 h-5" />} accentColor="#0ECB81" />
        <StatCard title="已封禁" value={users.filter((u) => u.isBanned).length} icon={<Ban className="w-5 h-5" />} accentColor="#F6465D" delay={0.1} />
        <StatCard title="平均胜率" value={`${Math.round(users.reduce((s, u) => s + u.winRate, 0) / users.length * 10) / 10}%`} icon={<TrendingUp className="w-5 h-5" />} accentColor="#0ECB81" delay={0.15} />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={filterTier}
          onChange={(e) => setFilterTier(e.target.value)}
          className="px-3 py-2 text-sm bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="all">全部段位</option>
          {Object.entries(TIER_CONFIG).map(([key, val]) => (
            <option key={key} value={key}>{val.label}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 text-sm bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="all">全部状态</option>
          <option value="active">正常</option>
          <option value="banned">已封禁</option>
        </select>
      </div>

      {/* Users Table */}
      <DataTable
        data={filteredUsers}
        columns={columns}
        pageSize={12}
        searchPlaceholder="搜索用户名、邮箱、IP..."
        searchFn={(u, q) =>
          u.username.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.ip.includes(q) ||
          (u.country || "").toLowerCase().includes(q)
        }
        onRowClick={(u) => setSelectedUser(u)}
        getRowId={(u) => u.id}
      />

      {/* User Detail Drawer */}
      <AnimatePresence>
        {selectedUser && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setSelectedUser(null)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-card border-l border-border z-50 overflow-y-auto"
            >
              <div className="sticky top-0 bg-card/95 backdrop-blur-sm border-b border-border px-6 py-4 flex items-center justify-between z-10">
                <h2 className="font-display font-bold text-lg text-foreground">用户详情</h2>
                <button onClick={() => setSelectedUser(null)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Profile Header */}
                <div className="flex items-center gap-4">
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold"
                    style={{ background: `${TIER_CONFIG[selectedUser.rankTier].color}20`, color: TIER_CONFIG[selectedUser.rankTier].color }}
                  >
                    {selectedUser.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                      {selectedUser.username}
                      {selectedUser.isBanned && <span className="text-xs text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">已封禁</span>}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <TierBadge tier={selectedUser.rankTier} size="md" />
                      <span className="text-xs text-muted-foreground font-mono">{selectedUser.seasonPoints} pts</span>
                    </div>
                  </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: <Mail className="w-4 h-4" />, label: "邮箱", value: selectedUser.email },
                    { icon: <Globe className="w-4 h-4" />, label: "地区", value: `${selectedUser.country}${selectedUser.city ? ` · ${selectedUser.city}` : ""}` },
                    { icon: <Monitor className="w-4 h-4" />, label: "注册IP", value: selectedUser.ip },
                    { icon: <Monitor className="w-4 h-4" />, label: "最后登录IP", value: selectedUser.lastLoginIp },
                    { icon: <Calendar className="w-4 h-4" />, label: "注册时间", value: formatDate(selectedUser.createdAt) },
                    { icon: <Calendar className="w-4 h-4" />, label: "最后登录", value: formatDateTime(selectedUser.lastLoginAt) },
                    { icon: <Building className="w-4 h-4" />, label: "机构", value: selectedUser.institutionName || "未填写" },
                    { icon: <GraduationCap className="w-4 h-4" />, label: "类型", value: selectedUser.participantType === "student" ? "学生" : selectedUser.participantType === "professional" ? "专业人士" : "独立交易者" },
                    { icon: <Shield className="w-4 h-4" />, label: "注册来源", value: selectedUser.registrationSource },
                    { icon: <Eye className="w-4 h-4" />, label: "资料公开", value: selectedUser.isProfilePublic ? "是" : "否" },
                  ].map((item, i) => (
                    <div key={i} className="px-3 py-2.5 rounded-lg bg-secondary/50 border border-border">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-muted-foreground">{item.icon}</span>
                        <span className="text-[10px] text-muted-foreground font-medium">{item.label}</span>
                      </div>
                      <p className="text-sm text-foreground font-medium truncate">{item.value}</p>
                    </div>
                  ))}
                </div>

                {/* Trading Stats */}
                <div>
                  <h4 className="font-display font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-[#F0B90B]" />
                    交易统计
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "参赛次数", value: selectedUser.matchesPlayed, color: "#3B82F6" },
                      { label: "胜率", value: `${selectedUser.winRate}%`, color: selectedUser.winRate >= 50 ? "#0ECB81" : "#F6465D" },
                      { label: "最佳排名", value: `#${selectedUser.bestRank}`, color: "#F0B90B" },
                      { label: "总盈亏", value: `$${selectedUser.totalPnl.toLocaleString()}`, color: selectedUser.totalPnl >= 0 ? "#0ECB81" : "#F6465D" },
                      { label: "总奖金", value: `$${selectedUser.totalPrize.toLocaleString()}`, color: "#0ECB81" },
                      { label: "当前资金", value: `$${Math.round(selectedUser.capital).toLocaleString()}`, color: "#3B82F6" },
                    ].map((s, i) => (
                      <div key={i} className="text-center px-3 py-3 rounded-lg bg-secondary/50 border border-border">
                        <p className="text-[10px] text-muted-foreground mb-1">{s.label}</p>
                        <p className="text-sm font-mono font-bold" style={{ color: s.color }}>{s.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Match History */}
                {userMatchResults.length > 0 && (
                  <div>
                    <h4 className="font-display font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-[#F0B90B]" />
                      比赛记录
                    </h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {userMatchResults.map((r) => (
                        <div key={r.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-secondary/50 border border-border">
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-foreground truncate">{r.competitionTitle}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {r.tradesCount}笔交易 · 胜{r.winCount}/负{r.lossCount}
                            </p>
                          </div>
                          <div className="text-right shrink-0 ml-3">
                            <p className="text-sm font-mono font-bold" style={{ color: "#F0B90B" }}>#{r.finalRank}</p>
                            <p className="text-[10px] font-mono" style={{ color: r.totalPnlPct >= 0 ? "#0ECB81" : "#F6465D" }}>
                              {r.totalPnlPct >= 0 ? "+" : ""}{r.totalPnlPct}%
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      toast.success(selectedUser.isBanned ? "已解封用户" : "已封禁用户");
                    }}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                      selectedUser.isBanned
                        ? "bg-[#0ECB81]/10 text-[#0ECB81] border border-[#0ECB81]/30 hover:bg-[#0ECB81]/20"
                        : "bg-destructive/10 text-destructive border border-destructive/30 hover:bg-destructive/20"
                    }`}
                  >
                    {selectedUser.isBanned ? "解封用户" : "封禁用户"}
                  </button>
                  <button
                    onClick={() => toast.info("功能开发中")}
                    className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-secondary text-foreground border border-border hover:bg-accent transition-colors"
                  >
                    发送通知
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

