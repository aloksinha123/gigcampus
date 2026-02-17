import mongoose from 'mongoose';

// Disable buffering to fail fast if DB is not connected
mongoose.set('bufferCommands', false);
mongoose.set('bufferTimeoutMS', 3000);

const connectDB = async () => {
    try {
        console.log('Attempting to connect to MongoDB...');
        console.log('URI:', process.env.MONGODB_URI);
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
        });
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
        console.log('Database Name:', conn.connection.name);
    } catch (error) {
        console.error('❌ MongoDB Connection Error:', error.message);
        console.log('⚠️  Running in Offline Mode (Database not connected)');
        console.log('💡 To fix: Install MongoDB locally or use MongoDB Atlas');
        // process.exit(1); // Do not exit, allow server to run
    }
};

export default connectDB;