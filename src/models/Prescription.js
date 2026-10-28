import mongoose from "mongoose";

const prescriptionSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    pet: { type: mongoose.Schema.Types.ObjectId, ref: "Pet", required: true },
    medication: { type: String, required: true, trim: true, maxlength: 150 },
    dosage: { type: String, required: true, trim: true, maxlength: 150 },
    instructions: { type: String, trim: true, maxlength: 2000, default: "" },
    prescribedBy: { type: String, trim: true, maxlength: 150, default: "" },
    prescribedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("Prescription", prescriptionSchema);
