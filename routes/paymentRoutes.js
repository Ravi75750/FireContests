import { Router } from "express";
import Payment from "../models/payment.js";
import { utrUpload } from "../middleware/utrUpload.js";
import { verifyAdmin } from "./admin.js"; // ✅ KEEP AS YOU ALREADY HAVE

const router = Router();

/* =======================================================
   USER SUBMITS PAYMENT (UTR + SCREENSHOT)
   POST /api/payments/submit
======================================================= */
router.post("/submit", utrUpload.single("screenshot"), async (req, res) => {
  try {
    const { userId, contestId, utr, fullName, ffid } = req.body;

    if (!userId) return res.status(400).json({ msg: "Missing userId" });
    if (!contestId) return res.status(400).json({ msg: "Missing contestId" });
    if (!fullName) return res.status(400).json({ msg: "Full name required" });
    // if (!ffid) return res.status(400).json({ msg: "Free Fire ID required" });
    if (!utr) return res.status(400).json({ msg: "UTR required" });

    if (!req.file?.filename) {
      return res.status(400).json({ msg: "Screenshot image required" });
    }

    /* --------------------------------------------------
       Prevent duplicate payment for same contest
    -------------------------------------------------- */
    const existingPayment = await Payment.findOne({
      userId,
      contestId,
      status: { $in: ["pending", "success"] },
    });

    if (existingPayment) {
      return res.status(400).json({
        msg: "Payment already submitted for this contest",
      });
    }

    /* --------------------------------------------------
       Prevent duplicate UTR reuse
    -------------------------------------------------- */
    const utrUsed = await Payment.findOne({ utr });
    if (utrUsed) {
      return res.status(400).json({
        msg: "This UTR has already been used",
      });
    }

    await Payment.create({
      userId,
      contestId,
      utr,
      fullName,
      ffid,
      screenshot: req.file.path, // ✅ Save full Cloudinary URL
      status: "pending",
    });

    res.status(201).json({
      msg: "Payment submitted successfully. Await admin approval.",
    });
  } catch (err) {
    console.error("Payment Submit Error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

/* =======================================================
   ADMIN - FETCH PENDING PAYMENTS
   GET /api/payments/pending
======================================================= */
router.get("/pending", verifyAdmin, async (req, res) => {
  try {
    const pending = await Payment.find({ status: "pending" })
      .populate("userId", "username email")
      .populate("contestId", "title entryFee")
      .sort({ createdAt: -1 });

    res.json(pending);
  } catch (err) {
    console.error("Fetch Pending Payments Error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

/* =======================================================
   ADMIN - UPDATE PAYMENT STATUS
   PUT /api/payments/update/:id
======================================================= */
router.put("/update/:id", verifyAdmin, async (req, res) => {
  try {
    const { status } = req.body;

    if (!["success", "rejected"].includes(status)) {
      return res.status(400).json({ msg: "Invalid status" });
    }

    const updated = await Payment.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ msg: "Payment not found" });
    }

    res.json({
      msg: `Payment ${status}`,
      payment: updated,
    });
  } catch (err) {
    console.error("Update Payment Error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

/* =======================================================
   ADMIN - ALL PAYMENTS (HISTORY)
   GET /api/payments/all
======================================================= */
router.get("/all", verifyAdmin, async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate("userId", "username email")
      .populate("contestId", "title entryFee")
      .sort({ createdAt: -1 });

    res.json(payments);
  } catch (err) {
    console.error("Fetch Payments Error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

/* =======================================================
   USER - PAYMENT HISTORY
   GET /api/payments/history/:userId
======================================================= */
router.get("/history/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId || userId === "undefined") {
      return res.json([]);
    }

    const list = await Payment.find({ userId })
      .sort({ createdAt: -1 });

    res.json(list);
  } catch (err) {
    console.error("Payment History Error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

/* =======================================================
   USER/ADMIN - DELETE PAYMENT
   DELETE /api/payments/:id
======================================================= */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body; // Passed from frontend for ownership verification

    const payment = await Payment.findById(id);
    if (!payment) {
      return res.status(404).json({ msg: "Payment not found" });
    }

    // Verify ownership (if userId is provided)
    if (userId && String(payment.userId) !== String(userId)) {
      // NOTE: Admin bypass could be added here if we had middleware, 
      // but for now strict ownership check if userId passed.
      return res.status(403).json({ msg: "Not authorized to delete this payment" });
    }

    await Payment.findByIdAndDelete(id);
    res.json({ msg: "Payment deleted successfully" });
  } catch (err) {
    console.error("Delete Payment Error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

export default router;
