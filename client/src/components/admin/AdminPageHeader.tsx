import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type HeaderTone = "gold" | "green" | "blue" | "red" | "neutral";

const TONE_STYLES: Record<
  HeaderTone,
  { color: string; backgroundColor: string; borderColor: string }
> = {
  gold: {
    color: "#F0B90B",
    backgroundColor: "rgba(240,185,11,0.12)",
    borderColor: "rgba(240,185,11,0.2)",
  },
  green: {
    color: "#0ECB81",
    backgroundColor: "rgba(14,203,129,0.12)",
    borderColor: "rgba(14,203,129,0.2)",
  },
  blue: {
    color: "#7AA2F7",
    backgroundColor: "rgba(122,162,247,0.14)",
    borderColor: "rgba(122,162,247,0.22)",
  },
  red: {
    color: "#F6465D",
    backgroundColor: "rgba(246,70,93,0.12)",
    borderColor: "rgba(246,70,93,0.2)",
  },
  neutral: {
    color: "#D6DDE8",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.08)",
  },
};

export interface AdminHeaderStat {
  label: string;
  value: string | number;
  icon?: ReactNode;
  tone?: HeaderTone;
}

interface AdminPageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  accentColor?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  stats?: AdminHeaderStat[];
  className?: string;
}

function AdminHeaderStatCard({ label, value, icon, tone = "neutral" }: AdminHeaderStat) {
  const toneStyle = TONE_STYLES[tone];

  return (
    <div className="rounded-[24px] border border-white/[0.06] bg-black/12 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] uppercase tracking-[0.18em] text-[#7E899B]">{label}</p>
        {icon ? (
          <span
            className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border"
            style={toneStyle}
          >
            {icon}
          </span>
        ) : null}
      </div>
      <p className="mt-3 text-2xl font-display font-bold text-white">{value}</p>
    </div>
  );
}

export default function AdminPageHeader({
  eyebrow = "Admin Control",
  title,
  description,
  accentColor = "#F0B90B",
  icon,
  actions,
  stats,
  className,
}: AdminPageHeaderProps) {
  const glowStyle = {
    background: `radial-gradient(circle at top left, ${accentColor}28, transparent 34%), linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0))`,
  };

  return (
    <section className={cn("admin-hero", className)}>
      <div className="absolute inset-0 opacity-90" style={glowStyle} />
      <div className="relative flex flex-col gap-6 p-6 lg:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[#F0B90B]">
              {icon ? <span className="inline-flex">{icon}</span> : null}
              <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#F0B90B]/85">
                {eyebrow}
              </span>
            </div>
            <div>
              <h1 className="text-3xl font-display font-bold tracking-tight text-white lg:text-[2rem]">
                {title}
              </h1>
              {description ? <p className="mt-2 max-w-3xl text-sm text-[#96A1B1]">{description}</p> : null}
            </div>
          </div>

          {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
        </div>

        {stats?.length ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <AdminHeaderStatCard key={`${stat.label}-${stat.value}`} {...stat} />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
