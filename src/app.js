import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { connectDatabase } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import petRoutes from "./routes/petRoutes.js";
import appointmentRoutes from "./routes/appointmentRoutes.js";
import prescriptionRoutes from "./routes/prescriptionRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import { requireAuth } from "./middleware/auth.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { AppError } from "./utils/AppError.js";

const app = express();

app.set("trust proxy", 1);
app.disable("x-powered-by");

// 1. CORS SABSE PEHLE AAYEGA
const corsOptions = {
  origin: function (origin, callback) {
    if (
      !origin || 
      origin === "http://localhost:5173" ||
      origin === "http://localhost:3000" ||
      origin === "https://ai-vet-task.vercel.app" ||
      origin.endsWith(".vercel.app")
    ) {
      callback(null, true);
    } else {
      callback(null, false); // Error throw karne ke bajaye false pass karein
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// 2. PARSERS
app.use(express.json({ limit: "20kb" }));
app.use(cookieParser());

// 3. DATABASE CONNECTION MIDDLEWARE (CORS ke baad)
let isDbConnected = false;
app.use(async (_req, _res, next) => {
  if (!isDbConnected) {
    try {
      await connectDatabase();
      isDbConnected = true;
    } catch (err) {
      console.error("Database connection failed:", err);
      return next(new AppError("Database service is unavailable", 503));
    }
  }
  next();
});

// Base health routes
app.get("/", (_req, res) => res.json({ status: "ok", message: "Server running" }));
app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

// Routes
const router = express.Router();
router.use("/auth", authRoutes);
router.use("/ai", requireAuth, rateLimit({ windowMs: 60_000, limit: 20 }), aiRoutes);
router.use("/pets", requireAuth, petRoutes);
router.use("/appointments", requireAuth, appointmentRoutes);
router.use("/prescriptions", requireAuth, prescriptionRoutes);

app.use("/api", router);
app.use("/", router);

app.use((_req, res) => res.status(404).json({ message: "Route not found" }));
app.use(errorHandler);

export default app;