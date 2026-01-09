import mongoose from "mongoose";
import Contest from "../models/Contest.js";
import Payment from "../models/payment.js";

/* ======================================================
   JOIN CONTEST
   POST /api/contests/:contestId/join
====================================================== */
export const joinContest = async (req, res) => {
  try {
    const { contestId } = req.params;
    const { userId } = req.body;

    /* 1️⃣ Validate */
    if (!userId || !contestId) {
      return res.status(400).json({ msg: "Missing userId or contestId" });
    }

    /* 2️⃣ Find contest */
    const contest = await Contest.findById(contestId);
    if (!contest) {
      return res.status(404).json({ msg: "Contest not found" });
    }

    /* 3️⃣ Status check */
    if (contest.status !== "UPCOMING") {
      return res.status(400).json({ msg: "Contest already started or finished" });
    }

    /* 4️⃣ Slot limit */
    if (contest.participants.length >= contest.maxPlayers) {
      return res.status(400).json({ msg: "Contest is full" });
    }

    /* 5️⃣ Prevent duplicate join */
    const alreadyJoined = contest.participants.some(
      (p) => (p.userId || p).toString() === userId.toString()
    );

    if (alreadyJoined) {
      return res.status(400).json({ msg: "Already joined this contest" });
    }

    let participantData = {
      userId,
      slotIndex: contest.participants.length + 1,
    };

    /* ======================================================
       6️⃣ PAYMENT CHECK — ONLY IF PAID CONTEST
    ====================================================== */
    if (contest.entryFee > 0) {
      const payment = await Payment.findOne({
        userId,
        contestId,
        status: "success",
      }).sort({ createdAt: -1 });

      if (!payment) {
        return res.status(403).json({
          msg: "Payment not completed for this contest",
        });
      }

      // Use details from Payment
      participantData.inGameName = payment.fullName;
      participantData.inGameId = payment.ffid;
      participantData.upiId = payment.utr; // Mapping UTR to UPI ID for consistency
    } else {
      // ✅ FREE CONTEST - Get details from Request
      const { inGameName, inGameId, upiId } = req.body;
      if (!inGameName || !inGameId || !upiId) {
        return res.status(400).json({ msg: "Missing game details or UPI ID" });
      }
      participantData.inGameName = inGameName;
      participantData.inGameId = inGameId;
      participantData.upiId = upiId;
    }

    /* 7️⃣ Join contest */
    contest.participants.push(participantData);
    await contest.save();

    return res.status(200).json({
      msg: "Joined contest successfully!",
    });

  } catch (err) {
    console.error("JOIN CONTEST ERROR:", err);
    return res.status(500).json({
      msg: "Server error",
      error: err.message,
    });
  }
};
export const markContestLive = async (contestId) => {
  await Contest.findByIdAndUpdate(contestId, {
    status: "LIVE",
    matchStartedAt: new Date(),
    completionPromptAt: new Date(Date.now() + 10 * 60 * 1000),
  });
};



/* ======================================================
   FINISH MATCH (ADMIN ONLY)
   POST /api/admin/contest/:contestId/finish
====================================================== */
export const finishMatch = async (req, res) => {
  try {
    const { contestId } = req.params;
    const { winner, killPoints } = req.body;

    const contest = await Contest.findById(contestId);

    if (!contest) {
      return res.status(404).json({
        msg: "Contest not found",
      });
    }

    /* ---------- 1️⃣ Save Results ---------- */
    contest.results = {
      winner: winner || null,
      killPoints: killPoints || null,
    };

    /* ---------- 2️⃣ Reset Contest ---------- */
    contest.participants = [];
    contest.roomId = null;
    contest.roomPass = null;
    contest.status = "COMPLETED";

    await contest.save();

    return res.status(200).json({
      msg: "Match finished and contest reset successfully",
    });

  } catch (err) {
    console.error("FINISH MATCH ERROR:", err);
    return res.status(500).json({
      msg: "Server error",
      error: err.message,
    });
  }
};
