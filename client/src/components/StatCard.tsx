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
      className="relative overflow-hidden rounded-xl border border-border bg-card p-4 lg:p-5"
    >
      {/* Accent glow */}
      <div
        className="absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl opacity-[0.07]"
        style={{ background: accentColor }}
      />

      <div className="flex items-start justify-between relative">
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">{title}</p>
          <p className="text-2xl lg:text-3xl font-display font-bold text-foreground tracking-tight">
            {value}
          </p>
          {subtitle && (
            <p className="text-[11px] text-muted-foreground">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1">
              <span
                className="text-xs font-mono font-semibold"
                style={{ color: trend.value >= 0 ? "#0ECB81" : "#F6465D" }}
              >
                {trend.value >= 0 ? "+" : ""}{trend.value}%
              </span>
              <span className="text-[10px] text-muted-foreground">{trend.label}</span>
            </div>
          )}
        </div>
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: `${accentColor}15`, color: accentColor }}
        >
          {icon}
        </div>
      </div>
    </motion.div>
  );
}
