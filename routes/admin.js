import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Contest from "../models/Contest.js";
import Admin from "../models/admin.js";
import Payment from "../models/payment.js";
import User from "../models/user.js";
import { upload } from "../middleware/upload.js";

const router = express.Router();

/* ======================================================
   ADMIN LOGIN
====================================================== */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(400).json({ msg: "Invalid admin login" });
    }

    const match = await bcrypt.compare(password, admin.password);
    if (!match) {
      return res.status(400).json({ msg: "Invalid admin login" });
    }

    const token = jwt.sign(
      { adminId: admin._id },
      process.env.JWT_SECRET,
      { expiresIn: "6h" }
    );

    res.json({ msg: "Logged in", token });
  } catch (err) {
    console.error("ADMIN LOGIN ERROR:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

/* ======================================================
   VERIFY ADMIN MIDDLEWARE
====================================================== */
function verifyAdmin(req, res, next) {
  try {
    const raw = req.headers.authorization;
    if (!raw) {
      return res.status(401).json({ msg: "Missing Admin Token" });
    }

    const token = raw.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.adminId = decoded.adminId;
    next();
  } catch {
    return res.status(401).json({ msg: "Invalid or expired token" });
  }
}

/* ======================================================
   CREATE USER (ADMIN)
====================================================== */
router.post("/user", verifyAdmin, async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ msg: "All fields required" });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(409).json({ msg: "Email already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      email,
      password: hashed,
    });

    res.json({ msg: "User created", user });
  } catch (err) {
    console.error("CREATE USER ERROR:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

/* ======================================================
   GET ALL USERS
====================================================== */
router.get("/users", verifyAdmin, async (req, res) => {
  try {
    const users = await User.find(
      {},
      "-password -resetPasswordToken -resetPasswordExpires"
    );
    res.json(users);
  } catch {
    res.status(500).json({ msg: "Server error" });
  }
});

/* ======================================================
   CREATE CONTEST
====================================================== */
router.post(
  "/contest",
  verifyAdmin,
  upload.single("image"),
  async (req, res) => {
    try {
      const { title, entryFee, maxPlayers, matchTime } = req.body;

      if (!title || entryFee === undefined || !maxPlayers || !matchTime) {
        return res.status(400).json({
          msg: "Title, entry fee, max players and match time are required",
        });
      }

      if (!req.file) {
        return res.status(400).json({ msg: "Image required" });
      }

      const contest = await Contest.create({
        title,
        entryFee,
        maxPlayers,
        matchTime: new Date(matchTime),
        status: "UPCOMING",
        image: req.file.path, // ✅ Save full Cloudinary URL
        participants: [],
        roomId: null,
        roomPass: null,
        results: null,
      });

      res.json({ msg: "Contest created successfully", contest });
    } catch (err) {
      console.error("CREATE CONTEST ERROR:", err);
      res.status(500).json({ msg: "Server error" });
    }
  }
);

/* ======================================================
   UPDATE CONTEST (MATCH TIME / ROOM)
====================================================== */
router.put(
  "/contest/:contestId/details",
  verifyAdmin,
  async (req, res) => {
    try {
      const { contestId } = req.params;
      const { matchTime, roomId, roomPass } = req.body;

      const contest = await Contest.findById(contestId);
      if (!contest) {
        return res.status(404).json({ msg: "Contest not found" });
      }

      if (matchTime) contest.matchTime = new Date(matchTime);
      if (roomId !== undefined) contest.roomId = roomId;
      if (roomPass !== undefined) contest.roomPass = roomPass;

      await contest.save();
      res.json({ msg: "Contest updated", contest });
    } catch (err) {
      console.error("UPDATE CONTEST ERROR:", err);
      res.status(500).json({ msg: "Server error" });
    }
  }
);

/* ======================================================
   UPDATE ROOM DETAILS (QUICK)
====================================================== */
router.put("/contest/:id/room", verifyAdmin, async (req, res) => {
  try {
    const { roomId, roomPass } = req.body;

    if (!roomId || !roomPass) {
      return res.status(400).json({
        msg: "Room ID and Password are required",
      });
    }

    const contest = await Contest.findByIdAndUpdate(
      req.params.id,
      { roomId, roomPass },
      { new: true }
    );

    if (!contest) {
      return res.status(404).json({ msg: "Contest not found" });
    }

    res.json({ msg: "Room details updated", contest });
  } catch (err) {
    console.error("UPDATE ROOM ERROR:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

/* ======================================================
   LIST ALL CONTESTS (ADMIN)
====================================================== */
router.get("/contests", verifyAdmin, async (req, res) => {
  try {
    const contests = await Contest.find().sort({ createdAt: -1 });
    res.json(contests);
  } catch {
    res.status(500).json({ msg: "Server error" });
  }
});

/* ======================================================
   DASHBOARD STATS (FIXED & COMPLETE)
====================================================== */
router.get("/dashboard-stats", verifyAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();

    const activeContests = await Contest.countDocuments({
      status: { $in: ["UPCOMING", "LIVE"] },
    });

    const totalRevenueAgg = await Payment.aggregate([
      { $match: { status: "success" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const pendingPayments = await Payment.countDocuments({
      status: "pending",
    });

    const contests = await Contest.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("participants", "username");

    const recentContests = await Promise.all(
      contests.map(async (contest) => {
        const payments = await Payment.find({
          contestId: contest._id,
          status: "success",
        }).populate("userId", "username");

        let totalCollected = 0;
        let paidPlayers = 0;
        let freePlayers = 0;

        const playerPayments = contest.participants.map((user) => {
          const payment = payments.find(
            (p) => String(p.userId?._id) === String(user._id)
          );

          if (payment) {
            totalCollected += payment.amount;
            paidPlayers++;
            return { username: user.username, amount: payment.amount };
          } else {
            freePlayers++;
            return { username: user.username, amount: 0 };
          }
        });

        return {
          _id: contest._id,
          title: contest.title,
          status: contest.status,
          matchTime: contest.matchTime,
          participants: contest.participants,
          totalCollected,
          paidPlayers,
          freePlayers,
          playerPayments,
        };
      })
    );

    res.json({
      totalUsers,
      activeContests,
      totalRevenue: totalRevenueAgg[0]?.total || 0,
      pendingPayments,
      recentContests,
    });
  } catch (err) {
    console.error("DASHBOARD ERROR:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

/* ======================================================
   DELETE CONTEST
====================================================== */
router.delete("/contest/:id", verifyAdmin, async (req, res) => {
  try {
    await Contest.findByIdAndDelete(req.params.id);
    res.json({ msg: "Contest deleted" });
  } catch {
    res.status(500).json({ msg: "Server error" });
  }
});

/* ======================================================
   SYSTEM SETTINGS (QR CODE ETC)
====================================================== */
import Settings from "../models/Settings.js";

router.get("/system-settings", async (req, res) => {
  try {
    const qrSetting = await Settings.findOne({ key: "payment_qr" });
    res.json({
      paymentQrCode: qrSetting ? qrSetting.value : null,
    });
  } catch (err) {
    console.error("GET SETTINGS ERROR:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

router.put(
  "/system-settings",
  verifyAdmin,
  upload.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ msg: "Image required" });
      }

      const imageUrl = req.file.path; // Cloudinary URL

      await Settings.findOneAndUpdate(
        { key: "payment_qr" },
        { value: imageUrl },
        { upsert: true, new: true }
      );

      res.json({ msg: "QR Code updated", url: imageUrl });
    } catch (err) {
      console.error("UPDATE SETTINGS ERROR:", err);
      res.status(500).json({ msg: "Server error" });
    }
  }
);

/* ======================================================
   EXPORTS
====================================================== */
export { verifyAdmin };
export default router;
