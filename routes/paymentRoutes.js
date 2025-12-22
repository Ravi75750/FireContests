import { Router } from "express";
import Payment from "../models/payment.js";
import { utrUpload } from "../middleware/utrUpload.js";
import { verifyAdmin } from "./admin.js";

const router = Router();

/*
📌 USER SUBMITS PAYMENT WITH SCREENSHOT + UTR
POST /api/payments/submit
*/
router.post("/submit", utrUpload.single("screenshot"), async (req, res) => {
  try {
    const { userId, contestId, utr, fullName, ffid } = req.body;

    if (!userId) return res.status(400).json({ msg: "Missing userId" });
    if (!contestId) return res.status(400).json({ msg: "Missing contestId" });
    if (!fullName) return res.status(400).json({ msg: "Full name required" });
    if (!ffid) return res.status(400).json({ msg: "Free Fire ID required" });
    if (!utr) return res.status(400).json({ msg: "UTR / Transaction ID required" });

    const screenshot = req.file?.filename || null;
    if (!screenshot) return res.status(400).json({ msg: "Screenshot image required" });

    await Payment.create({
      userId,
      contestId,
      utr,
      fullName,
      ffid,
      screenshot,
      status: "pending",
    });

    res.json({ msg: "Payment submitted. Wait for admin approval." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

/*
📌 ADMIN FETCH PENDING PAYMENTS
GET /api/payments/pending
*/
router.get("/pending", verifyAdmin, async (req, res) => {
  try {
    const pending = await Payment.find({ status: "pending" })
      .populate("userId", "username email")
      .populate("contestId", "title entryFee");

    res.json(pending);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

/*
📌 ADMIN UPDATE STATUS
PUT /api/payments/update/:id
*/
router.put("/update/:id", verifyAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!["success", "rejected"].includes(status)) {
      return res.status(400).json({ msg: "Invalid status" });
    }

    await Payment.findByIdAndUpdate(req.params.id, { status });
    res.json({ msg: `Payment ${status}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});


// 📌 ADMIN - ALL PAYMENTS (HISTORY)
router.get("/all", verifyAdmin, async (req, res) => {
  try {
    const payments = await Payment.find({})
      .populate("userId", "username email")
      .populate("contestId", "title entryFee")
      .sort({ createdAt: -1 });

    res.json(payments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

/*
📌 USER PAYMENT HISTORY
*/
router.get("/history/:userId", async (req, res) => {
  try {
    if (!req.params.userId || req.params.userId === "undefined") {
      return res.json([]);  // return empty safely
    }

    const list = await Payment.find({ userId: req.params.userId });
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});


export default router;
