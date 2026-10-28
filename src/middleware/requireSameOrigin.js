import { AppError } from "../utils/AppError.js";

export function requireSameOrigin(req, _res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();

  const origin = req.get("origin");
  const allowedOrigin = (process.env.CLIENT_URL || "http://localhost:5173").replace(/\/$/, "");
  if (origin && origin !== allowedOrigin) {
    return next(new AppError("Request origin is not allowed", 403));
  }
  next();
}
