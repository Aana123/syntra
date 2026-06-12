import mongoose, { Schema, Document, models } from "mongoose";

export interface ITelemetry extends Document {
  userId?: mongoose.Types.ObjectId;
  action: string;
  category: string;
  metadata: Record<string, any>;
  timestamp: Date;
}

const TelemetrySchema = new Schema<ITelemetry>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: false, index: true },
    action: { type: String, required: true, index: true },
    category: { type: String, required: true, index: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
    timestamp: { type: Date, default: Date.now, index: true }
  },
  { timestamps: true }
);

const Telemetry = models.Telemetry || mongoose.model<ITelemetry>("Telemetry", TelemetrySchema);

export default Telemetry;
