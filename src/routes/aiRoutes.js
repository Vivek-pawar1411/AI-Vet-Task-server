import { Router } from "express";
import { createInference, listModels } from "../controllers/aiController.js";

const router = Router();
router.get("/models/:provider", listModels);
router.post("/chat", createInference);
export default router;
