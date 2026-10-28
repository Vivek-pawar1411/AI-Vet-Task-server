import Appointment from "../models/Appointment.js";
import Pet from "../models/Pet.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { pickFields } from "../utils/pickFields.js";

export const listAppointments = asyncHandler(async (req, res) => {
  const appointments = await Appointment.find({ owner: req.user.id })
    .populate("pet", "name species")
    .sort({ date: -1 });
  res.json(appointments);
});

export const createAppointment = asyncHandler(async (req, res) => {
  if (!(await Pet.exists({ _id: req.body.pet, owner: req.user.id }))) {
    throw new AppError("Select one of your pets", 400);
  }
  const appointment = await Appointment.create({ ...req.body, owner: req.user.id });
  res.status(201).json(await appointment.populate("pet", "name species"));
});

export const updateAppointment = asyncHandler(async (req, res) => {
  const updates = pickFields(req.body, ["pet", "clinicName", "clinicAddress", "date", "reason", "status"]);
  if (updates.pet && !(await Pet.exists({ _id: updates.pet, owner: req.user.id }))) {
    throw new AppError("Select one of your pets", 400);
  }
  const appointment = await Appointment.findOneAndUpdate(
    { _id: req.params.id, owner: req.user.id },
    updates,
    { new: true, runValidators: true }
  ).populate("pet", "name species");
  if (!appointment) throw new AppError("Appointment not found", 404);
  res.json(appointment);
});

export const deleteAppointment = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findOneAndDelete({ _id: req.params.id, owner: req.user.id });
  if (!appointment) throw new AppError("Appointment not found", 404);
  res.status(204).end();
});
