import { Router } from "express";
import {
  createPrescription,
  deletePrescription,
  listPrescriptions,
  updatePrescription,
} from "../controllers/prescriptionController.js";

const router = Router();
router.route("/").get(listPrescriptions).post(createPrescription);
router.route("/:id").patch(updatePrescription).delete(deletePrescription);
export default router;
