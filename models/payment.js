import mongoose from "mongoose";

const PaymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  contestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Contest",
    required: true,
  },
  fullName: { type: String, required: true },
  ffid: { type: String, required: true },
  utr: { type: String, required: true },
  screenshot: { type: String, required: false },
  status: {
    type: String,
    enum: ["pending", "success", "rejected"],
    default: "pending",
  },
}, { timestamps: true });

export default mongoose.model("Payment", PaymentSchema);
