// src/lib/mockData.ts

export const mockUser = {
  _id: "6650be1e7f339cf6f4d38c23",
  name: "Aana",
  email: "demo@syntra.com",
  avatarId: 2,
  scores: { health: 78, finance: 82, career: 88 },
  gamification: {
    totalPoints: 1450,
    currentStreak: 14,
    lastLogDate: new Date(),
  },
  goals: [
    { title: "Hit LeetCode Knight", domain: "career", priority: "high" },
    { title: "Cap Zomato spending", domain: "finance", priority: "med" }
  ]
};

export function getMockLogs(today: Date = new Date()): any[] {
  const logs = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const logDate = d;

    // Health — progressive collapse with mood and energy
    logs.push({
      _id: `mock-health-${i}`,
      userId: mockUser._id,
      domain: "health",
      date: logDate,
      domainData: {
        sleepHours: i > 7 ? 7.5 : Math.max(4.0, 7.5 - (8 - i) * 0.5),
        workoutMinutes: i > 7 ? 45 : 0,
        stressLevel: i > 7 ? 4 : Math.min(9, 4 + (8 - i)),
        moodScore: i > 7 ? 7 : Math.max(3, 7 - (8 - i)),
        energyLevel: i > 7 ? 8 : Math.max(2, 8 - (8 - i)),
        caloriesConsumed: i > 7 ? 2000 : 2600, // stress eating during burnout
        calorieGoal: 2100,
        mealsEatenToday: i > 7 
          ? "Oatmeal with almonds & banana, brown rice with dal & chicken breast, protein shake, green tea, light paneer salad" 
          : "Double cheese burger, french fries with mayo, chocolate waffle with vanilla ice cream, late night pepperoni pizza",
      },
    });

    // Finance — stress-linked spending spike + late night pattern
    logs.push({
      _id: `mock-finance-${i}`,
      userId: mockUser._id,
      domain: "finance",
      date: logDate,
      domainData: {
        amountSaved: i > 7 ? 50 : 0,
        discretionarySpent: i > 7 ? 20 : 20 + (8 - i) * 25,
        spendingCategory: i > 7 ? "food" : "entertainment",
        spendingTime: i > 7 ? 14 : 23, // afternoon vs late night
      },
    });

    // Career — aggressive overload (the trigger)
    logs.push({
      _id: `mock-career-${i}`,
      userId: mockUser._id,
      domain: "career",
      date: logDate,
      domainData: {
        hoursStudied: i > 7 ? 4 : 4 + (8 - i) * 0.5,
        productivityRating: i > 7 ? 8 : Math.max(3, 8 - (8 - i)),
        sessionsCompleted: i > 7 ? 2 : 1,
        courseName: "DSA Mastery",
      },
    });
  }
  return logs;
}

export const mockAiReflection = {
  twinPrediction: "Your Twin forecasts a 25% drop in problem-solving speed tomorrow if tonight's sleep stays under 5 hours — your career momentum is masking a sleep debt that compounds daily.",
  dailyReflection: "You've maintained impressive study consistency this week, but you're running on borrowed energy. The sleep debt is starting to catch up.",
  explainability: [
    "Sleep has declined from 7.1h to 5.2h over the past 5 days — a 27% reduction in recovery time.",
    "Career activity has held at 4+ hours daily despite the deficit — momentum is real but fragile.",
    "Spending is 15% over budget, consistent with fatigue-driven impulse purchasing patterns."
  ],
  dailyChallenge: "Hard stop: no screens after 10:30pm tonight. Log this as completed when you're in bed by 11pm. One night won't fix the debt, but it stops it from compounding.",
  recommendations: {
    health: [
      "Set a 10:15pm wind-down alarm tonight — non-negotiable.",
      "5 minutes of box breathing before bed to lower cortisol for sleep onset."
    ],
    finance: [
      "No discretionary spending after 8pm today to interrupt the fatigue-spending loop.",
      "Flag one unnecessary transaction from yesterday in your expense log."
    ],
    career: [
      "Front-load your hardest cognitive task to before 11am when alertness peaks despite the deficit.",
      "Your study momentum is genuine — protect it by not scheduling deep work after 3pm today."
    ]
  },
  riskAlerts: [
    "Two more nights below 6h will produce measurable drops in financial decision quality and a study retention collapse."
  ],
  confidence: 84
};
