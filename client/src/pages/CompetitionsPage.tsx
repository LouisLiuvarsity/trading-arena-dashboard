/**
 * CompetitionsPage — Competition management with CRUD, status transitions, and registration approval
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy, Users, DollarSign, Clock, CheckCircle, XCircle, Download,
  ChevronDown, ChevronUp, Loader2, Plus, Edit3, Copy, Archive, ArchiveRestore, Trash2, AlertTriangle,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import StatusBadge from "@/components/StatusBadge";
import TierBadge from "@/components/TierBadge";
import StatCard from "@/components/StatCard";
import CompetitionFormDialog from "@/components/CompetitionFormDialog";
import CompetitionStatusControl from "@/components/CompetitionStatusControl";
import {
  ACCOUNT_TYPE_CONFIG,
  COMP_TYPE_CONFIG,
  PARTICIPANT_MODE_CONFIG,
  formatDate,
  downloadCSV,
  getTierFromPoints,
  type CompetitionType,
} from "@/lib/constants";

export default function CompetitionsPage() {
  const [expandedCompId, setExpandedCompId] = useState<number | null>(null);
  const [regStatusFilter, setRegStatusFilter] = useState("all");
  const [selectedRegIds, setSelectedRegIds] = useState<Set<number>>(new Set());
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editComp, setEditComp] = useState<any | null>(null);
  const [archiveFilter, setArchiveFilter] = useState<"active" | "archived" | "all">("active");
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

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

  const archiveMutation = trpc.competitions.archive.useMutation({
    onSuccess: (data, variables) => {
      toast.success(
        data.purged
          ? "比赛已归档并清理关联数据"
          : variables.archived
            ? "比赛已归档"
            : "比赛已取消归档"
      );
      utils.competitions.list.invalidate();
      utils.seasons.list.invalidate();
      utils.stats.platform.invalidate();
      utils.stats.competitionTrends.invalidate();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = trpc.competitions.delete.useMutation({
    onSuccess: (data) => {
      toast.success(`比赛已永久删除（报名 ${data.registrations}、结果 ${data.matchResultRows}、仓位 ${data.positionRows}、预测 ${data.predictionRows}、交易 ${data.tradeRows}、通知 ${data.notificationRows}、成就 ${data.achievementRows}、聊天 ${data.chatRows}、场次 ${data.matchRows} 条）`);
      utils.competitions.list.invalidate();
      utils.seasons.list.invalidate();
      utils.stats.platform.invalidate();
      utils.stats.competitionTrends.invalidate();
      setConfirmDeleteId(null);
    },
    onError: (err: any) => { toast.error(err.message); setConfirmDeleteId(null); },
  });

  const archivedCount = (competitions || []).filter(c => c.archived === 1).length;
  const filteredCompetitions = (competitions || []).filter(c => {
    if (archiveFilter === "active") return c.archived !== 1;
    if (archiveFilter === "archived") return c.archived === 1;
    return true;
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
      参赛模式: PARTICIPANT_MODE_CONFIG[c.participantMode as "human" | "agent"]?.label || c.participantMode,
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

      {/* Archive Filter Tabs */}
      <div className="flex items-center gap-1 bg-secondary/50 rounded-lg p-1 w-fit">
        {([
          { key: "active" as const, label: "活跃" },
          { key: "archived" as const, label: `已归档${archivedCount > 0 ? ` (${archivedCount})` : ""}` },
          { key: "all" as const, label: "全部" },
        ]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setArchiveFilter(tab.key)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              archiveFilter === tab.key
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
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
        {filteredCompetitions.map((comp) => {
          const typeConfig = COMP_TYPE_CONFIG[comp.competitionType as CompetitionType];
          const isExpanded = expandedCompId === comp.id;
          const isPurgedEndedEarly = comp.status === "ended_early" && comp.archived === 1;

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
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                          style={{
                            color: PARTICIPANT_MODE_CONFIG[comp.participantMode as "human" | "agent"]?.color ?? "#C7D0DD",
                            backgroundColor:
                              comp.participantMode === "agent"
                                ? "rgba(240,185,11,0.12)"
                                : "rgba(199,208,221,0.12)",
                          }}
                        >
                          {PARTICIPANT_MODE_CONFIG[comp.participantMode as "human" | "agent"]?.label ?? "Human vs Human"}
                        </span>
                        {comp.archived === 1 && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#6B7280]/15 text-[#6B7280]">已归档</span>
                        )}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {typeConfig?.label || comp.competitionType} · {comp.symbol} · 奖金池 ${comp.prizePool.toLocaleString()}
                      </p>
                      {comp.participantMode === "agent" && (
                        <p className="mt-1 text-[11px] text-[#F0B90B]">
                          Agent 赛仅开放 API 报名与交易，频率与奖金池按主办方配置。
                        </p>
                      )}
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
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isPurgedEndedEarly) return;
                        archiveMutation.mutate({ id: comp.id, archived: comp.archived !== 1 });
                      }}
                      disabled={archiveMutation.isPending || isPurgedEndedEarly}
                      className="p-1.5 rounded-md hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title={isPurgedEndedEarly ? "提前结束并已归档清理，不可恢复" : comp.archived === 1 ? "取消归档" : "归档"}
                    >
                      {isPurgedEndedEarly ? <Archive className="w-4 h-4" /> : comp.archived === 1 ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                    </button>
                    {comp.archived === 1 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(comp.id); }}
                        className="p-1.5 rounded-md hover:bg-[oklch(0.65_0.2_25/10%)] text-[#F6465D] transition-colors"
                        title="永久删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
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
                    archived={comp.archived === 1}
                    onArchive={(archived) => archiveMutation.mutate({ id: comp.id, archived })}
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
                        <div className="p-2 rounded-lg bg-secondary/30">
                          <span className="text-muted-foreground">参赛模式</span>
                          <p className="font-medium text-foreground mt-0.5">
                            {PARTICIPANT_MODE_CONFIG[comp.participantMode as "human" | "agent"]?.label ?? "Human vs Human"}
                          </p>
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
                                  <td className="px-3 py-2">
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2">
                                        <span
                                          className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold"
                                          style={{
                                            color: ACCOUNT_TYPE_CONFIG[reg.accountType as "human" | "agent"]?.color ?? "#C7D0DD",
                                            backgroundColor:
                                              reg.accountType === "agent"
                                                ? "rgba(240,185,11,0.12)"
                                                : "rgba(199,208,221,0.12)",
                                          }}
                                        >
                                          {ACCOUNT_TYPE_CONFIG[reg.accountType as "human" | "agent"]?.label ?? "Human"}
                                        </span>
                                        <span className="text-sm font-medium text-foreground">
                                          {reg.agentName || reg.username || `User #${reg.arenaAccountId}`}
                                        </span>
                                      </div>
                                      {reg.ownerUsername && (
                                        <p className="text-[10px] text-muted-foreground">
                                          Owner: {reg.ownerUsername}
                                        </p>
                                      )}
                                    </div>
                                  </td>
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

        {filteredCompetitions.length === 0 && (
          <div className="text-center py-16 text-sm text-muted-foreground">
            {archiveFilter === "archived" ? "暂无已归档的比赛" : archiveFilter === "all" ? "暂无比赛数据" : "暂无比赛数据，点击上方按钮创建第一场比赛"}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full mx-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#F6465D]/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-[#F6465D]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">确认永久删除</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  比赛「{competitions?.find(c => c.id === confirmDeleteId)?.title}」
                </p>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-[#F6465D]/5 border border-[#F6465D]/20 text-xs text-foreground space-y-1">
              <p>此操作将永久删除以下所有数据且不可恢复：</p>
              <ul className="list-disc list-inside text-muted-foreground">
                <li>比赛本身及其配置</li>
                <li>所有报名记录</li>
                <li>所有比赛结果与排名</li>
                <li>所有用户持仓与场次数据</li>
                <li>所有预测、通知与成就记录</li>
                <li>所有交易记录</li>
                <li>所有比赛聊天消息</li>
              </ul>
            </div>
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2 rounded-lg bg-secondary text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => deleteMutation.mutate({ id: confirmDeleteId })}
                disabled={deleteMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#F6465D] text-white text-sm font-semibold hover:bg-[#F6465D]/80 transition-colors disabled:opacity-50"
              >
                {deleteMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <CompetitionFormDialog
        open={showCreateDialog || !!editComp}
        onClose={() => { setShowCreateDialog(false); setEditComp(null); }}
        editData={editComp || undefined}
      />
    </div>
  );
}
