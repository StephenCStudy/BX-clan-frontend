import { toast } from "react-toastify";
import axios from "axios";

export const uploadToCloudinary = async (file: File): Promise<string> => {
  if (!file) {
    toast.error("Vui lòng chọn file!!");
    throw new Error("No file selected");
  }

  // Validate file type
  if (!file.type.startsWith("image/")) {
    toast.error("Chỉ chấp nhận file ảnh!");
    throw new Error("Invalid file type");
  }

  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    toast.error("Kích thước ảnh không được vượt quá 5MB!");
    throw new Error("File too large");
  }

  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    toast.error("Chưa cấu hình Cloudinary!");
    throw new Error("Missing Cloudinary config");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);

  try {
    const res = await axios.post(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return res.data.secure_url;
  } catch (error: any) {
    console.error("Cloudinary upload error:", error);
    const errorMsg =
      error?.response?.data?.error?.message || "Upload ảnh thất bại!";
    throw new Error(errorMsg);
  }
};
