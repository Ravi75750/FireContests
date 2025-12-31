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
      "https://freefire07.netlify.app",
      "http://localhost:5173",
      "http://localhost:5174",
    ],
    credentials: true,
  })

);
app.use(express.json());

/* DEBUG LOGGING */
app.use((req, res, next) => {
  console.log(`🔍 [LOG] ${req.method} ${req.url}`);
  next();
});

/* STATIC FILES */
/* STATIC FILES (Local Dev Only - Vercel uses Object Storage usually) */
// app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* DATABASE CONNECTION UTILS */
const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("🔥 MongoDB Connected");
  } catch (err) {
    console.error("❌ DB ERROR:", err);
  }
};

/* DB MIDDLEWARE (Ensure DB is connected for every request) */
app.use(async (req, res, next) => {
  await connectDB();
  next();
});

/* ROUTES */
import announcementRoutes from "./routes/announcements.js";

app.get("/", (req, res) => {
  res.send("API is running... 🚀");
});

app.use("/api/auth", authRoutes);
app.use("/api/contests", contestRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/highlights", highlightRoutes);
app.use("/api/announcements", announcementRoutes);

// Redeploy trigger: Force Vercel rebuild
console.log("🚀 Vercel Cold Start Checks...");

/* START SERVER (Local Development Only) */
if (process.env.NODE_ENV !== "production") {
  connectDB().then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  });
}

export default app;
