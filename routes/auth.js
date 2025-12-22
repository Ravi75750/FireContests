import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
// import nodemailer from "nodemailer"; // Removed nodemailer
import User from "../models/user.js";

const router = express.Router();

/* ========================================================================
   SMTP TRANSPORTER (Mailtra) - REMOVED
   ======================================================================== 
function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}
======================================================================== */

/* ========================================================================
   1. REGISTER USER
   POST /api/auth/register
   ======================================================================== */
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password)
      return res.status(400).json({ msg: "All fields are required" });

    const exists = await User.findOne({ email });
    if (exists)
      return res.status(400).json({ msg: "User already exists" });

    const user = new User({ username, email, password });
    await user.save();

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    return res.status(201).json({
      msg: "Registration successful",
      token,
      userId: user._id,
      username: user.username
    });

  } catch (error) {
    console.log("REGISTER ERROR:", error);
    return res.status(500).json({ msg: "Server Error" });
  }
});

/* ========================================================================
   2. LOGIN USER
   POST /api/auth/login
   ======================================================================== */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ msg: "Email and password required" });

    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ msg: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ msg: "Invalid credentials" });

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    return res.json({
      msg: "Login successful",
      token,
      userId: user._id,
      username: user.username
    });

  } catch (error) {
    console.log("LOGIN ERROR:", error);
    return res.status(500).json({ msg: "Server Error" });
  }
});

/* ========================================================================
   3. FORGOT PASSWORD
   POST /api/auth/forgot-password
   ======================================================================== */
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email)
      return res.status(400).json({ msg: "Email is required" });

    const user = await User.findOne({ email });

    // Never reveal email existence
    if (!user) {
      return res.json({
        msg: "If this email exists, reset instructions will be sent."
      });
    }

    // Create reset token (plainToken is used in the URL)
    const plainToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(plainToken).digest("hex");
    const expires = Date.now() + 60 * 60 * 1000; // 1 hour

    // Save hashed token
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(expires);
    await user.save();

    // The frontend URL for the reset link
    const frontendBase = process.env.FRONTEND_URL;
    const resetUrl = `${frontendBase}/reset-password?token=${plainToken}&id=${user._id}`;

    /* NOTE: The email sending logic has been removed as requested. 
       You need to implement your preferred mail service here, 
       using the 'resetUrl' created above.
    */
    
    // Example of what the email logic might look like if you used a simple 'mail' function:
    // await sendResetPasswordEmail(user.email, user.username, resetUrl);


    return res.json({
      msg: "If this email exists, reset instructions have been sent."
    });

  } catch (err) {
    console.log("FORGOT PASSWORD ERROR:", err);
    return res.status(500).json({ msg: "Server Error" });
  }
});

/* ========================================================================
   4. RESET PASSWORD
   POST /api/auth/reset-password
   ======================================================================== */
router.post("/reset-password", async (req, res) => {
  try {
    const { token, userId, password } = req.body;

    if (!token || !userId || !password)
      return res.status(400).json({ msg: "Missing required fields" });

    // 1. Hash the plain token from the URL
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // 2. Find the user, token, AND check for expiration
    const user = await User.findOne({
      _id: userId,
      resetPasswordToken: hashedToken,
      // FIX APPLIED: Compare stored Date object with current Date object
      resetPasswordExpires: { $gt: new Date() } 
    });

    if (!user)
      return res.status(400).json({ msg: "Invalid or expired token" });

    // 3. Hash and update password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    // 4. Clear token fields after successful reset
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    // Success response
    return res.json({ msg: "Password reset successful. Redirecting to login..." });

  } catch (error) {
    console.log("RESET PASSWORD ERROR:", error);
    return res.status(500).json({ msg: "Server Error" });
  }
});

export default router;