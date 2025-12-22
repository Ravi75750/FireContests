import express from "express";
import Highlight from "../models/highlight.js";
import { verifyAdmin } from "./admin.js"; // import middleware

const router = express.Router();

/* ============================
   CREATE HIGHLIGHT (Auto Thumbnail)
============================ */
router.post("/", verifyAdmin, async (req, res) => {
  try {
    const { title, videoURL } = req.body;

    if (!title || !videoURL)
      return res.status(400).json({ msg: "Title & Video URL required" });

    // Auto thumbnail
    const autoThumb = `${videoURL}?preview=1`;

    const highlight = await Highlight.create({
      title,
      videoURL,
      thumbnail: autoThumb
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
