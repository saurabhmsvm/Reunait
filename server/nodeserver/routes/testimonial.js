import express from 'express';
import { submitTestimonial } from '../controllers/testimonialController.js';

const router = express.Router();

// Only POST route for testimonial submission
router.post('/', submitTestimonial);

export default router;
