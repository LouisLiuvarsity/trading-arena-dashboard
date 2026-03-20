import { STATUS_CONFIG } from "@/lib/constants";

interface StatusBadgeProps {
  status: string;
  pulse?: boolean;
}

export default function StatusBadge({ status, pulse = false }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || { label: status, color: "#848E9C" };

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold"
      style={{
        background: `${config.color}14`,
        color: config.color,
        borderColor: `${config.color}26`,
      }}
    >
      {pulse && (
        <span className="relative flex h-2 w-2">
          <span
            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
            style={{ background: config.color }}
          />
          <span
            className="relative inline-flex h-2 w-2 rounded-full"
            style={{ background: config.color }}
          />
        </span>
      )}
      {config.label}
    </span>
  );
}
