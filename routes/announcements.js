import express from "express";
import Announcement from "../models/Announcement.js";
import { verifyAdmin } from "./admin.js"; // Reuse admin middleware

const router = express.Router();

/* ======================================================
   GET LATEST ANNOUNCEMENTS (PUBLIC)
====================================================== */
router.get("/", async (req, res) => {
    try {
        const announcements = await Announcement.find().sort({ createdAt: -1 });
        res.json(announcements);
    } catch (err) {
        console.error("GET ANNOUNCEMENTS ERROR:", err);
        res.status(500).json({ msg: "Server error" });
    }
});

/* ======================================================
   CREATE ANNOUNCEMENT (ADMIN)
====================================================== */
router.post("/", verifyAdmin, async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ msg: "Message is required" });
        }

        const announcement = await Announcement.create({ message });
        res.status(201).json(announcement);
    } catch (err) {
        console.error("CREATE ANNOUNCEMENT ERROR:", err);
        res.status(500).json({ msg: "Server error" });
    }
});

/* ======================================================
   DELETE ANNOUNCEMENT (ADMIN)
====================================================== */
router.delete("/:id", verifyAdmin, async (req, res) => {
    try {
        await Announcement.findByIdAndDelete(req.params.id);
        res.json({ msg: "Announcement deleted" });
    } catch (err) {
        console.error("DELETE ANNOUNCEMENT ERROR:", err);
        res.status(500).json({ msg: "Server error" });
    }
});

export default router;
