import mongoose from 'mongoose';
import dotenv from 'dotenv';
import HomepageSection from '../model/homepageModel.js';

// Load environment variables
dotenv.config();

const fixTestimonials = async () => {
    try {
        console.log('🔧 Starting testimonials section fix...');
        
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URL, {
            dbName: process.env.DB_NAME || "missing_found_db"
        });

        console.log('✅ Connected to MongoDB successfully');

        // Delete existing testimonials section
        const deleteResult = await HomepageSection.deleteOne({ section: 'testimonials' });
        console.log('🗑️  Deleted existing testimonials section:', deleteResult);

        // Create new testimonials section with correct schema
        const newTestimonialsSection = new HomepageSection({
            section: "testimonials",
            title: "What People Say",
            subtitle: "Real stories from families who found hope and reunited with their loved ones",
            data: {
                testimonials: [
                    {
                        message: "FindMe helped us locate my missing brother after 3 months. The AI technology and community support made all the difference. We're forever grateful.",
                        name: "Sarah Johnson"
                    },
                    {
                        message: "As a police officer, I've seen how this platform streamlines our investigation process. The facial recognition technology is incredibly accurate and saves us valuable time.",
                        name: "Detective Michael Chen"
                    },
                    {
                        message: "Our NGO has been using FindMe for 2 years now. The multi-stakeholder collaboration feature helps us coordinate with police and families effectively.",
                        name: "Dr. Priya Sharma"
                    },
                    {
                        message: "I found a lost child at the railway station and used FindMe to help reunite them with their family within hours. The platform is truly making a difference.",
                        name: "Rajesh Kumar"
                    }
                ]
            },
            order: 5,
            isActive: true
        });

        // Save the new section
        const savedSection = await newTestimonialsSection.save();
        console.log('✅ Created new testimonials section:', savedSection._id);
        console.log('📊 Initial testimonials count:', savedSection.data.testimonials.length);

        // Verify the section was created correctly
        const verifySection = await HomepageSection.findOne({ section: 'testimonials' });
        console.log('🔍 Verification - Section exists:', !!verifySection);
        console.log('📊 Verification - Testimonials count:', verifySection.data.testimonials.length);
        console.log('📝 Verification - First testimonial:', verifySection.data.testimonials[0]);

        // Close connection
        await mongoose.connection.close();
        console.log('🔌 Database connection closed');
        console.log('🎉 Testimonials section fix completed successfully!');
        
    } catch (error) {
        console.error('❌ Error fixing testimonials section:', error);
        process.exit(1);
    }
};

// Run the fix
fixTestimonials();
