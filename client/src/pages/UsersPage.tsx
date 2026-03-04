/**
 * UsersPage — Arena user management with real API
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, X, Shield, ShieldOff, Eye, Download,
  ChevronLeft, ChevronRight, Trophy, MapPin,
  GraduationCap, Calendar, Loader2, Users, TrendingUp,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import TierBadge from "@/components/TierBadge";
import StatusBadge from "@/components/StatusBadge";
import StatCard from "@/components/StatCard";
import { getTierFromPoints, formatDate, downloadCSV, TIER_CONFIG, type RankTier } from "@/lib/constants";

export default function UsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const pageSize = 12;

  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.users.list.useQuery({
    page,
    pageSize,
    search: search || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    sortBy,
    sortOrder,
  });

  const { data: userDetail, isLoading: detailLoading } = trpc.users.detail.useQuery(
    { id: selectedUserId! },
    { enabled: !!selectedUserId }
  );

  const { data: stats } = trpc.stats.platform.useQuery();

  const banMutation = trpc.users.ban.useMutation({
    onSuccess: () => {
      toast.success("用户已封禁");
      utils.users.list.invalidate();
      utils.users.detail.invalidate();
    },
    onError: (err) => toast.error(`封禁失败: ${err.message}`),
  });

  const unbanMutation = trpc.users.unban.useMutation({
    onSuccess: () => {
      toast.success("用户已解封");
      utils.users.list.invalidate();
      utils.users.detail.invalidate();
    },
    onError: (err) => toast.error(`解封失败: ${err.message}`),
  });

  const users = data?.users || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const handleExport = async () => {
    try {
      const result = await utils.export.users.fetch();
      if (result) {
        const rows = result.map((u: any) => ({
          ID: u.id,
          用户名: u.username,
          状态: u.role === "banned" ? "已封禁" : "活跃",
          资金: u.capital,
          赛季积分: u.seasonPoints,
          段位: getTierFromPoints(u.seasonPoints),
          国家: u.country || "",
          城市: u.city || "",
          机构: u.institutionName || "",
          参赛类型: u.participantType || "",
          注册时间: new Date(u.createdAt).toISOString(),
        }));
        downloadCSV(rows, "trading_arena_users");
        toast.success("用户数据已导出");
      }
    } catch {
      toast.error("导出失败");
    }
  };

  return (
    <div className="space-y-4 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">用户管理</h2>
          <p className="text-xs text-muted-foreground mt-0.5">共 {total} 名 Arena 用户</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[oklch(0.82_0.15_85/10%)] text-[#F0B90B] text-sm font-medium hover:bg-[oklch(0.82_0.15_85/15%)] transition-colors"
        >
          <Download className="w-4 h-4" />
          导出 CSV
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="总用户" value={stats?.totalUsers ?? 0} icon={<Users className="w-5 h-5" />} accentColor="#3B82F6" />
        <StatCard title="总比赛" value={stats?.totalCompetitions ?? 0} icon={<Trophy className="w-5 h-5" />} accentColor="#F0B90B" delay={0.05} />
        <StatCard title="待审核" value={stats?.pendingRegistrations ?? 0} icon={<Shield className="w-5 h-5" />} accentColor="#F0B90B" delay={0.1} />
        <StatCard title="平均胜率" value={`${stats?.avgWinRate ?? 0}%`} icon={<TrendingUp className="w-5 h-5" />} accentColor="#0ECB81" delay={0.15} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="搜索用户名、国家、机构..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#F0B90B]/50"
            />
          </div>
          <button onClick={handleSearch} className="px-3 py-2 rounded-lg bg-[#F0B90B] text-black text-sm font-medium hover:bg-[#F0B90B]/90">
            搜索
          </button>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground focus:outline-none"
        >
          <option value="all">全部状态</option>
          <option value="active">活跃</option>
          <option value="banned">已封禁</option>
        </select>

        <select
          value={sortBy}
          onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground focus:outline-none"
        >
          <option value="createdAt">注册时间</option>
          <option value="seasonPoints">赛季积分</option>
          <option value="capital">资金</option>
          <option value="username">用户名</option>
        </select>

        <button
          onClick={() => setSortOrder(o => o === "asc" ? "desc" : "asc")}
          className="px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground hover:bg-secondary/80"
        >
          {sortOrder === "desc" ? "↓ 降序" : "↑ 升序"}
        </button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-[#F0B90B]" />
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">用户</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">段位</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">赛季积分</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">资金</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">地区</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">机构</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">状态</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">注册时间</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((u) => {
                  const tier = getTierFromPoints(u.seasonPoints);
                  const isBanned = u.role === "banned";
                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-secondary/30 transition-colors cursor-pointer"
                      onClick={() => setSelectedUserId(u.id)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-foreground shrink-0">
                            {u.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{u.username}</p>
                            <p className="text-[10px] text-muted-foreground">#{u.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3"><TierBadge tier={tier} /></td>
                      <td className="px-4 py-3 text-right font-mono text-sm text-foreground">{u.seasonPoints}</td>
                      <td className="px-4 py-3 text-right font-mono text-sm text-foreground">${Math.round(u.capital).toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{u.country || "—"}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground truncate max-w-[120px]">{u.institutionName || "—"}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={isBanned ? "banned" : "active"} />
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(u.createdAt)}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setSelectedUserId(u.id)}
                            className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                            title="查看详情"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {isBanned ? (
                            <button
                              onClick={() => unbanMutation.mutate({ id: u.id })}
                              className="p-1.5 rounded-md hover:bg-[oklch(0.65_0.2_145/10%)] text-[#0ECB81] transition-colors"
                              title="解封"
                            >
                              <ShieldOff className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => banMutation.mutate({ id: u.id })}
                              className="p-1.5 rounded-md hover:bg-[oklch(0.65_0.2_25/10%)] text-[#F6465D] transition-colors"
                              title="封禁"
                            >
                              <Shield className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      暂无用户数据
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <p className="text-xs text-muted-foreground">
                第 {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} 条，共 {total} 条
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const p = page <= 3 ? i + 1 : page + i - 2;
                  if (p < 1 || p > totalPages) return null;
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-8 h-8 rounded-md text-xs font-medium ${p === page ? "bg-[#F0B90B] text-black" : "text-muted-foreground hover:bg-secondary"}`}
                    >
                      {p}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground disabled:opacity-30"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* User Detail Drawer */}
      <AnimatePresence>
        {selectedUserId && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40"
              onClick={() => setSelectedUserId(null)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-card border-l border-border z-50 overflow-y-auto"
            >
              <div className="sticky top-0 bg-card/95 backdrop-blur-sm border-b border-border px-6 py-4 flex items-center justify-between z-10">
                <h3 className="font-display font-bold text-foreground">用户详情</h3>
                <button onClick={() => setSelectedUserId(null)} className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {detailLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="w-6 h-6 animate-spin text-[#F0B90B]" />
                </div>
              ) : userDetail ? (
                <div className="p-6 space-y-6">
                  {/* User Header */}
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center text-xl font-bold text-foreground">
                      {userDetail.account.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-foreground">{userDetail.account.username}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <TierBadge tier={getTierFromPoints(userDetail.account.seasonPoints)} size="md" />
                        <StatusBadge status={userDetail.account.role === "banned" ? "banned" : "active"} />
                      </div>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "赛季积分", value: String(userDetail.account.seasonPoints) },
                      { label: "当前资金", value: `$${Math.round(userDetail.account.capital).toLocaleString()}` },
                      { label: "参赛次数", value: String(userDetail.stats.totalMatches) },
                      { label: "胜率", value: `${userDetail.stats.winRate}%` },
                      { label: "总盈亏", value: `${userDetail.stats.totalPnl >= 0 ? "+" : ""}${userDetail.stats.totalPnl.toFixed(2)}`, color: userDetail.stats.totalPnl >= 0 ? "#0ECB81" : "#F6465D" },
                      { label: "最佳排名", value: userDetail.stats.bestRank ? `#${userDetail.stats.bestRank}` : "—", color: "#F0B90B" },
                    ].map((s, i) => (
                      <div key={i} className="rounded-lg bg-secondary/50 p-3">
                        <p className="text-[10px] text-muted-foreground mb-1">{s.label}</p>
                        <p className="text-lg font-mono font-bold" style={{ color: s.color || "var(--foreground)" }}>{s.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Profile Info */}
                  {userDetail.profile && (
                    <div className="space-y-3">
                      <h5 className="text-sm font-semibold text-foreground">个人信息</h5>
                      <div className="space-y-2 text-sm">
                        {userDetail.profile.country && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="w-4 h-4 shrink-0" />
                            <span>{[userDetail.profile.country, userDetail.profile.region, userDetail.profile.city].filter(Boolean).join(" · ")}</span>
                          </div>
                        )}
                        {userDetail.profile.institutionName && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <GraduationCap className="w-4 h-4 shrink-0" />
                            <span>{userDetail.profile.institutionName}{userDetail.profile.department ? ` · ${userDetail.profile.department}` : ""}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="w-4 h-4 shrink-0" />
                          <span>注册于 {formatDate(userDetail.account.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* IP Events */}
                  {userDetail.ipEvents.length > 0 && (
                    <div className="space-y-3">
                      <h5 className="text-sm font-semibold text-foreground">最近登录记录</h5>
                      <div className="space-y-2">
                        {userDetail.ipEvents.map((evt, i) => {
                          let payload: any = {};
                          try { payload = JSON.parse(evt.payload || "{}"); } catch {}
                          return (
                            <div key={i} className="flex items-center justify-between text-xs text-muted-foreground bg-secondary/30 rounded-lg px-3 py-2">
                              <span>IP: {payload.ip || "未知"}</span>
                              <span>{formatDate(evt.timestamp)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Match Results */}
                  {userDetail.matchResults.length > 0 && (
                    <div className="space-y-3">
                      <h5 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-[#F0B90B]" />
                        比赛记录 ({userDetail.matchResults.length})
                      </h5>
                      <div className="space-y-2">
                        {userDetail.matchResults.slice(0, 8).map((r) => (
                          <div key={r.id} className="flex items-center justify-between bg-secondary/30 rounded-lg px-3 py-2">
                            <div>
                              <p className="text-xs font-medium text-foreground">{r.competitionTitle || `Competition #${r.competitionId}`}</p>
                              <p className="text-[10px] text-muted-foreground">
                                排名 #{r.finalRank} · {r.tradesCount} 笔交易
                              </p>
                            </div>
                            <div className="text-right">
                              <p className={`text-xs font-mono font-semibold ${r.totalPnl >= 0 ? "text-[#0ECB81]" : "text-[#F6465D]"}`}>
                                {r.totalPnl >= 0 ? "+" : ""}{r.totalPnl.toFixed(2)}
                              </p>
                              {r.pointsEarned > 0 && (
                                <p className="text-[10px] text-[#F0B90B]">+{r.pointsEarned} pts</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="pt-4 border-t border-border">
                    {userDetail.account.role === "banned" ? (
                      <button
                        onClick={() => { unbanMutation.mutate({ id: userDetail.account.id }); setSelectedUserId(null); }}
                        className="w-full py-2.5 rounded-lg bg-[oklch(0.65_0.2_145/15%)] text-[#0ECB81] font-medium text-sm hover:bg-[oklch(0.65_0.2_145/25%)] transition-colors"
                      >
                        <ShieldOff className="w-4 h-4 inline mr-2" />
                        解除封禁
                      </button>
                    ) : (
                      <button
                        onClick={() => { banMutation.mutate({ id: userDetail.account.id }); setSelectedUserId(null); }}
                        className="w-full py-2.5 rounded-lg bg-[oklch(0.65_0.2_25/15%)] text-[#F6465D] font-medium text-sm hover:bg-[oklch(0.65_0.2_25/25%)] transition-colors"
                      >
                        <Shield className="w-4 h-4 inline mr-2" />
                        封禁用户
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
                  用户不存在
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
