import express from "express";
import multer from "multer";
import { predictDisease } from "../controllers/diseaseController.js";

const router = express.Router();

// Multer configuration for disease prediction
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Disease prediction endpoint with file upload (no auth required for public use)
router.post("/predict", upload.single('image'), predictDisease);

export default router;
