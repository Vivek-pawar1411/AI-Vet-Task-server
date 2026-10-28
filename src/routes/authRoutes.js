import { Router } from "express";
import rateLimit from "express-rate-limit";
import { getCurrentUser, login, logout, signup } from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: (_req, res) => res.status(429).json({ message: "Too many sign-in attempts. Please try again later." }),
});
router.post("/signup", authLimiter, signup);
router.post("/login", authLimiter, login);
router.post("/logout", logout);
router.get("/me", requireAuth, getCurrentUser);
export default router;
