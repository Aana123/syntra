// src/models/Log.ts
import mongoose, { Schema, Document, models } from "mongoose";

export interface ILog extends Document {
  userId: mongoose.Types.ObjectId; // FIXED: Must be ObjectId
  date: Date;
  domain: string;
  domainData: Record<string, any>; 
}

const LogSchema = new Schema<ILog>(
  {
    // FIXED: Must use Schema.Types.ObjectId and reference the User model
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true }, 
    date: { type: Date, default: Date.now },
    domain: { type: String, required: true },
    domainData: { type: Schema.Types.Mixed, required: true } 
  },
  { timestamps: true }
);

const Log = models.Log || mongoose.model<ILog>("Log", LogSchema);

export default Log;