import mongoose from 'mongoose';
import dotenv from 'dotenv';
import HomepageSection from '../model/homepageModel.js';

// Load environment variables
dotenv.config();

const seedHomepageData = async () => {
    try {
        console.log('🌱 Starting homepage data seeding...');
        
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URL, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            dbName: process.env.DB_NAME || "missing_found_db"
        });

        console.log('✅ Connected to MongoDB successfully');

        // Clear existing data
        await HomepageSection.deleteMany({});
        console.log('🗑️  Cleared existing homepage data');

        // Seed homepage data
        const homepageData = [
            {
                section: "hero",
                title: "Reuniting Families Through Technology",
                subtitle: "Join thousands of volunteers using AI-powered facial recognition to help find missing persons and bring families back together.",
                data: {
                    buttonText: "Search Cases",
                    buttonLink: "/cases"
                },
                order: 1,
                isActive: true
            },
            {
                section: "impact",
                title: "Our Impact", 
                subtitle: "",
                data: {
                    stats: [
                        {
                            value: "1,000+",
                            label: "  Cases Registered  "
                        },
                        {
                            value: "500+", 
                            label: "Successful Reunions"
                        },
                        {
                            value: "Global",
                            label: "Worldwide Coverage"
                        }
                    ]
                },
                order: 2,
                isActive: true
            },
            {
                section: "features",
                title: "How We Help",
                subtitle: "Our comprehensive platform leverages advanced AI technology and multi-stakeholder collaboration to facilitate both missing person searches and found person identification, creating a complete ecosystem for family reunification.",
                data: {
                    features: [
                        {
                            icon: "Search",
                            title: "AI-Powered Facial Recognition",
                            description: "Advanced AI technology for accurate facial matching across diverse conditions and image qualities, helping identify both missing and found persons."
                        },
                        {
                            icon: "Users", 
                            title: "Multi-Stakeholder Network",
                            description: "Connect with General Users, Police departments, and NGOs to create a comprehensive support network for case registration, investigation, and resolution."
                        },
                        {
                            icon: "Shield",
                            title: "Secure Case Management", 
                            description: "Enterprise-grade security with role-based access control and privacy protection for sensitive personal information and case data."
                        },
                        {
                            icon: "Heart",
                            title: "Dual-Purpose Platform",
                            description: "Complete solution for both missing person searches and found person identification, with automated similarity matching and case correlation capabilities."
                        }
                    ]
                },
                order: 3,
                isActive: true
            },
            {
                section: "guidance",
                title: "What To Do",
                subtitle: "Follow these steps if you have a missing person or found someone who appears lost",
                data: {
                    steps: [
                        {
                            type: "missing",
                            step: "1",
                            title: "Report Immediately",
                            description: "Contact local police and file a missing person report as soon as possible"
                        },
                        {
                            type: "found",
                            step: "1", 
                            title: "Ensure Safety",
                            description: "Make sure the person is safe and provide immediate assistance if needed"
                        },
                        {
                            type: "missing",
                            step: "2",
                            title: "Gather Information",
                            description: "Collect recent photos, personal details, last known location, and any identifying marks"
                        },
                        {
                            type: "found",
                            step: "2",
                            title: "Contact Authorities",
                            description: "Notify local police or emergency services about the found person"
                        },
                        {
                            type: "missing",
                            step: "3",
                            title: "Register on FindMe",
                            description: "Create a case on our platform to leverage AI-powered search and community support"
                        },
                        {
                            type: "found",
                            step: "3",
                            title: "Register on FindMe",
                            description: "Create a found person case to help match with missing person reports"
                        },
                        {
                            type: "missing",
                            step: "4",
                            title: "Share Widely",
                            description: "Use social media and community networks to spread awareness and gather leads"
                        },
                        {
                            type: "found",
                            step: "4",
                            title: "Provide Details",
                            description: "Share location, condition, and any information that could help identify the person"
                        }
                    ]
                },
                order: 4,
                isActive: true
            },
            {
                section: "testimonials",
                title: "What People Say",
                subtitle: "Real stories from families who found hope and reunited with their loved ones",
                data: {
                    testimonials: [
                        {
                            message: "FindMe helped us locate my missing brother after 3 months. The AI technology and community support made all the difference. We're forever grateful.",
                            name: "Sarah Johnson",
                            location: "New York, USA"
                        },
                        {
                            message: "As a police officer, I've seen how this platform streamlines our investigation process. The facial recognition technology is incredibly accurate and saves us valuable time.",
                            name: "Detective Michael Chen",
                            location: "Los Angeles, USA"
                        },
                        {
                            message: "Our NGO has been using FindMe for 2 years now. The multi-stakeholder collaboration feature helps us coordinate with police and families effectively.",
                            name: "Dr. Priya Sharma",
                            location: "Mumbai, India"
                        },
                        {
                            message: "I found a lost child at the railway station and used FindMe to help reunite them with their family within hours. The platform is truly making a difference.",
                            name: "Rajesh Kumar",
                            location: "Delhi, India"
                        }
                    ]
                },
                order: 5,
                isActive: true
            }
        ];

        // Insert data
        await HomepageSection.insertMany(homepageData);
        console.log('✅ Homepage data seeded successfully');
        console.log(`📊 Inserted ${homepageData.length} sections`);
        
        // Verify data
        const count = await HomepageSection.countDocuments();
        console.log(`📈 Total sections in database: ${count}`);
        
        // Close connection
        await mongoose.connection.close();
        console.log('🔌 Database connection closed');
        console.log('🎉 Seeding completed successfully!');
        
    } catch (error) {
        console.error('❌ Error seeding homepage data:', error);
        process.exit(1);
    }
};

// Run the seeding
seedHomepageData();
