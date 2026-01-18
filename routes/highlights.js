import express from "express";
import Highlight from "../models/highlight.js";
import { verifyAdmin } from "./admin.js"; // import middleware

const router = express.Router();

/* ============================
   CREATE HIGHLIGHT (Auto Thumbnail)
============================ */
/* ============================
   CREATE HIGHLIGHT (Auto Thumbnail & YouTube Support)
============================ */
router.post("/", verifyAdmin, async (req, res) => {
  try {
    const { title, videoURL, date } = req.body;

    if (!title || !videoURL)
      return res.status(400).json({ msg: "Title & Video URL required" });

    // Extract YouTube ID
    // Supports: 
    // - https://www.youtube.com/watch?v=VIDEO_ID
    // - https://youtu.be/VIDEO_ID
    // - https://www.youtube.com/embed/VIDEO_ID
    let videoId = "";
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = videoURL.match(regex);
    if (match && match[1]) {
      videoId = match[1];
    } else {
      // Fallback or error if strict validation needed
      console.warn("Could not extract YouTube ID from:", videoURL);
      // For now, if extraction fails, we might just store the URL, but thumbnail won't work well.
      // Let's assume user inputs valid YouTube links as requested.
    }

    // Auto thumbnail from YouTube
    const autoThumb = videoId
      ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
      : "/default-thumb.jpg";

    const highlight = await Highlight.create({
      title,
      videoURL, // We store the full URL or we could store just ID. Keeping URL is safer for flexibility.
      thumbnail: autoThumb,
      date: date || Date.now()
    });

    res.json({
      success: true,
      msg: "Highlight uploaded successfully!",
      highlight
    });
  } catch (err) {
    console.log("HIGHLIGHT ERROR:", err);
    res.status(500).json({ msg: "Server Error" });
  }
});

/* ============================
   GET ALL HIGHLIGHTS
============================ */
router.get("/", async (req, res) => {
  const highlights = await Highlight.find().sort({ createdAt: -1 });
  res.json(highlights);
});

/* ============================
   DELETE HIGHLIGHT (Admin)
============================ */
router.delete("/:id", verifyAdmin, async (req, res) => {
  await Highlight.findByIdAndDelete(req.params.id);
  res.json({ msg: "Highlight deleted" });
});

export default router;
