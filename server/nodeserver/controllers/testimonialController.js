import HomepageSection from '../model/homepageModel.js';

// Submit a new testimonial
export const submitTestimonial = async (req, res) => {
  try {
    const { name, message } = req.body;

    // Validate required fields
    if (!name || !message) {
      return res.status(400).json({
        success: false,
        message: 'Name and message are required'
      });
    }

    // Find the testimonials section
    const testimonialsSection = await HomepageSection.findOne({ section: 'testimonials' });
    
    if (!testimonialsSection) {
      return res.status(404).json({
        success: false,
        message: 'Testimonials section not found'
      });
    }

    // Create new testimonial object
    const newTestimonial = {
      name,
      message
    };

    // Append new testimonial to the existing testimonials array
    testimonialsSection.data.testimonials.push(newTestimonial);
    
    // Mark the nested data object as modified so Mongoose knows to save it
    testimonialsSection.markModified('data');
    
    // Save the updated section
    await testimonialsSection.save();

    res.status(201).json({
      success: true,
      message: 'Testimonial submitted successfully!'
    });

  } catch (error) {
    console.error('Error submitting testimonial:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit testimonial',
      error: error.message
    });
  }
};
