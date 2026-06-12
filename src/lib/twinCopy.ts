export type TwinState = "Stable" | "Recovery Mode" | "Accelerating" | "Drifting";

export function getDashboardGreeting(
  twinState: TwinState,
  driftIndex: number,
  streak: number
): string {
  if (driftIndex > 40) {
    return "Your twin has noticed something. It's been watching.";
  }
  if (twinState === "Accelerating") {
    return "You're ahead of where your twin predicted. Here's what to do with that.";
  }
  if (twinState === "Drifting") {
    return "Something shifted this week. Your twin wants to show you what.";
  }
  if (streak >= 7) {
    return "Consistent week. Your twin is building a sharper picture of you.";
  }
  return "Quiet week. Your twin is watching for patterns.";
}

export function getTwinStateBadgeLabel(twinState: TwinState): string {
  const map: Record<TwinState, string> = {
    "Stable": "Stable",
    "Recovery Mode": "Recalibrating",
    "Accelerating": "Accelerating",
    "Drifting": "Needs attention",
  };
  return map[twinState];
}

export function getTwinStateBadgeTooltip(twinState: TwinState): string {
  const map: Record<TwinState, string> = {
    "Stable": "All three domains are holding steady.",
    "Recovery Mode": "One of your domains dropped this week. Your twin is watching the recovery.",
    "Accelerating": "All domains trending upward. Keep the pattern.",
    "Drifting": "Your behavior has shifted from your baseline. Your twin flagged it.",
  };
  return map[twinState];
}

export function getConfidenceLabel(logCount: number): string {
  const remaining = Math.max(0, 21 - logCount);
  if (remaining === 0) return "Your twin has a full picture.";
  if (remaining === 1) return "One more log and your twin sees the full picture.";
  return `${remaining} more logs and your twin sees the full picture.`;
}

export function getScoreCardMicroCopy(
  score: number,
  trend: "improving" | "declining" | "stable",
  domain: "health" | "finance" | "career"
): string {
  if (score < 40) return "your twin's most urgent focus";
  if (score < 60 && trend === "declining") return "one change could move this significantly";
  if (score >= 80 && trend === "improving") return "accelerating — keep the pattern";
  if (score >= 80) return "maintaining well";
  if (trend === "declining") return "slipping — your twin noticed";
  if (trend === "improving") return "improving this week";
  return "holding steady";
}

export function getIngestionContextLine(
  streak: number,
  driftIndex: number,
  droppedDomain: string | null,
  isFirstLog: boolean
): string {
  if (isFirstLog) {
    return "Your twin's first real picture of you starts now. Be honest — it's calibrating.";
  }
  if (driftIndex > 40) {
    return "Your twin detected a pattern shift this week. What actually happened?";
  }
  if (droppedDomain) {
    return `Your ${droppedDomain} score dropped this week. Your twin wants honest data today, not optimistic data.`;
  }
  if (streak >= 3) {
    return `Day ${streak}. Your twin is watching for consistency — log everything today.`;
  }
  return "What happened today?";
}

export function getScorePreviewCopy(
  domain: "health" | "finance" | "career",
  currentScore: number,
  projectedScore: number,
  lowestComponent: string
): string {
  const direction = projectedScore > currentScore ? "↑" : projectedScore < currentScore ? "↓" : "→";
  return `If you log this: ${domain} moves ${currentScore} ${direction} ${projectedScore}. Your twin says ${lowestComponent} is still the lever.`;
}
