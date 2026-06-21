import mongoose from "mongoose";

/**
 * For every goal-linked task from a previous day, create a fresh unchecked
 * copy dated today — unless today already has that (goalId + text) pair.
 * Returns true if any new tasks were inserted (and user was saved).
 */
export async function carryForwardGoalTasks(user: any): Promise<boolean> {
  const today = new Date().toISOString().split("T")[0];
  const allTasks: any[] = user.dailyTasks || [];

  const previousGoalTasks = allTasks.filter(
    (t) => t.goalId && typeof t.date === "string" && t.date < today
  );
  if (previousGoalTasks.length === 0) return false;

  // Deduplicate by (goalId, text) — most-recent date wins
  const templateMap = new Map<string, any>();
  const sorted = [...previousGoalTasks].sort((a, b) => b.date.localeCompare(a.date));
  for (const t of sorted) {
    const key = `${t.goalId.toString()}::${t.text}`;
    if (!templateMap.has(key)) templateMap.set(key, t);
  }

  // Keys already present for today
  const todayKeys = new Set(
    allTasks
      .filter((t) => t.goalId && t.date === today)
      .map((t) => `${t.goalId.toString()}::${t.text}`)
  );

  const newTasks: any[] = [];
  for (const [key, template] of templateMap) {
    if (!todayKeys.has(key)) {
      newTasks.push({
        _id: new mongoose.Types.ObjectId(),
        text: template.text,
        completed: false,
        date: today,
        goalId: template.goalId,
      });
    }
  }

  if (newTasks.length === 0) return false;

  user.dailyTasks.push(...newTasks);
  user.markModified("dailyTasks");
  await user.save();
  return true;
}
