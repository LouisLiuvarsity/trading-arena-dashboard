/**
 * SeasonsPage — Season management with create functionality
 */
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Calendar, Plus, Trophy, Loader2, Hash, Archive, ArchiveRestore, Trash2, AlertTriangle,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { toast } from "sonner";
import StatusBadge from "@/components/StatusBadge";
import StatCard from "@/components/StatCard";
import { formatDate } from "@/lib/constants";

export default function SeasonsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [archiveFilter, setArchiveFilter] = useState<"active" | "archived" | "all">("active");
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    startDate: "",
    endDate: "",
  });

  const utils = trpc.useUtils();
  const { data: seasons, isLoading } = trpc.seasons.list.useQuery();

  const createMutation = trpc.seasons.create.useMutation({
    onSuccess: () => {
      toast.success("赛季创建成功");
      utils.seasons.list.invalidate();
      setShowCreate(false);
      setForm({ name: "", slug: "", startDate: "", endDate: "" });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const archiveMutation = trpc.seasons.archive.useMutation({
    onSuccess: (_data, variables) => {
      toast.success(variables.archived ? "赛季已归档" : "赛季已取消归档");
      utils.seasons.list.invalidate();
      utils.competitions.list.invalidate();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = trpc.seasons.delete.useMutation({
    onSuccess: (data) => {
      toast.success(`赛季已永久删除（级联删除 ${data.competitionsDeleted} 场比赛）`);
      utils.seasons.list.invalidate();
      utils.competitions.list.invalidate();
      utils.stats.platform.invalidate();
      setConfirmDeleteId(null);
    },
    onError: (err: any) => { toast.error(err.message); setConfirmDeleteId(null); },
  });

  const handleCreate = () => {
    if (!form.name || !form.slug || !form.startDate || !form.endDate) {
      toast.error("请填写所有必填字段");
      return;
    }
    const startTs = new Date(form.startDate).getTime();
    const endTs = new Date(form.endDate).getTime();
    if (endTs <= startTs) {
      toast.error("结束日期必须晚于开始日期");
      return;
    }
    createMutation.mutate({
      name: form.name,
      slug: form.slug,
      startDate: startTs,
      endDate: endTs,
    });
  };

  const autoSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 32);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#F0B90B]" />
      </div>
    );
  }

  const archivedCount = (seasons || []).filter(s => s.archived === 1).length;
  const filteredSeasons = (seasons || []).filter(s => {
    if (archiveFilter === "active") return s.archived !== 1;
    if (archiveFilter === "archived") return s.archived === 1;
    return true;
  });

  const activeSeasons = (seasons || []).filter(s => s.status === "active").length;
  const totalComps = (seasons || []).reduce((s, r) => s + r.competitionCount, 0);

  return (
    <div className="mx-auto max-w-[1440px] space-y-6">
      <AdminPageHeader
        eyebrow="Season Planning"
        title="赛季管理"
        description="按月维护赛季周期，控制归档和删除前置条件，保证比赛数据的生命周期清晰可追踪。"
        accentColor="#F0B90B"
        icon={<Calendar className="h-4 w-4" />}
        actions={
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#F0B90B] px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-[#F0B90B]/90"
          >
            <Plus className="h-4 w-4" />
            创建赛季
          </button>
        }
        stats={[
          { label: "总赛季数", value: (seasons || []).length, icon: <Calendar className="h-4 w-4" />, tone: "gold" },
          { label: "进行中", value: activeSeasons, icon: <Trophy className="h-4 w-4" />, tone: "green" },
          { label: "总比赛数", value: totalComps, icon: <Hash className="h-4 w-4" />, tone: "blue" },
          { label: "已归档", value: archivedCount, icon: <Archive className="h-4 w-4" />, tone: "neutral" },
        ]}
      />

      {/* Archive Filter Tabs */}
      <div className="admin-toolbar w-fit">
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
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard title="总赛季数" value={(seasons || []).length} icon={<Calendar className="w-5 h-5" />} accentColor="#F0B90B" />
        <StatCard title="进行中" value={activeSeasons} icon={<Trophy className="w-5 h-5" />} accentColor="#0ECB81" />
        <StatCard title="总比赛数" value={totalComps} icon={<Hash className="w-5 h-5" />} accentColor="#3B82F6" delay={0.1} />
      </div>

      {/* Create Season Form */}
      {showCreate && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="admin-panel space-y-4 p-5"
        >
          <h3 className="text-sm font-bold text-foreground">创建新赛季</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">赛季名称 *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => {
                  setForm(f => ({ ...f, name: e.target.value, slug: autoSlug(e.target.value) }));
                }}
                placeholder="例如: Season 1"
                className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-[#F0B90B]"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Slug *</label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => setForm(f => ({ ...f, slug: e.target.value }))}
                placeholder="season-1"
                className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-[#F0B90B]"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">开始日期 *</label>
              <input
                type="datetime-local"
                value={form.startDate}
                onChange={(e) => setForm(f => ({ ...f, startDate: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-[#F0B90B]"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">结束日期 *</label>
              <input
                type="datetime-local"
                value={form.endDate}
                onChange={(e) => setForm(f => ({ ...f, endDate: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-[#F0B90B]"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleCreate}
              disabled={createMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#F0B90B] text-black text-sm font-semibold hover:bg-[#F0B90B]/90 transition-colors disabled:opacity-50"
            >
              {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              确认创建
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 rounded-lg bg-secondary text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              取消
            </button>
          </div>
        </motion.div>
      )}

      {/* Season Cards */}
      <div className="space-y-3">
        {filteredSeasons.map((season) => (
          <motion.div
            key={season.id}
            layout
            className="admin-panel p-4 lg:p-5"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[oklch(0.82_0.15_85/10%)] text-[#F0B90B]">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    {season.name}
                    <StatusBadge status={season.status || "active"} />
                    {season.archived === 1 && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#6B7280]/15 text-[#6B7280]">已归档</span>
                    )}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {season.slug} · 衰减系数 {season.pointsDecayFactor}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right hidden sm:block">
                  <p className="text-xs text-muted-foreground">比赛数</p>
                  <p className="text-sm font-mono font-semibold text-foreground">
                    {season.completedCount}/{season.competitionCount}
                  </p>
                </div>
                <div className="text-right hidden sm:block">
                  <p className="text-xs text-muted-foreground">时间</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(season.startDate)} ~ {formatDate(season.endDate)}
                  </p>
                </div>
                <button
                  onClick={() => archiveMutation.mutate({ id: season.id, archived: season.archived !== 1 })}
                  disabled={archiveMutation.isPending}
                  className="p-1.5 rounded-md hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                  title={season.archived === 1 ? "取消归档" : "归档"}
                >
                  {season.archived === 1 ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                </button>
                {season.archived === 1 && (
                  <button
                    onClick={() => setConfirmDeleteId(season.id)}
                    className="p-1.5 rounded-md hover:bg-[oklch(0.65_0.2_25/10%)] text-[#F6465D] transition-colors"
                    title="永久删除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        ))}

        {filteredSeasons.length === 0 && (
          <div className="text-center py-16 text-sm text-muted-foreground">
            {archiveFilter === "archived" ? "暂无已归档的赛季" : archiveFilter === "all" ? "暂无赛季数据" : "暂无赛季数据，点击上方按钮创建第一个赛季"}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {confirmDeleteId && (() => {
        const targetSeason = seasons?.find(s => s.id === confirmDeleteId);
        const hasUnarchivedComps = (targetSeason?.unarchivedCompCount ?? 0) > 0;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full mx-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#F6465D]/10 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-[#F6465D]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">确认永久删除</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    赛季「{targetSeason?.name}」
                  </p>
                </div>
              </div>
              {hasUnarchivedComps && (
                <div className="p-3 rounded-lg bg-[#F0B90B]/10 border border-[#F0B90B]/30 text-xs text-foreground space-y-1">
                  <p className="font-semibold text-[#F0B90B]">无法删除</p>
                  <p>该赛季下还有 <span className="font-bold">{targetSeason?.unarchivedCompCount}</span> 场比赛未归档。</p>
                  <p className="text-muted-foreground">请先在「比赛管理」中归档所有比赛后再删除赛季。</p>
                </div>
              )}
              <div className="p-3 rounded-lg bg-[#F6465D]/5 border border-[#F6465D]/20 text-xs text-foreground space-y-1">
                <p>此操作将永久删除以下所有数据且不可恢复：</p>
                <ul className="list-disc list-inside text-muted-foreground">
                  <li>赛季本身</li>
                  <li>该赛季下的所有比赛（{targetSeason?.competitionCount ?? 0} 场）及其配置</li>
                  <li>所有比赛的报名记录、结果、交易记录、聊天消息</li>
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
                  disabled={deleteMutation.isPending || hasUnarchivedComps}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#F6465D] text-white text-sm font-semibold hover:bg-[#F6465D]/80 transition-colors disabled:opacity-50"
                >
                  {deleteMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  确认删除
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
