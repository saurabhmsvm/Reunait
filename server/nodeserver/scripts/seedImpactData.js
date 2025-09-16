import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Impact from '../model/impactModel.js';

// Load environment variables
dotenv.config();

const seedImpactData = async () => {
    try {
        console.log('🌱 Starting impact data seeding...');

        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URL, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            dbName: process.env.DB_NAME || "missing_found_db"
        });

        console.log('✅ Connected to MongoDB');

        // Clear existing impact data
        await Impact.deleteMany({});
        console.log('🗑️ Cleared existing impact data');

        // Create initial impact statistics
        const initialImpactData = {
            totalCases: 1247,
            resolvedCases: 892,
            activeCases: 355,
            familiesReunited: 892,
            lastUpdated: new Date()
        };

        const impact = new Impact(initialImpactData);
        await impact.save();

        console.log('✅ Impact data seeded successfully:');
        console.log(`   - Total Cases: ${initialImpactData.totalCases.toLocaleString()}`);
        console.log(`   - Resolved Cases: ${initialImpactData.resolvedCases.toLocaleString()}`);
        console.log(`   - Active Cases: ${initialImpactData.activeCases.toLocaleString()}`);
        console.log(`   - Families Reunited: ${initialImpactData.familiesReunited.toLocaleString()}`);

    } catch (error) {
        console.error('❌ Error seeding impact data:', error);
    } finally {
        // Close the connection
        await mongoose.connection.close();
        console.log('🔌 Database connection closed');
        process.exit(0);
    }
};

// Run the seeding function
seedImpactData();
