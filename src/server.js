import "dotenv/config";
import app from "./app.js";
import { connectDatabase } from "./config/db.js";

const port = Number(process.env.PORT) || 5000;

try {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET must be set to a random value of at least 32 characters");
  }
  await connectDatabase();
  app.listen(port, () => console.info(`AI Vet API listening on port ${port}`));
} catch (error) {
  console.error("Failed to start API:", error);
  process.exitCode = 1;
}
