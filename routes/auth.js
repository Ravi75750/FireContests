import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import sendEmail from "../utils/sendEmail.js";
import User from "../models/user.js";
import Admin from "../models/admin.js";

const router = express.Router();

/* ========================================================================
   1️⃣ REGISTER USER
   POST /api/auth/register
======================================================================== */
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Email validation regex (basic standard)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ msg: "Invalid email format" });
    }

    if (!username || !email || !password) {
      return res.status(400).json({ msg: "All fields are required" });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(409).json({ msg: "User already exists" });
    }

    const user = await User.create({
      username,
      email,
      password,
    });

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    return res.status(201).json({
      msg: "Registration successful",
      token,
      userId: user._id,
      username: user.username,
    });
  } catch (error) {
    console.error("REGISTER ERROR:", error);
    return res.status(500).json({ msg: "Server error" });
  }
});

/* ========================================================================
   2️⃣ LOGIN USER
   POST /api/auth/login
======================================================================== */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ msg: "Email and password required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: "Invalid credentials" });
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // ✅ NOTIFY ADMIN (Async - don't await)
    // Find One Admin or All Admins to notify
    // For now, we notify the FIRST admin found, or a specific super admin if we had that logic.
    // Ideally, we might want to notify ALL admins.
    // ✅ NOTIFY ADMIN (Async - don't await)
    // Actually, I will add the import at the top in a separate tool call to be clean.

    // Logic:
    (async () => {
      try {
        // You might have multiple admins. Sending to the first one found or a specific env email.
        // Let's try to find an admin.
        const admin = await Admin.findOne();
        if (admin && admin.email) {
          const time = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
          await sendEmail({
            to: admin.email,
            subject: `🔔 New Login: ${user.username}`,
            html: `<p>User <b>${user.username}</b> (${user.email}) logged in at ${time}.</p>`
          });
        }
      } catch (e) {
        console.error("Failed to notifiy admin:", e);
      }
    })();

    return res.json({
      msg: "Login successful",
      token,
      userId: user._id,
      username: user.username,
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    return res.status(500).json({ msg: "Server error" });
  }
});

/* ========================================================================
   3️⃣ FORGOT PASSWORD
   POST /api/auth/forgot-password
======================================================================== */
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ msg: "Email is required" });
    }

    const user = await User.findOne({ email });

    // ✅ SECURITY: do NOT reveal if email exists
    if (!user) {
      return res.json({ msg: "If email exists, reset link sent" });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");

    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 min
    await user.save();

    const resetLink = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

    await sendEmail({
      to: user.email,
      subject: "Reset Your Password",
      html: `
        <h2>Password Reset</h2>
        <p>Click the link below to reset your password:</p>
        <a href="${resetLink}">${resetLink}</a>
        <p>This link will expire in 15 minutes.</p>
      `,
    });

    return res.json({ msg: "Reset link sent to email" });
  } catch (error) {
    console.error("FORGOT PASSWORD ERROR:", error);
    return res.status(500).json({ msg: "Server error" });
  }
});

/* ========================================================================
   4️⃣ RESET PASSWORD
   POST /api/auth/reset-password/:token
======================================================================== */
router.post("/reset-password/:token", async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ msg: "New password required" });
    }

    const hashedToken = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ msg: "Invalid or expired token" });
    }

    // ✅ HASH NEW PASSWORD (Handled by Model)
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    return res.json({ msg: "Password reset successful" });
  } catch (error) {
    console.error("RESET PASSWORD ERROR:", error);
    return res.status(500).json({ msg: "Server error" });
  }
});

export default router;
