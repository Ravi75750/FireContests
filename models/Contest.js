import mongoose from "mongoose";

const ContestSchema = new mongoose.Schema({
  title: { type: String, required: true },
  entryFee: { type: Number, required: true },
  maxPlayers: { type: Number, required: true },
  image: { type: String, required: true }, // file name stored here
  participants: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }
  ]
}, { timestamps: true });

export default mongoose.model("Contest", ContestSchema);
