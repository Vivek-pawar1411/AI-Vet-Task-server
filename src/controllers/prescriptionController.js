import Pet from "../models/Pet.js";
import Prescription from "../models/Prescription.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { pickFields } from "../utils/pickFields.js";

export const listPrescriptions = asyncHandler(async (req, res) => {
  const filter = { owner: req.user.id };
  if (req.query.pet) filter.pet = req.query.pet;
  res.json(await Prescription.find(filter).populate("pet", "name species").sort({ prescribedAt: -1 }));
});

export const createPrescription = asyncHandler(async (req, res) => {
  if (!(await Pet.exists({ _id: req.body.pet, owner: req.user.id }))) {
    throw new AppError("Select one of your pets", 400);
  }
  const prescription = await Prescription.create({ ...req.body, owner: req.user.id });
  res.status(201).json(await prescription.populate("pet", "name species"));
});

export const updatePrescription = asyncHandler(async (req, res) => {
  const updates = pickFields(req.body, ["pet", "medication", "dosage", "instructions", "prescribedBy", "prescribedAt", "expiresAt"]);
  if (updates.pet && !(await Pet.exists({ _id: updates.pet, owner: req.user.id }))) {
    throw new AppError("Select one of your pets", 400);
  }
  const prescription = await Prescription.findOneAndUpdate(
    { _id: req.params.id, owner: req.user.id },
    updates,
    { new: true, runValidators: true }
  ).populate("pet", "name species");
  if (!prescription) throw new AppError("Prescription not found", 404);
  res.json(prescription);
});

export const deletePrescription = asyncHandler(async (req, res) => {
  const prescription = await Prescription.findOneAndDelete({ _id: req.params.id, owner: req.user.id });
  if (!prescription) throw new AppError("Prescription not found", 404);
  res.status(204).end();
});
