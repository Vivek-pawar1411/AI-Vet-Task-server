import Pet from "../models/Pet.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { pickFields } from "../utils/pickFields.js";

export const listPets = asyncHandler(async (req, res) => {
  res.json(await Pet.find({ owner: req.user.id }).sort({ createdAt: -1 }));
});

export const createPet = asyncHandler(async (req, res) => {
  const pet = await Pet.create({ ...req.body, owner: req.user.id });
  res.status(201).json(pet);
});

export const updatePet = asyncHandler(async (req, res) => {
  const updates = pickFields(req.body, ["name", "species", "breed", "age", "weight", "medicalNotes"]);
  const pet = await Pet.findOneAndUpdate(
    { _id: req.params.id, owner: req.user.id },
    updates,
    { new: true, runValidators: true, omitUndefined: true }
  );
  if (!pet) throw new AppError("Pet not found", 404);
  res.json(pet);
});

export const deletePet = asyncHandler(async (req, res) => {
  const pet = await Pet.findOneAndDelete({ _id: req.params.id, owner: req.user.id });
  if (!pet) throw new AppError("Pet not found", 404);
  res.status(204).end();
});
