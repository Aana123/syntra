import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Log from "@/models/Log";

// Helper to refresh Google Fit OAuth tokens
async function refreshAccessToken(user: any): Promise<string> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth configuration is missing Client ID or Secret.");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: user.googleFit.refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    console.error("Token refresh response error:", data);
    throw new Error(data.error_description || "Could not refresh token");
  }

  user.googleFit.accessToken = data.access_token;
  user.googleFit.expiryDate = new Date(Date.now() + data.expires_in * 1000);
  await user.save();
  return data.access_token;
}

// Queries Google Fit aggregate data for a specific time range
async function fetchAggregateMetric(accessToken: string, startTimeMs: number, endTimeMs: number, dataType: string) {
  try {
    const res = await fetch("https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        aggregateBy: [{ dataTypeName: dataType }],
        bucketByTime: { durationMillis: endTimeMs - startTimeMs },
        startTimeMillis: startTimeMs,
        endTimeMillis: endTimeMs,
      }),
    });

    if (!res.ok) {
      console.warn(`Failed to fetch metric ${dataType}: status ${res.status}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error(`Error fetching aggregate metric ${dataType}:`, err);
    return null;
  }
}

// Queries Sleep and Workout sessions
async function fetchSessions(accessToken: string, startTimeIso: string, endTimeIso: string) {
  try {
    const res = await fetch(
      `https://www.googleapis.com/fitness/v1/users/me/sessions?startTime=${startTimeIso}&endTime=${endTimeIso}`,
      {
        headers: { "Authorization": `Bearer ${accessToken}` },
      }
    );
    if (!res.ok) {
      console.warn(`Failed to fetch sessions: status ${res.status}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error("Error fetching sessions:", err);
    return null;
  }
}

/**
 * HRV Fallback Estimation:
 * Estimates Heart Rate Variability (RMSSD in ms) based on average resting heart rate.
 * Formula: HRV base = 80 - (avgHR - 60) * 0.5.
 */
function estimateHRV(avgHR: number): number {
  if (!avgHR || avgHR <= 0) return 55; // Default baseline if HR is also unavailable
  const baseHRV = 80 - (avgHR - 60) * 0.5;
  // Clamp between 20ms and 120ms
  return Math.max(20, Math.min(120, Math.round(baseHRV)));
}

export async function syncGoogleFitData(userId: string) {
  await connectDB();
  const user = await User.findById(userId);
  if (!user || !user.googleFit?.syncActive) {
    throw new Error("Google Fit sync is not active or user not found.");
  }

  let token = user.googleFit.accessToken;
  const expiry = user.googleFit.expiryDate;
  if (!token || !expiry || new Date() >= new Date(expiry)) {
    console.log(`Google Fit Token expired for user ${userId}. Refreshing token...`);
    token = await refreshAccessToken(user);
  }

  // Set timezone-aware boundaries for yesterday
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  
  const startOfDay = new Date(yesterday);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(yesterday);
  endOfDay.setHours(23, 59, 59, 999);

  const startTimeMs = startOfDay.getTime();
  const endTimeMs = endOfDay.getTime();

  // 1. Fetch Steps
  const stepsData = await fetchAggregateMetric(token, startTimeMs, endTimeMs, "com.google.step_count.delta");
  const steps = stepsData?.bucket?.[0]?.dataset?.[0]?.point?.[0]?.value?.[0]?.intVal || 0;

  // 2. Fetch Heart Rate (avg bpm)
  const hrData = await fetchAggregateMetric(token, startTimeMs, endTimeMs, "com.google.heart_rate.bpm");
  const avgHR = hrData?.bucket?.[0]?.dataset?.[0]?.point?.[0]?.value?.[0]?.fpVal || 0;

  // 3. Fetch SpO2 (avg percent)
  const spo2Data = await fetchAggregateMetric(token, startTimeMs, endTimeMs, "com.google.oxygen_saturation");
  const avgSpO2 = spo2Data?.bucket?.[0]?.dataset?.[0]?.point?.[0]?.value?.[0]?.fpVal || 0;

  // 4. Fetch HRV
  const hrvData = await fetchAggregateMetric(token, startTimeMs, endTimeMs, "com.google.heart_rate.variability");
  let hrv = hrvData?.bucket?.[0]?.dataset?.[0]?.point?.[0]?.value?.[0]?.fpVal || 0;

  // Apply fallback estimation if HRV is absent
  let isHrvEstimated = false;
  if (hrv <= 0) {
    hrv = estimateHRV(avgHR);
    isHrvEstimated = true;
  }

  // 5. Fetch Sleep & Workouts via Sessions API
  const sessionsData = await fetchSessions(token, startOfDay.toISOString(), endOfDay.toISOString());
  
  const sleepSessions = sessionsData?.session?.filter((s: any) => s.activityType === 72) || [];
  let totalSleepSeconds = 0;
  sleepSessions.forEach((s: any) => {
    totalSleepSeconds += (Number(s.endTimeMillis) - Number(s.startTimeMillis)) / 1000;
  });
  const sleepHours = parseFloat((totalSleepSeconds / 3600).toFixed(1));

  const workoutSessions = sessionsData?.session?.filter((s: any) => s.activityType !== 72) || [];
  const workouts = workoutSessions.map((w: any) => ({
    name: w.name,
    durationMinutes: Math.round((Number(w.endTimeMillis) - Number(w.startTimeMillis)) / 60000),
    activityType: w.activityType,
  }));

  // Find existing Log for yesterday
  const existingLog = await Log.findOne({
    userId: user._id,
    domain: "health",
    date: {
      $gte: startOfDay,
      $lte: endOfDay,
    }
  });

  const googleFitPayload = {
    steps: steps > 0 ? steps : undefined,
    sleepHours: sleepHours > 0 ? sleepHours : undefined,
    avgHeartRate: avgHR > 0 ? Math.round(avgHR) : undefined,
    oxygenSaturation: avgSpO2 > 0 ? parseFloat((avgSpO2 * 100).toFixed(1)) : undefined,
    hrv: Math.round(hrv),
    isHrvEstimated,
    workouts: workouts.length > 0 ? workouts : undefined,
    source: "google-fit"
  };

  // Filter undefined values so we don't clear existing manually logged data on merge
  const cleanFitPayload = Object.fromEntries(
    Object.entries(googleFitPayload).filter(([_, v]) => v !== undefined)
  );

  if (existingLog) {
    // MERGE logic: Combine existing log data with new Google Fit telemetry
    existingLog.domainData = {
      ...existingLog.domainData,
      ...cleanFitPayload,
      // If workouts already exist, merge arrays instead of discarding
      workouts: [
        ...(existingLog.domainData?.workouts || []),
        ...(cleanFitPayload.workouts || [])
      ].filter((v, i, self) => self.findIndex(t => t.name === v.name) === i) // Deduplicate workouts by name
    };
    await existingLog.save();
  } else {
    // Create new log entry
    await Log.create({
      userId: user._id,
      date: startOfDay,
      domain: "health",
      domainData: cleanFitPayload
    });
  }

  // Update sync timestamp
  user.googleFit.lastSyncedAt = new Date();
  await user.save();

  return {
    success: true,
    syncedMetrics: Object.keys(cleanFitPayload)
  };
}
