import express from 'express';
import { getHomepageData } from '../controllers/homepageController.js';

const router = express.Router();

// Public homepage data endpoint - no authentication required
router.get('/', getHomepageData);

export default router;
