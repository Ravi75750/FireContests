import mongoose from "mongoose";

const SettingsSchema = new mongoose.Schema(
    {
        key: { type: String, required: true, unique: true }, // e.g., 'payment_qr'
        value: { type: mongoose.Schema.Types.Mixed, required: true }, // e.g., URL string or object
    },
    { timestamps: true }
);

export default mongoose.model("Settings", SettingsSchema);
