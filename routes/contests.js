import { Router } from "express";
import { joinContest } from "../controller/ContestController.js";
import Contest from "../models/Contest.js";

const router = Router();

/* =======================================================
   1️⃣ GET ALL CONTESTS (PUBLIC)
   GET /api/contests
======================================================= */
router.get("/", async (req, res) => {
  try {
    const contests = await Contest.find()
      .sort({ createdAt: -1 })
      .select(
        "title entryFee maxPlayers image matchTime status roomId roomPass participants results"
      );

    res.json(contests);
  } catch (err) {
    console.error("FETCH CONTESTS ERROR:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

/* =======================================================
   2️⃣ USER JOINS CONTEST
   POST /api/contests/:contestId/join
======================================================= */
router.post("/:contestId/join", joinContest);

export default router;
