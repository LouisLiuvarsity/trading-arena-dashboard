import { TIER_CONFIG, type RankTier } from "@/lib/mock-data";

interface TierBadgeProps {
  tier: RankTier;
  showLabel?: boolean;
  size?: "sm" | "md";
}

export default function TierBadge({ tier, showLabel = true, size = "sm" }: TierBadgeProps) {
  const config = TIER_CONFIG[tier];
  const dotSize = size === "sm" ? "w-2 h-2" : "w-2.5 h-2.5";
  const textSize = size === "sm" ? "text-[10px]" : "text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full ${textSize} font-semibold`}
      style={{
        background: `${config.color}15`,
        color: config.color,
        border: `1px solid ${config.color}30`,
      }}
    >
      <span className={`${dotSize} rounded-full`} style={{ background: config.color }} />
      {showLabel && config.label}
    </span>
  );
}
