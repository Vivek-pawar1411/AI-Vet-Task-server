import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    pet: { type: mongoose.Schema.Types.ObjectId, ref: "Pet", required: true },
    clinicName: { type: String, required: true, trim: true, maxlength: 150 },
    clinicAddress: { type: String, trim: true, maxlength: 300, default: "" },
    date: { type: Date, required: true },
    reason: { type: String, trim: true, maxlength: 2000, default: "" },
    status: {
      type: String,
      enum: ["scheduled", "confirmed", "completed", "cancelled"],
      default: "scheduled",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Appointment", appointmentSchema);
