# Syntra — Goals & Mission Control

Goals are the strategic layer of the Identity Twin. They connect daily behavioral logs to long-term outcomes and drive AI recommendations toward specific targets.

---

## Mission Control

Mission Control is the primary goals surface on the dashboard — a focused panel that surfaces the single most important active goal.

### What it displays
- **Active goal title** — highest-priority incomplete goal
- **Milestone progress bar** — animated fill, `completedCount / totalCount`
- **Days remaining** — countdown from today to `goal.targetDate`
- **Completion projection** — estimated date based on milestone completion velocity
- **Domain badge** — health / finance / career color coding

### Selection logic
The dashboard picks the active goal by:
1. Filter goals where `completed = false`
2. Sort by priority: `high > medium > low`
3. Pick the first result

### Financial goal integration
If the active goal is a finance-domain goal with a parseable amount in the title, Mission Control also shows the AI-computed monthly savings requirement and deficit from `financeMath.ts`.

---

## Goal Creation

### API: `POST /api/goals`

```typescript
{
  title: string;                          // Plain language — financial goals parsed for amounts
  domain: "health" | "finance" | "career";
  priority: "high" | "medium" | "low";
  targetDate?: string;                    // ISO date string
  milestones?: string[];                  // Optional initial milestone texts
}
```

Goals are embedded in the User document (`user.goals[]`) using MongoDB `$push`.

### Financial goal parsing (`src/lib/financeMath.ts`)
When a finance-domain goal is created, `preComputeWealthGoals()` runs over the title to extract:

**Type classification** — keyword matching:
```
home / house / flat / apartment → "home"
car / vehicle / bike            → "car"
education / mba / college       → "education"
wedding / marriage              → "wedding"
emergency / corpus              → "emergency_fund"
retire / retirement             → "retirement"
```

**Amount extraction** — regex:
```
"₹25 lakh down payment"    → 2,500,000
"Save 5 lakhs by December" → 500,000
"₹12,00,000 for wedding"   → 1,200,000
```

**Monthly savings calculation**:
```
monthsRemaining        = months between now and targetDate
requiredMonthlySavings = targetAmount / monthsRemaining
actualMonthlySavings   = monthlyIncome × avgSavingsRate
deficit                = requiredMonthlySavings - actualMonthlySavings
```

---

## Milestones

Milestones are embedded subdocuments within each goal (`goal.milestones[]`). They represent the concrete steps required to complete a goal.

### Data shape
```typescript
{
  _id: ObjectId;       // Auto-generated
  text: string;        // Milestone description
  completed: boolean;  // Completion flag
}
```

### CRUD operations

**Add milestone**: `POST /api/goals/milestone`
```json
{ "goalId": "...", "text": "Complete Module 3" }
```

**Complete/edit milestone**: `PATCH /api/goals/milestone`
```json
{ "goalId": "...", "milestoneId": "...", "completed": true }
```
Uses MongoDB positional operator to update nested array element.

**Remove milestone**: `DELETE /api/goals/milestone`
```json
{ "goalId": "...", "milestoneId": "..." }
```

### Progress calculation
```
progressPercent = (milestones.filter(m => m.completed).length / milestones.length) × 100
```
Displayed as animated progress bar on both the `/goals` page and Mission Control.

---

## Goal Progress

### Velocity-based projection
The dashboard estimates goal completion date using milestone completion rate:
```
velocity = completedMilestones / daysSinceGoalCreated   (milestones per day)
daysToComplete = remainingMilestones / velocity
projectedDate = today + daysToComplete
```

### Color-coded status
| State | Condition | Color |
|---|---|---|
| On track | projectedDate ≤ targetDate | Green |
| At risk | projectedDate > targetDate by ≤ 14 days | Amber |
| Behind | projectedDate > targetDate by > 14 days | Red |
| No date set | targetDate = null | Neutral |

---

## Goal Completion

### Current behavior
Goals do not auto-complete. The completion state is:
1. All milestones marked `completed: true` → progress bar shows 100%
2. The goal itself is not automatically marked `completed: true` — this is a known gap

### Manual deletion
Users can delete a completed goal via `DELETE /api/goals` with the `goalId`. This removes it with MongoDB `$pull`.

### AI integration
The AI uses goal data in two ways:
1. **Financial goals** → pre-computed deficit injected into `twinContext.finance.wealthGoals[]`
2. **Career goals** → goal titles feed `recentGoalFocus[]` in `TwinContext.qualitative`, which Gemini uses to personalize career recommendations

---

## Goal Storage Architecture

Goals live as an embedded array inside the User document. This means:
- No separate MongoDB collection — no JOIN queries required
- Full goals array loaded with every User fetch
- `$push` to add, `$pull` to remove, positional `$` operator for nested milestone updates
- MongoDB document limit (16MB) caps maximum goal count — not a practical concern for typical users

### MongoDB operations used
```typescript
// Add goal
User.findByIdAndUpdate(userId, { $push: { goals: newGoal } }, { new: true })

// Delete goal
User.findByIdAndUpdate(userId, { $pull: { goals: { _id: goalId } } }, { new: true })

// Complete milestone
User.findOneAndUpdate(
  { _id: userId, "goals._id": goalId, "goals.milestones._id": milestoneId },
  { $set: { "goals.$.milestones.$[m].completed": true } },
  { arrayFilters: [{ "m._id": milestoneId }], new: true }
)
```
