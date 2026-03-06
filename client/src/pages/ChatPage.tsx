/**
 * ChatPage — Chat message moderation with real API
 */
import { useState } from "react";
import { motion } from "framer-motion";
import {
  MessageSquare, Eye, EyeOff, Trash2, RotateCcw, Download,
  Search, ChevronLeft, ChevronRight, Loader2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import StatusBadge from "@/components/StatusBadge";
import TierBadge from "@/components/TierBadge";
import { formatDate, downloadCSV, getTierFromPoints } from "@/lib/constants";

type ChatFilterStatus = "all" | "visible" | "hidden" | "deleted";
type ChatModerationStatus = Exclude<ChatFilterStatus, "all">;

export default function ChatPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<ChatFilterStatus>("all");
  const [compFilter, setCompFilter] = useState<number | undefined>(undefined);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const pageSize = 15;

  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.chat.list.useQuery({
    page,
    pageSize,
    competitionId: compFilter,
    status: statusFilter !== "all" ? statusFilter : undefined,
    search: search || undefined,
  });

  const { data: competitions } = trpc.competitions.list.useQuery();

  const moderateMutation = trpc.chat.moderate.useMutation({
    onSuccess: () => {
      utils.chat.list.invalidate();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const batchModerateMutation = trpc.chat.batchModerate.useMutation({
    onSuccess: (_data, variables) => {
      toast.success(`已将 ${variables.messageIds.length} 条消息设为 ${variables.status === "hidden" ? "隐藏" : variables.status === "deleted" ? "删除" : "可见"}`);
      utils.chat.list.invalidate();
      setSelectedIds(new Set());
    },
    onError: (err: any) => toast.error(err.message),
  });

  const messages = data?.messages || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === messages.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(messages.map(m => m.id)));
    }
  };

  const handleModerate = (messageId: string, status: ChatModerationStatus) => {
    moderateMutation.mutate({ messageId, status });
    const label = status === "hidden" ? "已隐藏" : status === "deleted" ? "已删除" : "已恢复";
    toast.success(`消息${label}`);
  };

  const handleBatchModerate = (status: ChatModerationStatus) => {
    batchModerateMutation.mutate({ messageIds: Array.from(selectedIds), status });
  };

  const handleExport = () => {
    if (!messages.length) return;
    const rows = messages.map(m => ({
      ID: m.id,
      比赛: m.competitionTitle || `Competition #${m.competitionId}`,
      用户: m.username || `User #${m.arenaAccountId}`,
      消息: m.message,
      状态: m.moderationStatus,
      发送时间: new Date(m.timestamp).toISOString(),
    }));
    downloadCSV(rows, "trading_arena_chat");
    toast.success("聊天记录已导出");
  };

  return (
    <div className="space-y-4 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">聊天管理</h2>
          <p className="text-xs text-muted-foreground mt-0.5">审核和管理比赛聊天消息</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[oklch(0.82_0.15_85/10%)] text-[#F0B90B] text-sm font-medium hover:bg-[oklch(0.82_0.15_85/15%)] transition-colors"
        >
          <Download className="w-4 h-4" />
          导出 CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="搜索消息内容或用户名..."
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
          value={compFilter ?? "all"}
          onChange={(e) => { setCompFilter(e.target.value === "all" ? undefined : Number(e.target.value)); setPage(1); }}
          className="px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground focus:outline-none"
        >
          <option value="all">全部比赛</option>
          {(competitions || []).map(c => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as ChatFilterStatus); setPage(1); }}
          className="px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground focus:outline-none"
        >
          <option value="all">全部状态</option>
          <option value="visible">可见</option>
          <option value="hidden">已隐藏</option>
          <option value="deleted">已删除</option>
        </select>
      </div>

      {/* Batch Actions */}
      {selectedIds.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border"
        >
          <span className="text-xs text-muted-foreground">已选 {selectedIds.size} 条</span>
          <button
            onClick={() => handleBatchModerate("hidden")}
            className="px-3 py-1.5 rounded-lg bg-[oklch(0.82_0.15_85/15%)] text-[#F0B90B] text-xs font-medium hover:bg-[oklch(0.82_0.15_85/25%)] transition-colors"
          >
            <EyeOff className="w-3 h-3 inline mr-1" />
            批量隐藏
          </button>
          <button
            onClick={() => handleBatchModerate("deleted")}
            className="px-3 py-1.5 rounded-lg bg-[oklch(0.65_0.2_25/15%)] text-[#F6465D] text-xs font-medium hover:bg-[oklch(0.65_0.2_25/25%)] transition-colors"
          >
            <Trash2 className="w-3 h-3 inline mr-1" />
            批量删除
          </button>
          <button
            onClick={() => handleBatchModerate("visible")}
            className="px-3 py-1.5 rounded-lg bg-[oklch(0.65_0.2_145/15%)] text-[#0ECB81] text-xs font-medium hover:bg-[oklch(0.65_0.2_145/25%)] transition-colors"
          >
            <RotateCcw className="w-3 h-3 inline mr-1" />
            批量恢复
          </button>
        </motion.div>
      )}

      {/* Messages Table */}
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
                  <th className="px-3 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === messages.length && messages.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-border"
                    />
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground">用户</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground">比赛</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground min-w-[300px]">消息内容</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground">状态</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground">时间</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-muted-foreground">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {messages.map((msg) => (
                  <tr key={msg.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(msg.id)}
                        onChange={() => toggleSelect(msg.id)}
                        className="rounded border-border"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-foreground shrink-0">
                          {(msg.username || "?").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{msg.username || `User #${msg.arenaAccountId}`}</p>
                          <TierBadge tier="iron" />
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs text-muted-foreground max-w-[120px] truncate">
                      {msg.competitionTitle || `Competition #${msg.competitionId}`}
                    </td>
                    <td className="px-3 py-3">
                      <p className={`text-sm ${msg.moderationStatus === "deleted" ? "line-through text-muted-foreground" : msg.moderationStatus === "hidden" ? "text-muted-foreground italic" : "text-foreground"}`}>
                        {msg.message}
                      </p>
                    </td>
                    <td className="px-3 py-3"><StatusBadge status={msg.moderationStatus} /></td>
                    <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">{formatDate(msg.timestamp)}</td>
                    <td className="px-3 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {msg.moderationStatus === "visible" ? (
                          <>
                            <button
                              onClick={() => handleModerate(msg.id, "hidden")}
                              className="p-1 rounded-md hover:bg-[oklch(0.82_0.15_85/10%)] text-[#F0B90B] transition-colors"
                              title="隐藏"
                            >
                              <EyeOff className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleModerate(msg.id, "deleted")}
                              className="p-1 rounded-md hover:bg-[oklch(0.65_0.2_25/10%)] text-[#F6465D] transition-colors"
                              title="删除"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleModerate(msg.id, "visible")}
                            className="p-1 rounded-md hover:bg-[oklch(0.65_0.2_145/10%)] text-[#0ECB81] transition-colors"
                            title="恢复"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {messages.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      暂无聊天消息
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
    </div>
  );
}
