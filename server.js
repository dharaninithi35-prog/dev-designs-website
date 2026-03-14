const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const User = require('./models/User');
const RequestModel = require('./models/Request');

const app = express();
app.use(express.json());
app.use(cors());

// Serve static frontend UI
app.use(express.static('public'));

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
}
app.use('/uploads', express.static('uploads'));

// Replace this with a real MongoDB URI if deploying it
const MOONGO_URI = 'mongodb://127.0.0.1:27017/creative-studio';
mongoose.connect(MOONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('✅ MongoDB connected'))
    .catch(err => console.log('❌ MongoDB Connection Error:', err));

// File Upload Configuration
const storage = multer.diskStorage({
    destination: './uploads/',
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage });

// --- AUTHENTICATION ROUTES --- //

// Register User
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const exists = await User.findOne({ email });
        if (exists) return res.status(400).json({ error: 'Email already registered' });
        
        const user = new User({ name, email, password, role: 'user' });
        await user.save();
        res.json({ message: 'User registered successfully!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Login User / Admin
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password, isAdminLogin } = req.body;
        const user = await User.findOne({ email });
        
        if (!user || user.password !== password) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        if (isAdminLogin && user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied. You are not an admin.' });
        }

        res.json({ message: 'Login successful', user: { id: user._id, name: user.name, role: user.role } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- PROJECT REQUEST ROUTES --- //

// Submit a new project request (With file upload)
app.post('/api/projects', upload.single('projectFile'), async (req, res) => {
    try {
        const { userId, name, email, phone, serviceType, description, deadline } = req.body;
        const fileUrl = req.file ? `/uploads/${req.file.filename}` : '';

        const newRequest = new RequestModel({
            user: userId, name, email, phone, serviceType, description, deadline, fileUrl
        });

        await newRequest.save();
        res.json({ message: 'Project request submitted successfully!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get projects for User or Admin
app.get('/api/projects', async (req, res) => {
    try {
        const { userId, role } = req.query;
        let projects;
        
        if (role === 'admin') projects = await RequestModel.find().sort({ createdAt: -1 });
        else projects = await RequestModel.find({ user: userId }).sort({ createdAt: -1 });
        
        res.json(projects);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin update project status & upload completed file
app.put('/api/projects/:id', upload.single('completedFile'), async (req, res) => {
    try {
        const { status } = req.body;
        const updateData = { status };
        
        if (req.file) {
            updateData.completedFileUrl = `/uploads/${req.file.filename}`;
        }
        
        const updatedRequest = await RequestModel.findByIdAndUpdate(req.params.id, updateData, { new: true });
        res.json({ message: 'Project updated', request: updatedRequest });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
