import { Router } from "express";
import Contest from "../models/contest.js";
import User from "../models/user.js";
import Payment from "../models/payment.js";

const router = Router();

/* =======================================================
   1. GET ALL CONTESTS
   GET /api/contests
======================================================= */
router.get("/", async (req, res) => {
  try {
    const contests = await Contest.find().sort({ createdAt: -1 });
    res.json(contests);
  } catch (err) {
    console.error("Fetch contests error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

/* =======================================================
   2. USER JOINS CONTEST
   POST /api/contests/:contestId/join
======================================================= */
router.post("/:contestId/join", async (req, res) => {
  try {
    const { userId } = req.body;
    const { contestId } = req.params;

    if (!userId || !contestId)
      return res.status(400).json({ msg: "Missing userId or contestId" });

    const contest = await Contest.findById(contestId);
    const user = await User.findById(userId);

    if (!contest || !user)
      return res.status(404).json({ msg: "User or contest not found" });

    // Check payment
    const paid = await Payment.findOne({
      userId,
      contestId,
      status: { $in: ["success", "pending"] },
    });

    if (!paid)
      return res.status(403).json({
        msg: "Payment required before joining this contest",
      });

    // prevent duplicate
    if (contest.participants.includes(userId))
      return res.status(400).json({ msg: "Already joined this contest" });

    contest.participants.push(userId);
    await contest.save();

    user.joinedContests.push(contestId);
    await user.save();

    res.json({ msg: "Contest joined!", contest });

  } catch (err) {
    console.error("Join contest error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

export default router;
