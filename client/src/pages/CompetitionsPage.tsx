/**
 * CompetitionsPage — Competition management with CRUD, status transitions, and registration approval
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy, Users, DollarSign, Clock, CheckCircle, XCircle, Download,
  ChevronDown, ChevronUp, Loader2, Plus, Edit3, Copy,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import StatusBadge from "@/components/StatusBadge";
import TierBadge from "@/components/TierBadge";
import StatCard from "@/components/StatCard";
import CompetitionFormDialog from "@/components/CompetitionFormDialog";
import CompetitionStatusControl from "@/components/CompetitionStatusControl";
import { COMP_TYPE_CONFIG, formatDate, downloadCSV, getTierFromPoints, type CompetitionType } from "@/lib/constants";

export default function CompetitionsPage() {
  const [expandedCompId, setExpandedCompId] = useState<number | null>(null);
  const [regStatusFilter, setRegStatusFilter] = useState("all");
  const [selectedRegIds, setSelectedRegIds] = useState<Set<number>>(new Set());
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editComp, setEditComp] = useState<any | null>(null);

  const utils = trpc.useUtils();

  const { data: competitions, isLoading } = trpc.competitions.list.useQuery();
  const { data: registrations, isLoading: regsLoading } = trpc.competitions.registrations.useQuery(
    { competitionId: expandedCompId! },
    { enabled: !!expandedCompId }
  );

  const { data: stats } = trpc.stats.platform.useQuery();

  const updateRegMutation = trpc.competitions.updateRegistration.useMutation({
    onSuccess: (_data, variables) => {
      toast.success(variables.status === "accepted" ? "报名已批准" : "报名已拒绝");
      utils.competitions.registrations.invalidate();
      utils.competitions.list.invalidate();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const duplicateMutation = trpc.competitions.duplicate.useMutation({
    onSuccess: (result) => {
      toast.success(`比赛已复制，新比赛 ID: ${result.id}`);
      utils.competitions.list.invalidate();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const filteredRegs = (registrations || []).filter(r =>
    regStatusFilter === "all" || r.status === regStatusFilter
  );

  const handleBatchApprove = () => {
    updateRegMutation.mutate({ ids: Array.from(selectedRegIds), status: "accepted" });
    setSelectedRegIds(new Set());
  };

  const handleBatchReject = () => {
    updateRegMutation.mutate({ ids: Array.from(selectedRegIds), status: "rejected" });
    setSelectedRegIds(new Set());
  };

  const toggleSelect = (id: number) => {
    setSelectedRegIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedRegIds.size === filteredRegs.length) {
      setSelectedRegIds(new Set());
    } else {
      setSelectedRegIds(new Set(filteredRegs.map(r => r.id)));
    }
  };

  const handleExport = () => {
    if (!competitions) return;
    const rows = competitions.map(c => ({
      ID: c.id,
      标题: c.title,
      类型: COMP_TYPE_CONFIG[c.competitionType as CompetitionType]?.label || c.competitionType,
      状态: c.status,
      最大参与者: c.maxParticipants,
      已注册: c.registeredCount,
      已接受: c.acceptedCount,
      奖金池: c.prizePool,
      交易对: c.symbol,
      开始时间: c.startTime ? new Date(c.startTime).toISOString() : "",
      结束时间: c.endTime ? new Date(c.endTime).toISOString() : "",
    }));
    downloadCSV(rows, "trading_arena_competitions");
    toast.success("比赛数据已导出");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#F0B90B]" />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">比赛管理</h2>
          <p className="text-xs text-muted-foreground mt-0.5">管理所有比赛、状态流转及报名审批</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateDialog(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#F0B90B] text-black text-sm font-semibold hover:bg-[#F0B90B]/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            创建比赛
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[oklch(0.82_0.15_85/10%)] text-[#F0B90B] text-sm font-medium hover:bg-[oklch(0.82_0.15_85/15%)] transition-colors"
          >
            <Download className="w-4 h-4" />
            导出 CSV
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="总比赛数" value={stats?.totalCompetitions ?? 0} icon={<Trophy className="w-5 h-5" />} accentColor="#F0B90B" />
        <StatCard title="进行中" value={(competitions || []).filter(c => c.status === "live").length} icon={<Clock className="w-5 h-5" />} accentColor="#0ECB81" />
        <StatCard title="待审核报名" value={stats?.pendingRegistrations ?? 0} icon={<Users className="w-5 h-5" />} accentColor="#F0B90B" delay={0.1} />
        <StatCard title="总奖金池" value={`$${(stats?.totalPrize ?? 0).toLocaleString()}`} icon={<DollarSign className="w-5 h-5" />} accentColor="#0ECB81" delay={0.15} />
      </div>

      {/* Competition Cards */}
      <div className="space-y-3">
        {(competitions || []).map((comp) => {
          const typeConfig = COMP_TYPE_CONFIG[comp.competitionType as CompetitionType];
          const isExpanded = expandedCompId === comp.id;

          return (
            <motion.div
              key={comp.id}
              layout
              className="rounded-xl border border-border bg-card overflow-hidden"
            >
              {/* Competition Header */}
              <div className="p-4 lg:p-5">
                <div className="flex items-center justify-between">
                  <div
                    className="flex items-center gap-3 cursor-pointer flex-1"
                    onClick={() => {
                      setExpandedCompId(isExpanded ? null : comp.id);
                      setSelectedRegIds(new Set());
                      setRegStatusFilter("all");
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: `${typeConfig?.color || "#848E9C"}15`, color: typeConfig?.color || "#848E9C" }}
                    >
                      <Trophy className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                        {comp.title}
                        <StatusBadge status={comp.status} pulse={comp.status === "live"} />
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {typeConfig?.label || comp.competitionType} · {comp.symbol} · 奖金池 ${comp.prizePool.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Action buttons */}
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditComp(comp); }}
                      className="p-1.5 rounded-md hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors"
                      title="编辑"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); duplicateMutation.mutate({ id: comp.id }); }}
                      disabled={duplicateMutation.isPending}
                      className="p-1.5 rounded-md hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                      title="复制比赛"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-muted-foreground">报名</p>
                      <p className="text-sm font-mono font-semibold text-foreground">
                        {comp.acceptedCount}/{comp.maxParticipants}
                      </p>
                    </div>
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-muted-foreground">待审核</p>
                      <p className="text-sm font-mono font-semibold text-[#F0B90B]">
                        {comp.pendingCount}
                      </p>
                    </div>
                    <div
                      className="cursor-pointer p-1"
                      onClick={() => {
                        setExpandedCompId(isExpanded ? null : comp.id);
                        setSelectedRegIds(new Set());
                        setRegStatusFilter("all");
                      }}
                    >
                      {isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                    </div>
                  </div>
                </div>

                {/* Status Transition Controls */}
                <div className="mt-3">
                  <CompetitionStatusControl
                    competitionId={comp.id}
                    currentStatus={comp.status}
                  />
                </div>
              </div>

              {/* Registration Management Panel */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-border"
                  >
                    <div className="p-4 lg:p-5 space-y-4">
                      {/* Competition Details */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        <div className="p-2 rounded-lg bg-secondary/30">
                          <span className="text-muted-foreground">开始时间</span>
                          <p className="font-mono text-foreground mt-0.5">{formatDate(comp.startTime)}</p>
                        </div>
                        <div className="p-2 rounded-lg bg-secondary/30">
                          <span className="text-muted-foreground">结束时间</span>
                          <p className="font-mono text-foreground mt-0.5">{formatDate(comp.endTime)}</p>
                        </div>
                        <div className="p-2 rounded-lg bg-secondary/30">
                          <span className="text-muted-foreground">初始资金</span>
                          <p className="font-mono text-foreground mt-0.5">${comp.startingCapital.toLocaleString()}</p>
                        </div>
                        <div className="p-2 rounded-lg bg-secondary/30">
                          <span className="text-muted-foreground">赛季 ID</span>
                          <p className="font-mono text-foreground mt-0.5">{comp.seasonId}</p>
                        </div>
                      </div>

                      {/* Filters & Batch Actions */}
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <select
                            value={regStatusFilter}
                            onChange={(e) => setRegStatusFilter(e.target.value)}
                            className="px-3 py-1.5 rounded-lg bg-secondary border border-border text-xs text-foreground focus:outline-none"
                          >
                            <option value="all">全部状态</option>
                            <option value="pending">待审核</option>
                            <option value="accepted">已通过</option>
                            <option value="rejected">已拒绝</option>
                          </select>
                          <span className="text-xs text-muted-foreground">
                            {filteredRegs.length} 条记录
                          </span>
                        </div>
                        {selectedRegIds.size > 0 && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">已选 {selectedRegIds.size} 条</span>
                            <button
                              onClick={handleBatchApprove}
                              className="px-3 py-1.5 rounded-lg bg-[oklch(0.65_0.2_145/15%)] text-[#0ECB81] text-xs font-medium hover:bg-[oklch(0.65_0.2_145/25%)] transition-colors"
                            >
                              <CheckCircle className="w-3 h-3 inline mr-1" />
                              批量批准
                            </button>
                            <button
                              onClick={handleBatchReject}
                              className="px-3 py-1.5 rounded-lg bg-[oklch(0.65_0.2_25/15%)] text-[#F6465D] text-xs font-medium hover:bg-[oklch(0.65_0.2_25/25%)] transition-colors"
                            >
                              <XCircle className="w-3 h-3 inline mr-1" />
                              批量拒绝
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Registration Table */}
                      {regsLoading ? (
                        <div className="flex items-center justify-center h-32">
                          <Loader2 className="w-5 h-5 animate-spin text-[#F0B90B]" />
                        </div>
                      ) : filteredRegs.length > 0 ? (
                        <div className="overflow-x-auto rounded-lg border border-border">
                          <table className="w-full">
                            <thead>
                              <tr className="bg-secondary/50 border-b border-border">
                                <th className="px-3 py-2 text-left">
                                  <input
                                    type="checkbox"
                                    checked={selectedRegIds.size === filteredRegs.length && filteredRegs.length > 0}
                                    onChange={toggleSelectAll}
                                    className="rounded border-border"
                                  />
                                </th>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">用户</th>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">段位</th>
                                <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">积分</th>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">机构</th>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">状态</th>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">申请时间</th>
                                <th className="px-3 py-2 text-center text-xs font-semibold text-muted-foreground">操作</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {filteredRegs.map((reg) => (
                                <tr key={reg.id} className="hover:bg-secondary/20 transition-colors">
                                  <td className="px-3 py-2">
                                    <input
                                      type="checkbox"
                                      checked={selectedRegIds.has(reg.id)}
                                      onChange={() => toggleSelect(reg.id)}
                                      className="rounded border-border"
                                    />
                                  </td>
                                  <td className="px-3 py-2 text-sm font-medium text-foreground">{reg.username || `User #${reg.arenaAccountId}`}</td>
                                  <td className="px-3 py-2">
                                    <TierBadge tier={getTierFromPoints(reg.seasonPoints || 0)} />
                                  </td>
                                  <td className="px-3 py-2 text-right font-mono text-xs text-foreground">{reg.seasonPoints || 0}</td>
                                  <td className="px-3 py-2 text-xs text-muted-foreground">{reg.institutionName || "—"}</td>
                                  <td className="px-3 py-2"><StatusBadge status={reg.status} /></td>
                                  <td className="px-3 py-2 text-xs text-muted-foreground">{formatDate(reg.appliedAt)}</td>
                                  <td className="px-3 py-2 text-center">
                                    {reg.status === "pending" && (
                                      <div className="flex items-center justify-center gap-1">
                                        <button
                                          onClick={() => updateRegMutation.mutate({ ids: [reg.id], status: "accepted" })}
                                          className="p-1 rounded-md hover:bg-[oklch(0.65_0.2_145/10%)] text-[#0ECB81] transition-colors"
                                          title="批准"
                                        >
                                          <CheckCircle className="w-4 h-4" />
                                        </button>
                                        <button
                                          onClick={() => updateRegMutation.mutate({ ids: [reg.id], status: "rejected" })}
                                          className="p-1 rounded-md hover:bg-[oklch(0.65_0.2_25/10%)] text-[#F6465D] transition-colors"
                                          title="拒绝"
                                        >
                                          <XCircle className="w-4 h-4" />
                                        </button>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-sm text-muted-foreground">
                          暂无报名记录
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}

        {(competitions || []).length === 0 && (
          <div className="text-center py-16 text-sm text-muted-foreground">
            暂无比赛数据，点击上方按钮创建第一场比赛
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <CompetitionFormDialog
        open={showCreateDialog || !!editComp}
        onClose={() => { setShowCreateDialog(false); setEditComp(null); }}
        editData={editComp || undefined}
      />
    </div>
  );
}
