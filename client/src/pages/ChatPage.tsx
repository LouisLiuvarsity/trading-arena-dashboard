/**
 * ChatPage — Chat moderation: view, hide, delete messages
 * Design: Dark Trading Desk
 */
import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  MessageSquare, Eye, EyeOff, Trash2, RotateCcw,
  AlertTriangle, Filter, Shield,
} from "lucide-react";
import DataTable, { type Column } from "@/components/DataTable";
import TierBadge from "@/components/TierBadge";
import StatusBadge from "@/components/StatusBadge";
import StatCard from "@/components/StatCard";
import {
  chatMessages, competitions, type ChatMessage,
} from "@/lib/mock-data";
import { toast } from "sonner";

function formatDateTime(ts: number) {
  return new Date(ts).toLocaleString("zh-CN", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default function ChatPage() {
  const [filterComp, setFilterComp] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const filtered = useMemo(() => {
    let result = chatMessages;
    if (filterComp !== "all") result = result.filter((m) => m.competitionId === Number(filterComp));
    if (filterStatus !== "all") result = result.filter((m) => m.status === filterStatus);
    return result;
  }, [filterComp, filterStatus]);

  const stats = useMemo(() => ({
    total: chatMessages.length,
    visible: chatMessages.filter((m) => m.status === "visible").length,
    hidden: chatMessages.filter((m) => m.status === "hidden").length,
    deleted: chatMessages.filter((m) => m.status === "deleted").length,
  }), []);

  const handleAction = (id: number, action: "hide" | "delete" | "restore") => {
    const labels = { hide: "已隐藏", delete: "已删除", restore: "已恢复" };
    toast.success(`消息 #${id} ${labels[action]}`);
  };

  const handleBatchAction = (action: "hide" | "delete" | "restore") => {
    const labels = { hide: "隐藏", delete: "删除", restore: "恢复" };
    toast.success(`已批量${labels[action]} ${selectedIds.size} 条消息`);
    setSelectedIds(new Set());
  };

  const columns: Column<ChatMessage>[] = [
    {
      key: "user",
      label: "用户",
      sortable: true,
      render: (m) => (
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-foreground shrink-0">
            {m.username.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{m.username}</p>
            <TierBadge tier={m.rankTier} size="sm" />
          </div>
        </div>
      ),
      getValue: (m) => m.username,
    },
    {
      key: "message",
      label: "消息内容",
      render: (m) => (
        <p className={`text-sm truncate max-w-md ${m.status === "deleted" ? "line-through text-muted-foreground" : m.status === "hidden" ? "text-muted-foreground italic" : "text-foreground"}`}>
          {m.message}
        </p>
      ),
    },
    {
      key: "competition",
      label: "比赛",
      render: (m) => (
        <span className="text-xs text-muted-foreground truncate block max-w-[150px]">{m.competitionTitle}</span>
      ),
    },
    {
      key: "status",
      label: "状态",
      sortable: true,
      render: (m) => <StatusBadge status={m.status} />,
      getValue: (m) => m.status,
    },
    {
      key: "time",
      label: "发送时间",
      sortable: true,
      render: (m) => <span className="text-xs text-muted-foreground">{formatDateTime(m.createdAt)}</span>,
      getValue: (m) => m.createdAt,
    },
    {
      key: "moderatedBy",
      label: "审核人",
      render: (m) => (
        m.moderatedBy ? (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Shield className="w-3 h-3" /> {m.moderatedBy}
          </span>
        ) : <span className="text-xs text-muted-foreground">—</span>
      ),
    },
    {
      key: "actions",
      label: "操作",
      align: "center",
      render: (m) => (
        <div className="flex items-center gap-1 justify-center" onClick={(e) => e.stopPropagation()}>
          {m.status === "visible" && (
            <>
              <button
                onClick={() => handleAction(m.id, "hide")}
                className="p-1.5 rounded-md text-[#F0B90B] hover:bg-[#F0B90B]/10 transition-colors"
                title="隐藏"
              >
                <EyeOff className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleAction(m.id, "delete")}
                className="p-1.5 rounded-md text-[#F6465D] hover:bg-[#F6465D]/10 transition-colors"
                title="删除"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          {m.status === "hidden" && (
            <>
              <button
                onClick={() => handleAction(m.id, "restore")}
                className="p-1.5 rounded-md text-[#0ECB81] hover:bg-[#0ECB81]/10 transition-colors"
                title="恢复"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleAction(m.id, "delete")}
                className="p-1.5 rounded-md text-[#F6465D] hover:bg-[#F6465D]/10 transition-colors"
                title="删除"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          {m.status === "deleted" && (
            <button
              onClick={() => handleAction(m.id, "restore")}
              className="p-1.5 rounded-md text-[#0ECB81] hover:bg-[#0ECB81]/10 transition-colors"
              title="恢复"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ),
    },
  ];

  const compsWithChat = competitions.filter((c) => ["completed", "live"].includes(c.status));

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div>
        <h1 className="font-display text-xl font-bold text-foreground">聊天管理</h1>
        <p className="text-sm text-muted-foreground mt-1">管理比赛聊天室消息，隐藏或删除违规内容</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="总消息数" value={stats.total} icon={<MessageSquare className="w-5 h-5" />} accentColor="#3B82F6" />
        <StatCard title="可见消息" value={stats.visible} icon={<Eye className="w-5 h-5" />} accentColor="#0ECB81" />
        <StatCard title="已隐藏" value={stats.hidden} icon={<EyeOff className="w-5 h-5" />} accentColor="#F0B90B" delay={0.1} />
        <StatCard title="已删除" value={stats.deleted} icon={<Trash2 className="w-5 h-5" />} accentColor="#F6465D" delay={0.15} />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <select
            value={filterComp}
            onChange={(e) => setFilterComp(e.target.value)}
            className="px-3 py-2 text-sm bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="all">全部比赛</option>
            {compsWithChat.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 text-sm bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="all">全部状态</option>
          <option value="visible">可见</option>
          <option value="hidden">已隐藏</option>
          <option value="deleted">已删除</option>
        </select>
      </div>

      {/* Messages Table */}
      <DataTable
        data={filtered}
        columns={columns}
        pageSize={15}
        searchPlaceholder="搜索消息内容或用户名..."
        searchFn={(m, q) =>
          m.message.toLowerCase().includes(q) ||
          m.username.toLowerCase().includes(q)
        }
        selectedIds={selectedIds}
        onSelectToggle={(id) => {
          setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
          });
        }}
        onSelectAll={() => {
          if (selectedIds.size === filtered.length) {
            setSelectedIds(new Set());
          } else {
            setSelectedIds(new Set(filtered.map((m) => m.id)));
          }
        }}
        getRowId={(m) => m.id}
        bulkActions={
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#F0B90B] font-semibold">已选 {selectedIds.size} 条</span>
            <button
              onClick={() => handleBatchAction("hide")}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-semibold text-[#F0B90B] border border-[#F0B90B]/30 rounded-lg hover:bg-[#F0B90B]/10 transition-colors"
            >
              <EyeOff className="w-3 h-3" /> 批量隐藏
            </button>
            <button
              onClick={() => handleBatchAction("delete")}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-semibold text-[#F6465D] border border-[#F6465D]/30 rounded-lg hover:bg-[#F6465D]/10 transition-colors"
            >
              <Trash2 className="w-3 h-3" /> 批量删除
            </button>
            <button
              onClick={() => handleBatchAction("restore")}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-semibold text-[#0ECB81] border border-[#0ECB81]/30 rounded-lg hover:bg-[#0ECB81]/10 transition-colors"
            >
              <RotateCcw className="w-3 h-3" /> 批量恢复
            </button>
          </div>
        }
        emptyMessage="暂无聊天消息"
      />
    </div>
  );
}
