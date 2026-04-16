import { Document, model, Schema } from "mongoose";

export interface IOtp extends Document {
    email: string;
    otp: string;
    reason: string;
    expiresAt: Date
}

const otpSchema = new Schema<IOtp>(
  {
    email: {
      type: String,
      required: true, // Ensure user email is always required
    },
    otp: {
      type: String,
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

// TTL index for expiration
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Automatically delete expired OTPs

export default model<IOtp>("OTP", otpSchema);
