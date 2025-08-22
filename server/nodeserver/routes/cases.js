import express from "express";
import { getCases } from "../controllers/getCases.js";
import { getCaseById } from "../controllers/getCaseById.js";

const router = express.Router();

// GET /cases - Fetch cases with pagination and filters
router.get("/", getCases);
// GET /cases/:id - Fetch single case
router.get("/:id", getCaseById);

export default router;
