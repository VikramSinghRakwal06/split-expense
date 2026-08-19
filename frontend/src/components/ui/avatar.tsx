import { cn } from "@/lib/utils";

/** Five hues pulled from the theme's chart palette so every avatar color
 *  already has a matching light/dark definition — no new tokens needed. */
const PALETTE = [
  "bg-[var(--chart-1)]/15 text-[var(--chart-1)]",
  "bg-[var(--chart-2)]/15 text-[var(--chart-2)]",
  "bg-[var(--chart-3)]/15 text-[var(--chart-3)]",
  "bg-[var(--chart-4)]/15 text-[var(--chart-4)]",
  "bg-[var(--chart-5)]/15 text-[var(--chart-5)]",
];

function colorFor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

function initialsFor(label: string) {
  const parts = label.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const SIZES = {
  sm: "size-5 text-[9px]",
  md: "size-6 text-[10px]",
  lg: "size-9 text-xs",
} as const;

/**
 * A colored initials circle, the same idea Splitwise/Slack use in place of a
 * real profile photo (this app never collects one). Color is a deterministic
 * hash of `userId`, not `name` — so a person's color stays stable even before
 * their name has resolved (see getDisplayNames's degrade-to-id fallback).
 */
export function Avatar({
  userId,
  name,
  size = "md",
  className,
}: {
  userId: string;
  name?: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const label = name ?? userId;
  return (
    <span
      title={name ?? userId}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold ring-1 ring-inset ring-black/5 dark:ring-white/10",
        SIZES[size],
        colorFor(userId),
        className,
      )}
    >
      {initialsFor(label)}
    </span>
  );
}
