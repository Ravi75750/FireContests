import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load env
dotenv.config();

/* ROUTES */
import highlightRoutes from "./routes/highlights.js";
import authRoutes from "./routes/auth.js";
import contestRoutes from "./routes/contests.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import adminRoutes from "./routes/admin.js";

/* APP INIT */
const app = express();
const PORT = process.env.PORT || 5000;

/* PATH FIX */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* MIDDLEWARE */
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/uploads/payments", express.static("uploads/payments"));


/* DATABASE */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("🔥 MongoDB Connected"))
  .catch(err => console.error("❌ DB ERROR:", err));

/* ROUTES */
app.use("/api/auth", authRoutes);
app.use("/api/contests", contestRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/highlights", highlightRoutes); // ⭐ Correct order

/* START */
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
