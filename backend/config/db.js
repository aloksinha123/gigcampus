import mongoose from 'mongoose';

const connectDB = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            console.warn('⚠️ MONGODB_URI is not set in environment variables.');
            return;
        }

        console.log('Attempting to connect to MongoDB...');
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of default 30s
            maxPoolSize: 10,
            autoIndex: process.env.NODE_ENV !== 'production', // Skip automatic index creation on prod cold starts
        });
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
        console.log('Database Name:', conn.connection.name);
        return conn;
    } catch (error) {
        console.error('❌ MongoDB Connection Error:', error.message);
        console.log('⚠️ Running in Offline Mode (Database not connected)');
        console.log('💡 To fix: Install MongoDB locally or use MongoDB Atlas');
    }
};

export default connectDB;