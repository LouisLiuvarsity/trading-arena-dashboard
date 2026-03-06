/**
 * CompetitionStatusControl - Shows current status and available transitions
 */
import { useState } from "react";
import { ArrowRight, AlertTriangle, Loader2, Archive, ArchiveRestore } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import StatusBadge from "@/components/StatusBadge";
import { VALID_TRANSITIONS, STATUS_CONFIG } from "@/lib/constants";

interface Props {
  competitionId: number;
  currentStatus: string;
  archived?: boolean;
  onArchive?: (archived: boolean) => void;
}

const TRANSITION_LABELS: Record<string, { label: string; color: string; dangerous?: boolean }> = {
  announced: { label: "发布公告", color: "#3B82F6" },
  registration_open: { label: "开放报名", color: "#0ECB81" },
  registration_closed: { label: "关闭报名", color: "#F0B90B" },
  live: { label: "开始比赛", color: "#0ECB81", dangerous: true },
  ended_early: { label: "提前结束比赛", color: "#FF6B35", dangerous: true },
  cancelled: { label: "取消比赛", color: "#F6465D", dangerous: true },
};

export default function CompetitionStatusControl({ competitionId, currentStatus, archived, onArchive }: Props) {
  const [confirmTarget, setConfirmTarget] = useState<string | null>(null);
  const utils = trpc.useUtils();
  const isPurgedEndedEarly = currentStatus === "ended_early" && archived;

  const transitionMutation = trpc.competitions.transition.useMutation({
    onSuccess: (_data, variables) => {
      const label = STATUS_CONFIG[variables.status]?.label || variables.status;
      toast.success(
        variables.status === "ended_early"
          ? "比赛已提前结束，系统已执行强制平仓与结算"
          : `比赛状态已更新为「${label}」`
      );
      utils.competitions.list.invalidate();
      setConfirmTarget(null);
    },
    onError: (err: any) => {
      toast.error(err.message);
      utils.competitions.list.invalidate();
      setConfirmTarget(null);
    },
  });

  const validTransitions = VALID_TRANSITIONS[currentStatus] || [];
  const isTerminal = currentStatus === "completed" || currentStatus === "ended_early" || currentStatus === "cancelled";

  if (validTransitions.length === 0 && !isTerminal) return null;

  if (validTransitions.length === 0 && isTerminal) {
    if (!onArchive) return null;
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">终态:</span>
        <StatusBadge status={currentStatus} />
        {isPurgedEndedEarly ? (
          <span className="text-xs text-muted-foreground">已归档清理，不可恢复</span>
        ) : (
          <button
            onClick={() => onArchive(!archived)}
            className="px-3 py-1 rounded-md text-xs font-medium transition-colors"
            style={{ background: "#6B728015", color: "#6B7280" }}
          >
            {archived ? <ArchiveRestore className="w-3 h-3 inline mr-1" /> : <Archive className="w-3 h-3 inline mr-1" />}
            {archived ? "取消归档" : currentStatus === "ended_early" ? "归档并清理数据" : "归档比赛"}
          </button>
        )}
      </div>
    );
  }

  const handleTransition = (target: string) => {
    const info = TRANSITION_LABELS[target];
    if (info?.dangerous) {
      setConfirmTarget(target);
      return;
    }
    transitionMutation.mutate({ id: competitionId, status: target as any });
  };

  const confirmAction = () => {
    if (!confirmTarget) return;
    transitionMutation.mutate({ id: competitionId, status: confirmTarget as any });
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">状态流转:</span>
        <StatusBadge status={currentStatus} />
        <ArrowRight className="w-3 h-3 text-muted-foreground" />
        {validTransitions.map((target) => {
          const info = TRANSITION_LABELS[target] || { label: target, color: "#848E9C" };
          return (
            <button
              key={target}
              onClick={() => handleTransition(target)}
              disabled={transitionMutation.isPending}
              className="px-3 py-1 rounded-md text-xs font-medium transition-colors disabled:opacity-50"
              style={{ background: `${info.color}15`, color: info.color }}
            >
              {transitionMutation.isPending && transitionMutation.variables?.status === target && (
                <Loader2 className="w-3 h-3 animate-spin inline mr-1" />
              )}
              {info.label}
            </button>
          );
        })}
      </div>

      {confirmTarget && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-[oklch(0.65_0.2_25/10%)] border border-[oklch(0.65_0.2_25/20%)]">
          <AlertTriangle className="w-4 h-4 text-[#F6465D] shrink-0" />
          <div className="flex flex-col gap-1">
            <span className="text-xs text-foreground">
              确认要将比赛状态变更为「{TRANSITION_LABELS[confirmTarget]?.label}」吗？此操作不可撤销。
            </span>
            {confirmTarget === "ended_early" && (
              <span className="text-xs text-muted-foreground">
                系统会先平掉所有用户仓位，保留结果数据，后续归档时再一并清理。
              </span>
            )}
          </div>
          <button
            onClick={confirmAction}
            disabled={transitionMutation.isPending}
            className="ml-auto px-3 py-1 rounded-md bg-[#F6465D] text-white text-xs font-medium hover:bg-[#F6465D]/80 transition-colors disabled:opacity-50"
          >
            {transitionMutation.isPending && <Loader2 className="w-3 h-3 animate-spin inline mr-1" />}
            确认
          </button>
          <button
            onClick={() => setConfirmTarget(null)}
            className="px-3 py-1 rounded-md bg-secondary text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            取消
          </button>
        </div>
      )}
    </div>
  );
}
