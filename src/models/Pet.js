import mongoose from "mongoose";

const petSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    species: { type: String, required: true, trim: true, maxlength: 60 },
    breed: { type: String, trim: true, maxlength: 100, default: "" },
    age: { type: Number, min: 0, max: 100, default: null },
    weight: { type: Number, min: 0, max: 1000, default: null },
    medicalNotes: { type: String, trim: true, maxlength: 5000, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("Pet", petSchema);
