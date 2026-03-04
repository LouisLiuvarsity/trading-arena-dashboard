import { STATUS_CONFIG } from "@/lib/mock-data";

interface StatusBadgeProps {
  status: string;
  pulse?: boolean;
}

export default function StatusBadge({ status, pulse = false }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || { label: status, color: "#848E9C" };

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold"
      style={{
        background: `${config.color}15`,
        color: config.color,
        border: `1px solid ${config.color}30`,
      }}
    >
      {pulse && (
        <span className="relative flex h-1.5 w-1.5">
          <span
            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
            style={{ background: config.color }}
          />
          <span
            className="relative inline-flex rounded-full h-1.5 w-1.5"
            style={{ background: config.color }}
          />
        </span>
      )}
      {config.label}
    </span>
  );
}
