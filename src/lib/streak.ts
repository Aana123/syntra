// src/lib/streak.ts
import Log from "@/models/Log";

/**
 * Recalculates the user's logging streak in-memory by analyzing their log dates in the database.
 * This ensures historical data uploads automatically heal streaks instead of resetting them.
 */
export async function recalculateStreak(user: any): Promise<void> {
  if (!user || !user._id) return;

  // Fetch all log dates for this user
  const logs = await Log.find({ userId: user._id }, { date: 1 }).lean();

  if (logs.length === 0) {
    user.gamification.currentStreak = 0;
    user.gamification.lastLogDate = null;
    return;
  }

  // Normalize log dates to YYYY-MM-DD strings in local time to avoid timezone offsets
  const uniqueDates = Array.from(
    new Set(
      logs.map((log) => {
        const d = new Date(log.date);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
      })
    )
  ).sort((a, b) => b.localeCompare(a)); // Sort in descending order (newest first)

  const latestLogDateStr = uniqueDates[0];
  const latestLogDate = new Date(latestLogDateStr + "T00:00:00");

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;

  // If the latest log date is older than yesterday, the streak has decayed/broken
  if (latestLogDateStr !== todayStr && latestLogDateStr !== yesterdayStr) {
    user.gamification.currentStreak = 0;
    user.gamification.lastLogDate = latestLogDate;
    return;
  }

  // Count consecutive days backward starting from the latest log date
  let currentStreak = 1;
  const checkDate = new Date(latestLogDateStr + "T00:00:00");

  while (true) {
    checkDate.setDate(checkDate.getDate() - 1);
    const checkDateStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, "0")}-${String(checkDate.getDate()).padStart(2, "0")}`;
    if (uniqueDates.includes(checkDateStr)) {
      currentStreak++;
    } else {
      break;
    }
  }

  user.gamification.currentStreak = currentStreak;

  // Preserve the existing lastLogDate timestamp if it matches the latest log date string,
  // preventing resetting the hours/minutes/seconds of logging today.
  if (user.gamification.lastLogDate) {
    const existingLastLogDate = new Date(user.gamification.lastLogDate);
    const existingLastLogStr = `${existingLastLogDate.getFullYear()}-${String(existingLastLogDate.getMonth() + 1).padStart(2, "0")}-${String(existingLastLogDate.getDate()).padStart(2, "0")}`;
    if (existingLastLogStr !== latestLogDateStr) {
      user.gamification.lastLogDate = latestLogDate;
    }
  } else {
    user.gamification.lastLogDate = latestLogDate;
  }
}
