import { Router } from "express";
import {
  createAppointment,
  deleteAppointment,
  listAppointments,
  updateAppointment,
} from "../controllers/appointmentController.js";

const router = Router();
router.route("/").get(listAppointments).post(createAppointment);
router.route("/:id").patch(updateAppointment).delete(deleteAppointment);
export default router;
