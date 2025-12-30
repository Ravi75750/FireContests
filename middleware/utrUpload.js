import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../utils/cloudinary.js"; // Reuse existing config

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "firecontests_payments",
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
    transformation: [{ width: 1000, height: 1000, crop: "limit" }],
  },
});

export const utrUpload = multer({ storage });
