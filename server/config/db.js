const mongoose = require('mongoose');

const connectDB = async () => {
    const uri = process.env.MONGO_URI;
    const isValidUri = uri && !uri.includes('<username>') && !uri.includes('<password>') && !uri.includes('cluster.mongodb.net');

    if (!isValidUri) {
        console.log('No valid MONGO_URI found. Using fallback local JSON database.');
        return;
    }

    try {
        const conn = await mongoose.connect(uri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`MongoDB Connection Error: ${error.message}`);
        console.log('Ensure you have inserted a valid MONGO_URI in your .env file.');
    }
};

module.exports = connectDB;
