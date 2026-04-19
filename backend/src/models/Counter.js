import mongoose from "mongoose";

const CounterSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, required: true },
    seq: { type: Number, default: 0 }
  },
  { timestamps: true }
);

export const Counter = mongoose.model("Counter", CounterSchema);
