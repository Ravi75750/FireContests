import mongoose from "mongoose";

const ContestSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    entryFee: {
      type: Number,
      required: true,
      min: 0,
    },

    maxPlayers: {
      type: Number,
      required: true,
      min: 1, // ✅ solo support
    },

    image: {
      type: String,
      required: true,
    },

    /* ---------------- REWARDS ---------------- */
    rewards: {
      first: { type: String, default: "" },
      second: { type: String, default: "" },
      third: { type: String, default: "" },
    },

    /* ---------------- MATCH TIMING ---------------- */

    /* ---------------- MATCH TIMING ---------------- */
    matchTime: {
      type: Date,
      required: true,
      index: true, // ⚡ faster time queries
    },

    /* ---------------- MATCH STATUS ---------------- */
    status: {
      type: String,
      enum: ["UPCOMING", "LIVE", "COMPLETED"],
      default: "UPCOMING",
      index: true,
    },

    /* ---------------- ROOM DETAILS ---------------- */
    roomId: {
      type: String,
      default: null,
    },

    roomPass: {
      type: String,
      default: null,
    },

    /* ---------------- PARTICIPANTS ---------------- */
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    /* ---------------- RESULTS ---------------- */
    results: {
      winner: {
        type: String,
        default: null,
      },
      killPoints: {
        type: Number,
        default: null,
      },
      matchStartedAt: {
        type: Date,
        default: null,
      },

      completionPromptAt: {
        type: Date,
        default: null,
      },

    },
  },
  { timestamps: true }
);

export default mongoose.model("Contest", ContestSchema);
