import "dotenv/config"; // ✅ Load env vars before any other imports
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";

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
app.use(
  cors({
    origin: [
      "https://firecontest.netlify.app",
      "http://localhost:5173",
      "http://localhost:5174",
    ],
    credentials: true,
  })

);
app.use(express.json());

/* STATIC FILES */
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* DATABASE */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("🔥 MongoDB Connected"))
  .catch((err) => console.error("❌ DB ERROR:", err));

/* ROUTES */
app.get("/", (req, res) => {
  res.send("API is running... 🚀");
});

app.use("/api/auth", authRoutes);
app.use("/api/contests", contestRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/highlights", highlightRoutes);

/* START SERVER */
// Only listen when run directly (not in Vercel)
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

export default app;
