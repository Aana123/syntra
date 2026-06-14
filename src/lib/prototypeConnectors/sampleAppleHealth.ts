export interface AppleHealthTelemetry {
  steps: number;
  sleepHours: number;
  restingHeartRate: number;
  workoutMinutes: number;
  waterLitres: number;
}

export const sampleAppleHealthData: AppleHealthTelemetry = {
  steps: 7200,
  sleepHours: 7.4,
  restingHeartRate: 71,
  workoutMinutes: 38,
  waterLitres: 2.3
};
