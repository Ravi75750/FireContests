import mongoose from "mongoose";

const HighlightSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },

    videoURL: {
      type: String,
      required: true,
    },

    thumbnail: {
      type: String,
      default: "",
    },

    date: {
      type: Date,
      default: Date.now
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Highlight", HighlightSchema);
