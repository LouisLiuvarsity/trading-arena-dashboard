/**
 * AdminLogsPage — Operation audit log with real API
 */
import { useState } from "react";
import {
  FileText, Download, Search, ChevronLeft, ChevronRight, Loader2,
  Shield, UserX, UserCheck, MessageSquare, Trophy, Settings,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { toast } from "sonner";
import { formatDate, downloadCSV } from "@/lib/constants";

const ACTION_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  user_ban: { label: "封禁用户", color: "#F6465D", icon: <UserX className="w-3.5 h-3.5" /> },
  user_unban: { label: "解封用户", color: "#0ECB81", icon: <UserCheck className="w-3.5 h-3.5" /> },
  registration_accepted: { label: "批准报名", color: "#0ECB81", icon: <Trophy className="w-3.5 h-3.5" /> },
  registration_rejected: { label: "拒绝报名", color: "#F6465D", icon: <Trophy className="w-3.5 h-3.5" /> },
  chat_hidden: { label: "隐藏消息", color: "#F0B90B", icon: <MessageSquare className="w-3.5 h-3.5" /> },
  chat_deleted: { label: "删除消息", color: "#F6465D", icon: <MessageSquare className="w-3.5 h-3.5" /> },
  chat_visible: { label: "恢复消息", color: "#0ECB81", icon: <MessageSquare className="w-3.5 h-3.5" /> },
  chat_batch_hidden: { label: "批量隐藏消息", color: "#F0B90B", icon: <MessageSquare className="w-3.5 h-3.5" /> },
  chat_batch_deleted: { label: "批量删除消息", color: "#F6465D", icon: <MessageSquare className="w-3.5 h-3.5" /> },
  chat_batch_visible: { label: "批量恢复消息", color: "#0ECB81", icon: <MessageSquare className="w-3.5 h-3.5" /> },
};

const DEFAULT_ACTION = { label: "其他操作", color: "#848E9C", icon: <Settings className="w-3.5 h-3.5" /> };

export default function AdminLogsPage() {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState<string | undefined>(undefined);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const pageSize = 20;

  const { data, isLoading } = trpc.adminLogs.list.useQuery({
    page,
    pageSize,
    action: actionFilter,
    search: search || undefined,
  });

  const logs = data?.logs || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const handleExport = () => {
    if (!logs.length) return;
    const rows = logs.map(l => ({
      ID: l.id,
      操作: ACTION_CONFIG[l.action]?.label || l.action,
      管理员: l.adminName,
      目标类型: l.targetType,
      目标ID: l.targetId,
      描述: l.description,
      时间: new Date(l.createdAt).toISOString(),
    }));
    downloadCSV(rows, "trading_arena_admin_logs");
    toast.success("操作日志已导出");
  };

  return (
    <div className="mx-auto max-w-[1440px] space-y-6">
      <AdminPageHeader
        eyebrow="Audit Trail"
        title="操作日志"
        description="聚合所有后台关键动作，便于追踪封禁、审批和聊天治理等审计记录。"
        accentColor="#F0B90B"
        icon={<FileText className="h-4 w-4" />}
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
          { label: "日志总数", value: total, icon: <FileText className="h-4 w-4" />, tone: "gold" },
          {
            label: "当前页",
            value: `${page}/${Math.max(totalPages, 1)}`,
            icon: <Shield className="h-4 w-4" />,
            tone: "neutral",
          },
          {
            label: "已筛选动作",
            value: actionFilter ?? "全部",
            icon: <Settings className="h-4 w-4" />,
            tone: "blue",
          },
        ]}
      />

      {/* Filters */}
      <div className="admin-toolbar">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="搜索管理员或描述..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="admin-control w-full pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground"
            />
          </div>
          <button onClick={handleSearch} className="px-3 py-2 rounded-lg bg-[#F0B90B] text-black text-sm font-medium hover:bg-[#F0B90B]/90">
            搜索
          </button>
        </div>

        <select
          value={actionFilter ?? "all"}
          onChange={(e) => { setActionFilter(e.target.value === "all" ? undefined : e.target.value); setPage(1); }}
          className="admin-control px-3 py-2 text-sm"
        >
          <option value="all">全部操作</option>
          <option value="user_ban">封禁用户</option>
          <option value="user_unban">解封用户</option>
          <option value="registration_accepted">批准报名</option>
          <option value="registration_rejected">拒绝报名</option>
          <option value="chat_hidden">隐藏消息</option>
          <option value="chat_deleted">删除消息</option>
          <option value="chat_visible">恢复消息</option>
        </select>
      </div>

      {/* Logs Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-[#F0B90B]" />
        </div>
      ) : (
        <div className="admin-table-frame">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">操作</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">管理员</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">目标</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground min-w-[300px]">描述</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">时间</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs.map((log) => {
                  const config = ACTION_CONFIG[log.action] || DEFAULT_ACTION;
                  return (
                    <tr key={log.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span style={{ color: config.color }}>{config.icon}</span>
                          <span
                            className="text-xs font-medium px-2 py-0.5 rounded-full"
                            style={{ background: `${config.color}15`, color: config.color }}
                          >
                            {config.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Shield className="w-3.5 h-3.5 text-[#F0B90B]" />
                          <span className="text-sm font-medium text-foreground">{log.adminName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground">
                          {log.targetType} #{log.targetId}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground">{log.description}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(log.createdAt)}
                      </td>
                    </tr>
                  );
                })}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      <FileText className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                      暂无操作日志
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
