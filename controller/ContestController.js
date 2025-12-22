import Contest from "../models/contest.js";   // FIXED
import Payment from "../models/payment.js";   // FIXED

export const joinContest = async (req, res) => {
  try {
    const { userId, contestId } = req.body;

    // 1. Check if user has successful payment
    const payment = await Payment.findOne({
      userId,
      status: "success",
    });

    if (!payment) {
      return res.status(403).json({
        message: "You cannot join. Payment not completed.",
      });
    }

    // 2. Find contest
    const contest = await Contest.findById(contestId);   // FIXED

    if (!contest) {
      return res.status(404).json({ message: "Contest not found" });
    }

    // 3. Prevent double join
    if (contest.participants.includes(userId)) {
      return res
        .status(400)
        .json({ message: "Already joined this contest" });
    }

    // 4. Register user in contest
    contest.participants.push(userId);
    await contest.save();

    return res.json({ message: "Joined contest successfully!" });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};
