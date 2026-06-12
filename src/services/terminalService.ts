//src/services/terminalService.ts
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Log from "@/models/Log";
import Telemetry from "@/models/Telemetry";
import { runSimulation } from "@/lib/simulator";
import { buildTwinContext } from "@/lib/aiContextBuilder";
import { callGemini } from "@/lib/gemini";
import mongoose from "mongoose";
import { ApiError } from "@/lib/apiError";
import { memoizeAsync } from "@/lib/memoize";


/**
 * Service to execute terminal CLI commands, run biometric simulations, and query the Gemini AI Core.
 */
export async function processTerminalCommand(
  userId: string,
  email: string,
  command: string
): Promise<string> {
  const trimmedCommand = command.trim();
  if (!trimmedCommand) {
    return "System listening. Type 'help' for options.";
  }

  const lowerCommand = trimmedCommand.toLowerCase();

  // 1. HELP (Stateless Command Registry)
  if (lowerCommand === "help") {
    const helpOutput = `
==================================================
          SYNTRA MISSION CONTROL OS v1.2
==================================================
Available commands:
  help                     Show this command registry
  status                   Digital Twin metrics & sync levels
  goals                    Active SMART goals & milestones
  history                  5 most recent activity logs
  badges                   Achievement registry (earned & locked)
  scan                     Run behavioral anomaly detection
  simulate <d> <change>%   Simulate domain change impact
                           e.g. 'simulate health +35%'
                           e.g. 'simulate career -15%'
  metrics                  Show real-time latency & cache stats
  ai <query>               Query Syntra AI Core directly
  clear                    Flush console buffer

Any unrecognized input routes to AI Core.
==================================================
`;
    return helpOutput;
  }

  // 2. CLEAR (Stateless Command Registry)
  if (lowerCommand === "clear") {
    return "Neural console buffer flushed successfully. Awaiting operator input...";
  }

  // NEW: TELEMETRY (Metrics Command)
  if (lowerCommand === "metrics" || lowerCommand === "telemetry") {
    return await generateMetricsOutput(userId);
  }

  // 3. Connect to Database for Stateful Commands
  await connectDB();

  // Fetch current user profiles and logs using the memoized DB helper
  const [user, recentLogs] = await Promise.all([
    getUserById(userId),
    Log.find({ userId: new mongoose.Types.ObjectId(userId) })
      .sort({ date: -1 })
      .limit(21)
      .lean()
  ]);

  if (!user) {
    throw new ApiError(404, "[-] SYSTEM ERROR: Digital Twin data model not found in DB.");
  }



  // Build the exact behavioral context for the current user
  const twinContext = buildTwinContext(recentLogs);

  // Map behavior flags to terminal snake_case strings
  const activeFlags: string[] = [];
  if (twinContext) {
    if (twinContext.behaviorFlags.stressSpendingCorrelation) activeFlags.push("stress_linked_spending");
    if (twinContext.behaviorFlags.sleepCareerCorrelation) activeFlags.push("chronic_sleep_deprivation");
    if (twinContext.behaviorFlags.workoutMoodCorrelation) activeFlags.push("workout_mood_correlation");
    if (twinContext.behaviorFlags.lateNightSpending) activeFlags.push("late_night_spending");
    if (twinContext.behaviorFlags.weekendDropoff) activeFlags.push("weekend_dropoff");
  }

  // Command: STATUS / INFO / TWIN
  if (["status", "info", "twin"].includes(lowerCommand)) {
    const health = user.scores.health;
    const finance = user.scores.finance;
    const career = user.scores.career;
    const syntraCore = Math.round((health + finance + career) / 3);

    const statusOutput = `
==================================================
             DIGITAL TWIN STATUS REPORT
==================================================
OPERATOR:       ${user.name}
CORE SYNC:      ${syntraCore}% (Overall Life Sync Index)

DOMAIN INTEGRATION LEVELS:
  💚 Health Score:   ${health}/100 [${health >= 80 ? "EXCELLENT" : health >= 50 ? "NOMINAL" : "CRITICAL"}]
  💰 Finance Score:  ${finance}/100 [${finance >= 80 ? "EXCELLENT" : finance >= 50 ? "NOMINAL" : "CRITICAL"}]
  🚀 Career Score:   ${career}/100 [${career >= 80 ? "EXCELLENT" : career >= 50 ? "NOMINAL" : "CRITICAL"}]

GAMIFICATION ENGINE STATE:
  🔥 Streak Index:   ${user.gamification?.currentStreak ?? 0} days active
  🏆 Score Points:   ${user.gamification?.totalPoints ?? 0} PT
  🏅 Badges Active:  ${user.badges && user.badges.length > 0 ? user.badges.join(", ") : "No badges unlocked yet."}
==================================================
`;
    return statusOutput;
  }

  // Command: SCAN
  if (lowerCommand === "scan") {
    const flags = activeFlags;
    const scanOutput = `
==================================================
           BEHAVIORAL ANOMALY SCAN
==================================================
SCAN STATUS: COMPLETE
ANOMALIES DETECTED: ${flags.length}

${flags.length > 0 
  ? flags.map(f => `  [!] ${f.replace(/_/g, " ").toUpperCase()}`).join("\n")
  : "  [✓] No behavioral anomalies detected."}

RECOMMENDATION:
  ${flags.includes("stress_linked_spending") 
    ? "Stress-spending correlation active. Reduce discretionary exposure." 
    : flags.includes("chronic_sleep_deprivation")
    ? "Sleep deficit accumulating. Prioritize recovery window tonight."
    : "Twin behavioral model operating within normal parameters."}
==================================================
`;
    return scanOutput;
  }

  // Command: BADGES
  if (lowerCommand === "badges") {
    const earned: string[] = user.badges?.length > 0 ? user.badges : [];
    const all: string[] = ["Week Warrior", "Month Master", "Rising Twin", "Savings Streak", "Learning Machine"];
    const locked = all.filter((b: string) => !earned.includes(b));
    
    const badgeOutput = `
==================================================
              ACHIEVEMENT REGISTRY
==================================================
UNLOCKED:
${earned.length > 0 ? earned.map((b: string) => `  [✓] ${b}`).join("\n") : "  No badges unlocked yet."}

LOCKED:
${locked.map((b: string) => `  [🔒] ${b}`).join("\n")}
==================================================
`;
    return badgeOutput;
  }

  // Command: GOALS
  if (lowerCommand === "goals") {
    if (!user.goals || user.goals.length === 0) {
      return `
==================================================
                   ACTIVE GOALS
==================================================
No active goals found.
Use the main dashboard to establish your SMART targets.
==================================================
`;
    }

    let goalsOutput = `
==================================================
                   ACTIVE GOALS
==================================================
`;
    user.goals.forEach((goal: any, idx: number) => {
      const target = goal.targetDate ? new Date(goal.targetDate).toLocaleDateString() : "N/A";
      goalsOutput += `[${idx + 1}] [${goal.domain.toUpperCase()}] [Priority: ${goal.priority.toUpperCase()}]\n`;
      goalsOutput += `     Title:  ${goal.title}\n`;
      goalsOutput += `     Target: ${target}\n`;
      goalsOutput += `     Milestones:\n`;
      
      if (!goal.milestones || goal.milestones.length === 0) {
        goalsOutput += "       - No milestones defined.\n";
      } else {
        goal.milestones.forEach((milestone: any) => {
          goalsOutput += `       [${milestone.completed ? "x" : " "}] ${milestone.text}\n`;
        });
      }
      goalsOutput += "--------------------------------------------------\n";
    });

    return goalsOutput;
  }

  // Command: HISTORY / LOGS
  if (["history", "logs"].includes(lowerCommand)) {
    if (!recentLogs || recentLogs.length === 0) {
      return `
==================================================
                 ACTIVITY HISTORY
==================================================
No log records found on database.
Log daily biometric logs to seed this dashboard.
==================================================
`;
    }

    let historyOutput = `
==================================================
                 ACTIVITY HISTORY
==================================================
`;
    recentLogs.slice(0, 5).forEach((log) => {
      const formattedDate = new Date(log.date).toLocaleDateString() + " " + new Date(log.date).toLocaleTimeString();
      historyOutput += `[${formattedDate}] [${log.domain.toUpperCase()} LOG]\n`;
      historyOutput += `  Metrics: ${JSON.stringify(log.domainData)}\n`;
      historyOutput += "--------------------------------------------------\n";
    });

    return historyOutput;
  }

  // Command: SIMULATE
  const simulateMatch = trimmedCommand.match(/^simulate\s+(health|finance|career)\s+([+-]?\d+)(%?)$/i);
  if (simulateMatch) {
    const domain = simulateMatch[1].toLowerCase() as "health" | "finance" | "career";
    const percentVal = parseInt(simulateMatch[2], 10);
    const percentageChange = percentVal / 100;

    // Run math simulation
    const simulation = runSimulation(
      user.scores.health,
      user.scores.finance,
      user.scores.career,
      { domain, percentageChange }
    );

    // Fetch brief AI projection from Gemini
    let aiMonospaceReport = "Unable to connect to AI Core. Math projection complete.";
    if (process.env.GEMINI_API_KEY) {
      try {
        const aiPrompt = `
You are the Syntra Terminal OS AI Core.
Analyze this mathematical projection:
- Target Domain: ${domain} with a proposed ${percentVal}% change.
- Current Scores: Health=${user.scores.health}, Finance=${user.scores.finance}, Career=${user.scores.career}
- Projected Scores (Month 6): Health=${simulation.timeline[6].health}, Finance=${simulation.timeline[6].finance}, Career=${simulation.timeline[6].career}
- Trade-offs Identified: ${simulation.tradeOffs.join(", ") || "None"}
- Risk: ${simulation.riskAssessment}

Deliver a highly concise, hacker-terminal style monospace analysis of this cross-domain feedback loop in exactly 2 sentences. Refer to the user as Operator. Avoid fluff or greetings.
`;
        aiMonospaceReport = await callGemini<string>(aiPrompt);
      } catch (err) {
        console.error("Gemini Terminal simulation failed:", err);
      }
    }

    const pad = (n: number) => n.toString().padEnd(6);

    const simOutput = `
==================================================
             PREDICTIVE SIMULATION REPORT
==================================================
PROPOSED SHIFT:  ${domain.toUpperCase()} by ${percentVal}%
RISK CLASSIFICATION: ${simulation.riskAssessment.toUpperCase()}

6-MONTH CASCADE PROJECTION:
  Metric     Current Score    Projected Month 6
  ----------------------------------------------
  Health     ${pad(user.scores.health)}     -->   ${simulation.timeline[6].health}
  Finance    ${pad(user.scores.finance)}     -->   ${simulation.timeline[6].finance}
  Career     ${pad(user.scores.career)}     -->   ${simulation.timeline[6].career}

TRADE-OFF INSIGHTS:
${simulation.tradeOffs.map(t => `  * ${t}`).join("\n") || "  * No negative cross-domain trade-offs predicted."}

AI NEURAL INSIGHT:
  ${aiMonospaceReport}
==================================================
`;
    return simOutput;
  }

  // Fallback or explicit "ai" query -> GEMINI AI CORE CHAT
  let userQuery = trimmedCommand;
  if (lowerCommand.startsWith("ai ")) {
    userQuery = trimmedCommand.substring(3).trim();
  }

  let aiOutput = "";
  if (process.env.GEMINI_API_KEY) {
    try {
      const systemPrompt = `
You are Syntra OS Terminal, a secure, futuristic cyberpunk CLI assistant mapping a hacker's biometric and digital twin data.
The current user is named "${user.name}".

Digital Twin Metrics: Health=${user.scores.health}/100, Finance=${user.scores.finance}/100, Career=${user.scores.career}/100.
Gamification: Streak=${user.gamification?.currentStreak ?? 0} days, Points=${user.gamification?.totalPoints ?? 0} PT.

Behavior Flags: ${activeFlags.join(", ") || "none"}
Weekly Averages: Sleep ${twinContext.weeklyAverages.sleep}hrs, Stress ${twinContext.weeklyAverages.stressLevel}/10

Address the user as 'Operator'. Speak in a concise, command-line system-report format. Keep your response under 100 words. Provide helpful, actionable advice about their goals, scores, or behavioral flags. Respond as if printing directly to a hacker terminal.
`;
      const chatPrompt = `${systemPrompt}\n\nOperator Input: ${userQuery}`;
      aiOutput = await callGemini<string>(chatPrompt);
    } catch (err) {
      console.error("Gemini AI Core call failed:", err);
      aiOutput = "[-] SYSTEM ERROR: Core neural connection timed out.";
    }
  } else {
    aiOutput = "[-] CONNECTION ERROR: AI Core is currently offline (API key missing).";
  }

  const aiResponse = `
==================================================
                SYNTRA AI RESPONSE
==================================================
${aiOutput}
==================================================
`;
  return aiResponse;
}

/**
 * Generates structured 24-hour telemetry statistics from the database.
 */
async function generateMetricsOutput(userId: string) {
  const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // 1. Run the MongoDB Aggregation
  const stats = await Telemetry.aggregate([
    { 
      $match: { 
        userId: new mongoose.Types.ObjectId(userId),
        timestamp: { $gte: last24Hours } 
      } 
    },
    { 
      $group: {
        _id: "$action",
        count: { $sum: 1 },
        avgLatency: { $avg: "$metadata.latencyMs" },
        totalTokensSaved: { $sum: "$metadata.estimatedTokensSaved" }
      }
    }
  ]);

  // 2. Format the data for the terminal
  let totalIntercepts = 0;
  let totalGenerations = 0;
  let savedTokens = 0;
  let interceptLatency = 0;
  let generationLatency = 0;

  stats.forEach(stat => {
    if (stat._id === "DRIFT_INTERCEPT") {
      totalIntercepts = stat.count;
      savedTokens = stat.totalTokensSaved || 0;
      interceptLatency = stat.avgLatency || 0;
    }
    if (stat._id === "AI_GENERATION") {
      totalGenerations = stat.count;
      generationLatency = stat.avgLatency || 0;
    }
  });

  const totalRequests = totalIntercepts + totalGenerations;
  const interceptRate = totalRequests > 0 ? ((totalIntercepts / totalRequests) * 100).toFixed(1) : 0;

  // 3. The Cyberpunk Output
  return `
==================================================
           SYNTRA CORE TELEMETRY (24H)
==================================================
TOTAL INGESTION EVENTS:  ${totalRequests}

[+] BEHAVIORAL DRIFT ENGINE
  Intercepts:            ${totalIntercepts}
  Intercept Rate:        ${interceptRate}%
  Avg Math Latency:      ${interceptLatency.toFixed(2)}ms
  Est. Tokens Saved:     ${savedTokens} 🪙

[-] GEMINI NEURAL LINK
  Generations:           ${totalGenerations}
  Avg API Latency:       ${generationLatency.toFixed(2)}ms

SYSTEM STATUS: ${Number(interceptRate) > 50 ? "HIGHLY OPTIMIZED" : "STABLE"}
==================================================
`;
}

// Fetches the user, shares the promise if concurrent, and caches for 60 seconds
export const getUserById = memoizeAsync(
  async (userId: string): Promise<any> => {
    return await User.findById(userId).lean();
  },
  { ttlMs: 60000, resolver: (userId) => userId } // Use the ID directly as the cache key
);
