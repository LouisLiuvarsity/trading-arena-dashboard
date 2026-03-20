/**
 * ChatPage - Chat message moderation with real API
 */
import { useState } from "react";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  EyeOff,
  Loader2,
  MessageSquare,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import StatusBadge from "@/components/StatusBadge";
import TierBadge from "@/components/TierBadge";
import { formatDate, downloadCSV } from "@/lib/constants";
import { trpc } from "@/lib/trpc";

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
      toast.success(
        `已将 ${variables.messageIds.length} 条消息设为 ${
          variables.status === "hidden"
            ? "隐藏"
            : variables.status === "deleted"
              ? "删除"
              : "可见"
        }`,
      );
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
    setSelectedIds((prev) => {
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
      setSelectedIds(new Set(messages.map((m) => m.id)));
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
    const rows = messages.map((m) => ({
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
    <div className="mx-auto max-w-[1440px] space-y-6">
      <AdminPageHeader
        eyebrow="Chat Moderation"
        title="聊天管理"
        description="保留现有的隐藏、删除和恢复逻辑，用更清晰的审查面板管理比赛聊天消息。"
        accentColor="#F0B90B"
        icon={<MessageSquare className="h-4 w-4" />}
        actions={
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 rounded-2xl border border-[#F0B90B]/20 bg-[#F0B90B]/10 px-4 py-2.5 text-sm font-medium text-[#F0B90B] transition-colors hover:bg-[#F0B90B]/15"
          >
            <Download className="h-4 w-4" />
            导出 CSV
          </button>
        }
        stats={[
          {
            label: "消息总数",
            value: total,
            icon: <MessageSquare className="h-4 w-4" />,
            tone: "gold",
          },
          {
            label: "当前筛选",
            value: statusFilter,
            icon: <Eye className="h-4 w-4" />,
            tone: "blue",
          },
          {
            label: "已选择",
            value: selectedIds.size,
            icon: <Trash2 className="h-4 w-4" />,
            tone: selectedIds.size > 0 ? "red" : "neutral",
          },
        ]}
      />

      <div className="admin-toolbar">
        <div className="flex min-w-[200px] max-w-md flex-1 items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="搜索消息内容或用户名..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="admin-control w-full py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground"
            />
          </div>
          <button
            onClick={handleSearch}
            className="rounded-lg bg-[#F0B90B] px-3 py-2 text-sm font-medium text-black hover:bg-[#F0B90B]/90"
          >
            搜索
          </button>
        </div>

        <select
          value={compFilter ?? "all"}
          onChange={(e) => {
            setCompFilter(e.target.value === "all" ? undefined : Number(e.target.value));
            setPage(1);
          }}
          className="admin-control px-3 py-2 text-sm"
        >
          <option value="all">全部比赛</option>
          {(competitions || []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as ChatFilterStatus);
            setPage(1);
          }}
          className="admin-control px-3 py-2 text-sm"
        >
          <option value="all">全部状态</option>
          <option value="visible">可见</option>
          <option value="hidden">已隐藏</option>
          <option value="deleted">已删除</option>
        </select>
      </div>

      {selectedIds.size > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="admin-toolbar"
        >
          <span className="text-xs text-muted-foreground">已选 {selectedIds.size} 条</span>
          <button
            onClick={() => handleBatchModerate("hidden")}
            className="rounded-lg bg-[oklch(0.82_0.15_85/15%)] px-3 py-1.5 text-xs font-medium text-[#F0B90B] transition-colors hover:bg-[oklch(0.82_0.15_85/25%)]"
          >
            <EyeOff className="mr-1 inline h-3 w-3" />
            批量隐藏
          </button>
          <button
            onClick={() => handleBatchModerate("deleted")}
            className="rounded-lg bg-[oklch(0.65_0.2_25/15%)] px-3 py-1.5 text-xs font-medium text-[#F6465D] transition-colors hover:bg-[oklch(0.65_0.2_25/25%)]"
          >
            <Trash2 className="mr-1 inline h-3 w-3" />
            批量删除
          </button>
          <button
            onClick={() => handleBatchModerate("visible")}
            className="rounded-lg bg-[oklch(0.65_0.2_145/15%)] px-3 py-1.5 text-xs font-medium text-[#0ECB81] transition-colors hover:bg-[oklch(0.65_0.2_145/25%)]"
          >
            <RotateCcw className="mr-1 inline h-3 w-3" />
            批量恢复
          </button>
        </motion.div>
      ) : null}

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#F0B90B]" />
        </div>
      ) : (
        <div className="admin-table-frame">
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
                  <th className="min-w-[300px] px-3 py-3 text-left text-xs font-semibold text-muted-foreground">
                    消息内容
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground">状态</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground">时间</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-muted-foreground">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {messages.map((msg) => (
                  <tr key={msg.id} className="transition-colors hover:bg-secondary/20">
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
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-foreground">
                          {(msg.username || "?").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {msg.username || `User #${msg.arenaAccountId}`}
                          </p>
                          <TierBadge tier="iron" />
                        </div>
                      </div>
                    </td>
                    <td className="max-w-[120px] truncate px-3 py-3 text-xs text-muted-foreground">
                      {msg.competitionTitle || `Competition #${msg.competitionId}`}
                    </td>
                    <td className="px-3 py-3">
                      <p
                        className={`text-sm ${
                          msg.moderationStatus === "deleted"
                            ? "line-through text-muted-foreground"
                            : msg.moderationStatus === "hidden"
                              ? "italic text-muted-foreground"
                              : "text-foreground"
                        }`}
                      >
                        {msg.message}
                      </p>
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status={msg.moderationStatus} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-xs text-muted-foreground">
                      {formatDate(msg.timestamp)}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {msg.moderationStatus === "visible" ? (
                          <>
                            <button
                              onClick={() => handleModerate(msg.id, "hidden")}
                              className="rounded-md p-1 text-[#F0B90B] transition-colors hover:bg-[oklch(0.82_0.15_85/10%)]"
                              title="隐藏"
                            >
                              <EyeOff className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleModerate(msg.id, "deleted")}
                              className="rounded-md p-1 text-[#F6465D] transition-colors hover:bg-[oklch(0.65_0.2_25/10%)]"
                              title="删除"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleModerate(msg.id, "visible")}
                            className="rounded-md p-1 text-[#0ECB81] transition-colors hover:bg-[oklch(0.65_0.2_145/10%)]"
                            title="恢复"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {messages.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      暂无聊天消息
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {totalPages > 1 ? (
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <p className="text-xs text-muted-foreground">
                第 {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} 条，共 {total} 条
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const p = page <= 3 ? i + 1 : page + i - 2;
                  if (p < 1 || p > totalPages) return null;
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`h-8 w-8 rounded-md text-xs font-medium ${
                        p === page
                          ? "bg-[#F0B90B] text-black"
                          : "text-muted-foreground hover:bg-secondary"
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary disabled:opacity-30"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
