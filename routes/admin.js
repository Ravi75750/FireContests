import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Contest from "../models/contest.js";
import Admin from "../models/admin.js";
import User from "../models/user.js";
import { upload } from "../middleware/upload.js";

const router = express.Router();

/* =======================
   ADMIN LOGIN
======================= */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(400).json({ msg: "Invalid admin login" });

    const match = await bcrypt.compare(password, admin.password);
    if (!match) return res.status(400).json({ msg: "Invalid admin login" });

    const token = jwt.sign(
      { adminId: admin._id },
      process.env.JWT_SECRET,
      { expiresIn: "6h" }
    );

    res.json({ msg: "Logged in", token });
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
});

/* =======================
   VERIFY ADMIN MIDDLEWARE
======================= */
function verifyAdmin(req, res, next) {
  try {
    const raw = req.headers.authorization;
    if (!raw) return res.status(401).json({ msg: "Missing Admin Token" });

    const token = raw.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.adminId = decoded.adminId;
    next();
  } catch {
    res.status(401).json({ msg: "Invalid or expired token" });
  }
}

/* =======================
   CREATE USER
======================= */
router.post("/user", verifyAdmin, async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password)
      return res.status(400).json({ msg: "All fields required" });

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ msg: "Email already exists" });

    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      email,
      password: hashed,
      joinedContests: [],
    });

    res.json({ msg: "User created", user });
  } catch (err) {
    res.status(500).json({ msg: "Server Error" });
  }
});

/* =======================
   DELETE USER
======================= */
router.delete("/user/:id", verifyAdmin, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ msg: "User deleted" });
  } catch {
    res.status(500).json({ msg: "Server Error" });
  }
});

/* =======================
   GET ALL USERS
======================= */
router.get("/users", verifyAdmin, async (req, res) => {
  try {
    const users = await User.find(
      {},
      "-password -resetPasswordToken -resetPasswordExpires"
    );
    res.json(users);
  } catch {
    res.status(500).json({ msg: "Server Error" });
  }
});

/* =======================
   CREATE CONTEST
======================= */
router.post("/contest", verifyAdmin, upload.single("image"), async (req, res) => {
  try {
    const { title, entryFee, maxPlayers } = req.body;
    if (!req.file) return res.status(400).json({ msg: "Image required" });

    const contest = await Contest.create({
      title,
      entryFee,
      maxPlayers,
      image: req.file.filename,
      participants: [],
    });

    res.json({ msg: "Contest created", contest });
  } catch {
    res.status(500).json({ msg: "Server Error" });
  }
});

/* =======================
   LIST / EDIT / DELETE CONTEST
======================= */
router.get("/contests", verifyAdmin, async (req, res) => {
  try {
    const list = await Contest.find({});
    res.json(list);
  } catch {
    res.status(500).json({ msg: "Server Error" });
  }
});

router.get("/contest/:id", verifyAdmin, async (req, res) => {
  try {
    const contest = await Contest.findById(req.params.id);
    res.json(contest);
  } catch {
    res.status(500).json({ msg: "Server Error" });
  }
});

router.put("/contest/:id", verifyAdmin, async (req, res) => {
  try {
    const contest = await Contest.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ msg: "Contest updated", contest });
  } catch {
    res.status(500).json({ msg: "Server Error" });
  }
});

router.delete("/contest/:id", verifyAdmin, async (req, res) => {
  try {
    await Contest.findByIdAndDelete(req.params.id);
    res.json({ msg: "Contest deleted" });
  } catch {
    res.status(500).json({ msg: "Server Error" });
  }
});

export { verifyAdmin }; // ⭐ EXPORT ONLY HERE
export default router;
