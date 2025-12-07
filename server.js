
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const morgan = require('morgan');


const authRoutes = require('./routes/authRoutes');
const fileRoutes = require('./routes/fileRoutes');

dotenv.config(); 

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "https://file-sharing-frontend-delta.vercel.app",
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));

app.use(express.json());
app.use(morgan('dev'));

const MONGO_URI = process.env.MONGO_URI;

const connectDB = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ MongoDB Connected Successfully.');
    } catch (err) {
        console.error(`❌ MongoDB Connection Error: ${err.message}`);
        process.exit(1); 
    }
};
connectDB();

app.use('/api/auth', authRoutes); 

app.use('/api/files', fileRoutes);

app.get('/', (req, res) => {
    res.send('File Sharing Backend API is Running...');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});