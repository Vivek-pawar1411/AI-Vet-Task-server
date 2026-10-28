export function errorHandler(error, _req, res, _next) {
  const statusCode = error.statusCode
    || (error.name === "ValidationError" || error.name === "CastError" ? 400 : 0)
    || (error.code === 11000 ? 409 : 500);
  if (statusCode >= 500) console.error(error);
  const message = error.code === 11000
    ? "A record with these details already exists"
    : statusCode >= 500
      ? statusCode === 503 ? error.message : "An unexpected server error occurred"
      : error.message;
  res.status(statusCode).json({
    message,
    ...(error.name === "ValidationError" ? { errors: Object.values(error.errors).map((item) => item.message) } : {}),
  });
}
