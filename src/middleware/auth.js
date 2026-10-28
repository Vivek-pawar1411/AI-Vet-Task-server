import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const requireAuth = asyncHandler(async (req, _res, next) => {
  const token = req.cookies?.session;
  if (!token) throw new AppError("Please sign in to continue", 401);

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw new AppError("Your session is invalid or expired. Please sign in again.", 401);
  }

  const user = await User.findById(payload.sub).select("_id name email");
  if (!user) throw new AppError("Account not found", 401);
  req.user = user;
  next();
});
