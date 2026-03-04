/**
 * CompetitionsPage — Competition management and registration approval
 * Design: Dark Trading Desk
 */
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy, Users, DollarSign, Clock, Check, X,
  CheckCircle2, XCircle, ChevronDown, Filter, Eye,
} from "lucide-react";
import DataTable, { type Column } from "@/components/DataTable";
import TierBadge from "@/components/TierBadge";
import StatusBadge from "@/components/StatusBadge";
import StatCard from "@/components/StatCard";
import {
  competitions, registrations,
  type Competition, type Registration,
  COMP_TYPE_CONFIG,
} from "@/lib/mock-data";
import { toast } from "sonner";

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function CompetitionsPage() {
  const [selectedComp, setSelectedComp] = useState<Competition | null>(null);
  const [regFilter, setRegFilter] = useState<string>("all");
  const [selectedRegIds, setSelectedRegIds] = useState<Set<number>>(new Set());

  const compRegs = useMemo(() => {
    if (!selectedComp) return [];
    let regs = registrations.filter((r) => r.competitionId === selectedComp.id);
    if (regFilter !== "all") regs = regs.filter((r) => r.status === regFilter);
    return regs;
  }, [selectedComp, regFilter]);

  const pendingCount = useMemo(() => {
    if (!selectedComp) return 0;
    return registrations.filter((r) => r.competitionId === selectedComp.id && r.status === "pending").length;
  }, [selectedComp]);

  const handleReview = (id: number, decision: "accepted" | "rejected") => {
    toast.success(decision === "accepted" ? `已批准报名 #${id}` : `已拒绝报名 #${id}`);
  };

  const handleBatchReview = (decision: "accepted" | "rejected") => {
    toast.success(`已批量${decision === "accepted" ? "批准" : "拒绝"} ${selectedRegIds.size} 条报名`);
    setSelectedRegIds(new Set());
  };

  const handleBatchAll = (decision: "accepted" | "rejected") => {
    const pendingRegs = registrations.filter((r) => r.competitionId === selectedComp?.id && r.status === "pending");
    toast.success(`已全部${decision === "accepted" ? "批准" : "拒绝"} ${pendingRegs.length} 条报名`);
  };

  const compColumns: Column<Competition>[] = [
    {
      key: "title",
      label: "比赛名称",
      sortable: true,
      render: (c) => (
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{c.title}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span
              className="text-[10px] px-1.5 py-0.5 rounded font-medium"
              style={{ background: `${COMP_TYPE_CONFIG[c.competitionType].color}15`, color: COMP_TYPE_CONFIG[c.competitionType].color }}
            >
              {COMP_TYPE_CONFIG[c.competitionType].label}
            </span>
            <span className="text-[10px] text-muted-foreground">{c.symbol}</span>
          </div>
        </div>
      ),
      getValue: (c) => c.title,
    },
    {
      key: "status",
      label: "状态",
      sortable: true,
      render: (c) => <StatusBadge status={c.status} pulse={c.status === "live"} />,
      getValue: (c) => c.status,
    },
    {
      key: "participants",
      label: "参赛人数",
      sortable: true,
      align: "right",
      render: (c) => (
        <span className="font-mono text-sm">
          <span className="text-foreground">{c.acceptedCount}</span>
          <span className="text-muted-foreground">/{c.maxParticipants}</span>
        </span>
      ),
      getValue: (c) => c.acceptedCount,
    },
    {
      key: "pending",
      label: "待审核",
      sortable: true,
      align: "right",
      render: (c) => {
        const pending = registrations.filter((r) => r.competitionId === c.id && r.status === "pending").length;
        return pending > 0 ? (
          <span className="font-mono text-sm text-[#F0B90B] font-semibold">{pending}</span>
        ) : (
          <span className="font-mono text-sm text-muted-foreground">0</span>
        );
      },
      getValue: (c) => registrations.filter((r) => r.competitionId === c.id && r.status === "pending").length,
    },
    {
      key: "prize",
      label: "奖金池",
      sortable: true,
      align: "right",
      render: (c) => <span className="font-mono text-sm text-[#0ECB81]">${c.prizePool}</span>,
      getValue: (c) => c.prizePool,
    },
    {
      key: "time",
      label: "时间",
      sortable: true,
      render: (c) => (
        <span className="text-xs text-muted-foreground">{formatDate(c.startTime)}</span>
      ),
      getValue: (c) => c.startTime,
    },
    {
      key: "actions",
      label: "操作",
      align: "center",
      render: (c) => (
        <button
          onClick={(e) => { e.stopPropagation(); setSelectedComp(c); setRegFilter("all"); setSelectedRegIds(new Set()); }}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-[10px] font-semibold text-[#F0B90B] border border-[#F0B90B]/30 rounded-lg hover:bg-[#F0B90B]/10 transition-colors"
        >
          <Eye className="w-3 h-3" /> 管理报名
        </button>
      ),
    },
  ];

  const regColumns: Column<Registration>[] = [
    {
      key: "username",
      label: "选手",
      sortable: true,
      render: (r) => (
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-foreground shrink-0">
            {r.username.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{r.username}</p>
            <p className="text-[10px] text-muted-foreground">{r.institutionName || r.country || "—"}</p>
          </div>
        </div>
      ),
      getValue: (r) => r.username,
    },
    {
      key: "tier",
      label: "段位",
      render: (r) => <TierBadge tier={r.rankTier} />,
    },
    {
      key: "points",
      label: "赛季分",
      sortable: true,
      align: "right",
      render: (r) => <span className="font-mono text-sm">{r.seasonPoints}</span>,
      getValue: (r) => r.seasonPoints,
    },
    {
      key: "matches",
      label: "历史比赛",
      sortable: true,
      align: "right",
      render: (r) => <span className="font-mono text-sm text-muted-foreground">{r.matchesPlayed}</span>,
      getValue: (r) => r.matchesPlayed,
    },
    {
      key: "status",
      label: "状态",
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: "appliedAt",
      label: "申请时间",
      sortable: true,
      render: (r) => <span className="text-xs text-muted-foreground">{formatDate(r.appliedAt)}</span>,
      getValue: (r) => r.appliedAt,
    },
    {
      key: "actions",
      label: "操作",
      align: "center",
      render: (r) => (
        r.status === "pending" ? (
          <div className="flex items-center gap-1 justify-center" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => handleReview(r.id, "accepted")}
              className="p-1.5 rounded-md text-[#0ECB81] hover:bg-[#0ECB81]/10 transition-colors"
              title="批准"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleReview(r.id, "rejected")}
              className="p-1.5 rounded-md text-[#F6465D] hover:bg-[#F6465D]/10 transition-colors"
              title="拒绝"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div>
        <h1 className="font-display text-xl font-bold text-foreground">比赛管理</h1>
        <p className="text-sm text-muted-foreground mt-1">管理所有比赛，审批用户报名</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="总比赛数" value={competitions.length} icon={<Trophy className="w-5 h-5" />} accentColor="#F0B90B" />
        <StatCard title="进行中" value={competitions.filter((c) => c.status === "live").length} icon={<Clock className="w-5 h-5" />} accentColor="#0ECB81" />
        <StatCard title="待审核报名" value={registrations.filter((r) => r.status === "pending").length} icon={<Users className="w-5 h-5" />} accentColor="#F0B90B" delay={0.1} />
        <StatCard title="总奖金池" value={`$${competitions.reduce((s, c) => s + c.prizePool, 0).toLocaleString()}`} icon={<DollarSign className="w-5 h-5" />} accentColor="#0ECB81" delay={0.15} />
      </div>

      {/* Competitions Table */}
      <DataTable
        data={competitions}
        columns={compColumns}
        pageSize={10}
        searchPlaceholder="搜索比赛名称..."
        searchFn={(c, q) => c.title.toLowerCase().includes(q) || c.slug.includes(q)}
        getRowId={(c) => c.id}
      />

      {/* Registration Management Modal */}
      <AnimatePresence>
        {selectedComp && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40"
              onClick={() => setSelectedComp(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed inset-4 lg:inset-12 bg-card border border-border rounded-2xl z-50 flex flex-col overflow-hidden"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0">
                <div>
                  <h2 className="font-display font-bold text-lg text-foreground">{selectedComp.title}</h2>
                  <div className="flex items-center gap-3 mt-1">
                    <StatusBadge status={selectedComp.status} pulse={selectedComp.status === "live"} />
                    <span className="text-xs text-muted-foreground">
                      {selectedComp.acceptedCount}/{selectedComp.maxParticipants} 参赛者
                    </span>
                    {pendingCount > 0 && (
                      <span className="text-xs text-[#F0B90B] font-semibold">{pendingCount} 待审核</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {pendingCount > 0 && (
                    <>
                      <button
                        onClick={() => handleBatchAll("accepted")}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold text-[#0ECB81] border border-[#0ECB81]/30 rounded-lg hover:bg-[#0ECB81]/10 transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> 全部批准
                      </button>
                      <button
                        onClick={() => handleBatchAll("rejected")}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold text-[#F6465D] border border-[#F6465D]/30 rounded-lg hover:bg-[#F6465D]/10 transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5" /> 全部拒绝
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setSelectedComp(null)}
                    className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="px-6 py-3 border-b border-border flex items-center gap-2 shrink-0">
                {["all", "pending", "accepted", "rejected", "waitlisted", "withdrawn"].map((f) => {
                  const count = f === "all"
                    ? registrations.filter((r) => r.competitionId === selectedComp.id).length
                    : registrations.filter((r) => r.competitionId === selectedComp.id && r.status === f).length;
                  return (
                    <button
                      key={f}
                      onClick={() => { setRegFilter(f); setSelectedRegIds(new Set()); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        regFilter === f
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                      }`}
                    >
                      {f === "all" ? "全部" : (f === "pending" ? "待审核" : f === "accepted" ? "已通过" : f === "rejected" ? "已拒绝" : f === "waitlisted" ? "候补" : "已撤回")}
                      <span className="ml-1 font-mono">{count}</span>
                    </button>
                  );
                })}
              </div>

              {/* Batch Actions */}
              {selectedRegIds.size > 0 && (
                <div className="px-6 py-2.5 bg-[#F0B90B]/5 border-b border-[#F0B90B]/20 flex items-center justify-between shrink-0">
                  <span className="text-xs text-[#F0B90B] font-semibold">已选 {selectedRegIds.size} 条</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleBatchReview("accepted")}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold text-primary-foreground bg-[#0ECB81] rounded-lg hover:bg-[#0ECB81]/90 transition-colors"
                    >
                      <Check className="w-3 h-3" /> 批量批准
                    </button>
                    <button
                      onClick={() => handleBatchReview("rejected")}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold text-[#F6465D] border border-[#F6465D]/30 rounded-lg hover:bg-[#F6465D]/10 transition-colors"
                    >
                      批量拒绝
                    </button>
                  </div>
                </div>
              )}

              {/* Registrations Table */}
              <div className="flex-1 overflow-y-auto p-4">
                <DataTable
                  data={compRegs}
                  columns={regColumns}
                  pageSize={20}
                  searchPlaceholder="搜索选手..."
                  searchFn={(r, q) => r.username.toLowerCase().includes(q) || (r.institutionName || "").toLowerCase().includes(q)}
                  selectedIds={selectedRegIds}
                  onSelectToggle={(id) => {
                    setSelectedRegIds((prev) => {
                      const next = new Set(prev);
                      if (next.has(id)) next.delete(id); else next.add(id);
                      return next;
                    });
                  }}
                  onSelectAll={() => {
                    const pendingIds = compRegs.filter((r) => r.status === "pending").map((r) => r.id);
                    if (selectedRegIds.size === pendingIds.length) {
                      setSelectedRegIds(new Set());
                    } else {
                      setSelectedRegIds(new Set(pendingIds));
                    }
                  }}
                  getRowId={(r) => r.id}
                  emptyMessage="暂无报名记录"
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
