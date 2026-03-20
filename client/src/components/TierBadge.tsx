import { TIER_CONFIG, type RankTier } from "@/lib/constants";

interface TierBadgeProps {
  tier: RankTier;
  showLabel?: boolean;
  size?: "sm" | "md";
}

export default function TierBadge({ tier, showLabel = true, size = "sm" }: TierBadgeProps) {
  const config = TIER_CONFIG[tier];
  if (!config) return null;
  const dotSize = size === "sm" ? "h-2 w-2" : "h-2.5 w-2.5";
  const textSize = size === "sm" ? "text-[11px]" : "text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${textSize} font-semibold`}
      style={{
        background: `${config.color}14`,
        color: config.color,
        borderColor: `${config.color}24`,
      }}
    >
      <span className={`${dotSize} rounded-full`} style={{ background: config.color }} />
      {showLabel && config.label}
    </span>
  );
}
