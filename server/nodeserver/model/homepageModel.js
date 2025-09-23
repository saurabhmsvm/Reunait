import mongoose from 'mongoose';

// Homepage section schema
const homepageSectionSchema = new mongoose.Schema({
    section: {
        type: String,
        required: true,
        unique: true,
        enum: ['hero', 'impact', 'features', 'guidance', 'testimonials']
    },
    title: {
        type: String,
        required: true
    },
    subtitle: {
        type: String,
        default: ''
    },
    data: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    order: {
        type: Number,
        required: true,
        min: 1
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Index for efficient querying
homepageSectionSchema.index({ order: 1 });
homepageSectionSchema.index({ isActive: 1 });

// Update the updatedAt field before saving
homepageSectionSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

// Static method to get all active sections ordered
homepageSectionSchema.statics.getActiveSections = function() {
    return this.find({ isActive: true }).sort({ order: 1 });
};

// Static method to get homepage data in the required format
homepageSectionSchema.statics.getHomepageData = async function() {
    try {
        const sections = await this.getActiveSections();
        
        // Process sections to limit testimonials to 50 random ones
        const processedSections = sections.map(section => {
            if (section.section === 'testimonials' && section.data && section.data.testimonials) {
                const testimonials = section.data.testimonials;
                
                // If we have more than 50 testimonials, randomly select 50
                if (testimonials.length > 50) {
                    const shuffled = [...testimonials].sort(() => 0.5 - Math.random());
                    const randomTestimonials = shuffled.slice(0, 50);
                    
                    return {
                        ...section.toObject(),
                        data: {
                            ...section.data,
                            testimonials: randomTestimonials
                        }
                    };
                }
            }
            
            return section.toObject();
        });
        
        return {
            success: true,
            data: processedSections
        };
    } catch (error) {
        throw new Error(`Failed to fetch homepage data: ${error.message}`);
    }
};


const HomepageSection = mongoose.model('HomepageSection', homepageSectionSchema);

export default HomepageSection;
