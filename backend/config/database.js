import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

export const connectDB = async () => {
  try {
    if (!MONGODB_URI) {
      console.warn("⚠️ MONGODB_URI is not set in environment variables.");
      console.warn("⚠️ Falling back to mock authentication mode. Database features will be limited.");
      console.warn("👉 To fix this, add MONGODB_URI to your Secrets in the AI Studio Settings.");
      return false;
    }

    await mongoose.connect(MONGODB_URI);

    console.log("✅ Connected to MongoDB successfully");
    return true;
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    console.warn("⚠️ Continuing without database. Some features may be limited.");
    return false;
  }
};

export const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    console.log("✅ Disconnected from MongoDB");
  } catch (error) {
    console.error("❌ MongoDB disconnection error:", error.message);
  }
};
