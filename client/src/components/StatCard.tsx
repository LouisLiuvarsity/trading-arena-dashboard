import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  trend?: { value: number; label: string };
  accentColor?: string;
  delay?: number;
}

export default function StatCard({ title, value, subtitle, icon, trend, accentColor = "#F0B90B", delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="admin-panel relative overflow-hidden p-4 lg:p-5"
    >
      <div
        className="absolute inset-x-0 top-0 h-full opacity-90"
        style={{
          background: `radial-gradient(circle at top right, ${accentColor}20, transparent 34%), linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0))`,
        }}
      />

      <div className="relative flex items-start justify-between gap-4">
        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7E899B]">{title}</p>
          <p className="text-2xl font-display font-bold tracking-tight text-white lg:text-3xl">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-[#95A0B0]">{subtitle}</p>
          )}
          {trend && (
            <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.06] bg-black/10 px-2.5 py-1">
              <span
                className="text-xs font-mono font-semibold"
                style={{ color: trend.value >= 0 ? "#0ECB81" : "#F6465D" }}
              >
                {trend.value >= 0 ? "+" : ""}{trend.value}%
              </span>
              <span className="text-[10px] text-[#7E899B]">{trend.label}</span>
            </div>
          )}
        </div>
        <div
          className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border"
          style={{
            backgroundColor: `${accentColor}15`,
            borderColor: `${accentColor}20`,
            color: accentColor,
          }}
        >
          {icon}
        </div>
      </div>
    </motion.div>
  );
}
