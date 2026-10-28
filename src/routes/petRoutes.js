import { Router } from "express";
import { createPet, deletePet, listPets, updatePet } from "../controllers/petController.js";

const router = Router();
router.route("/").get(listPets).post(createPet);
router.route("/:id").patch(updatePet).delete(deletePet);
export default router;
