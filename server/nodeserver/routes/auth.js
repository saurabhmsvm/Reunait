import express from "express";
import { registerUser } from "../controllers/registerUser.js";
import { registerCase } from "../controllers/registerCase.js";
import { loginUser } from "../controllers/loginUser.js";
import { logoutUser } from "../controllers/logoutUser.js";
import { verifyToken } from "../middleware/verifyToken.js";
import multer from "multer";

const router = express.Router();

// Configure multer for memory storage
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

router.post("/registerUser", registerUser);
router.post("/registerCase", upload.array('images', 2), registerCase);
router.post("/login", loginUser);
router.post("/logout", verifyToken, logoutUser);

export default router;