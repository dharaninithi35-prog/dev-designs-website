const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const nodemailer = require('nodemailer');
require('dotenv').config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key';

// Middleware
// Enable CORS so the frontend can connect to the backend
app.use(cors());

// Parse incoming request bodies in a middleware before your handlers
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Setup static folder for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configure Multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// Email Transporter Setup
// Note: In production, use environment variables for user and pass
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});


// MongoDB Connection
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/devdesigns';

mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ Successfully connected to MongoDB database'))
    .catch((err) => console.error('❌ MongoDB Connection Error:', err));

// Mongoose Models Setup
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' }
});
const User = mongoose.model('User', userSchema);

const adminSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'admin' }
});
const Admin = mongoose.model('Admin', adminSchema);

const projectSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: String,
    email: String,
    phone: String,
    serviceType: String,
    description: String,
    deadline: Date,
    fileUrl: String,
    status: { type: String, default: 'Pending' },
    createdAt: { type: Date, default: Date.now }
});
const Project = mongoose.model('Project', projectSchema);

const reviewSchema = new mongoose.Schema({
    clientName: String,
    projectName: String,
    rating: Number,
    reviewText: String,
    status: { type: String, default: 'Pending' },
    createdAt: { type: Date, default: Date.now }
});
const Review = mongoose.model('Review', reviewSchema);

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Auth APIs (Signup & Login)

// Signup Route
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: "Email already exists" });
        }

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Save new user
        const newUser = new User({
            name,
            email,
            password: hashedPassword
        });
        await newUser.save();

        res.status(201).json({ message: "User registered successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server Error during registration" });
    }
});

// Login Route
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password, isAdminLogin } = req.body;

        // Find the user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ error: "Invalid Credentials" });
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: "Invalid Credentials" });
        }

        // Check for admin login constraint if required by frontend
        if (isAdminLogin && user.role !== 'admin') {
            return res.status(403).json({ error: "Access Denied. You are not an Admin." });
        }

        // Create JWT Payload
        const payload = {
            id: user._id,
            name: user.name,
            role: user.role
        };

        // Sign token
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });

        res.json({
            token,
            user: { id: user._id, name: user.name, role: user.role }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server Error during login" });
    }
});

// Admin Login Route
app.post('/api/auth/admin-login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const admin = await Admin.findOne({ email });
        if (!admin) {
            return res.status(400).json({ error: "Invalid Admin Credentials" });
        }

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(400).json({ error: "Invalid Admin Credentials" });
        }

        const payload = {
            id: admin._id,
            name: admin.name,
            role: admin.role
        };

        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });

        res.json({
            token,
            admin: { id: admin._id, name: admin.name, role: admin.role }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server Error during admin login" });
    }
});

// Authentication Middleware
const authMiddleware = (req, res, next) => {
    const token = req.header('Authorization');
    if (!token) return res.status(401).json({ error: "Access Denied, no token provided" });

    try {
        const verified = jwt.verify(token.replace("Bearer ", ""), JWT_SECRET);
        req.user = verified;
        next();
    } catch (err) {
        res.status(400).json({ error: "Invalid Token" });
    }
};

const adminMiddleware = (req, res, next) => {
    authMiddleware(req, res, () => {
        if (req.user && req.user.role === 'admin') {
            next();
        } else {
            return res.status(403).json({ error: "Access Denied. Admins only." });
        }
    });
};

// Admin Dashboard Routes
// Only admin can view all client projects
app.get('/api/admin/projects', adminMiddleware, async (req, res) => {
    try {
        const projects = await Project.find().sort({ createdAt: -1 });
        res.json(projects);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch projects" });
    }
});

// Update project status
app.put('/api/admin/projects/:id', adminMiddleware, async (req, res) => {
    try {
        const { status } = req.body;
        // Validate status
        if (!['Pending', 'In Progress', 'Completed'].includes(status)) {
            return res.status(400).json({ error: "Invalid status value" });
        }

        const project = await Project.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );

        if (!project) return res.status(404).json({ error: "Project not found" });

        res.json({ message: "Project status updated successfully", project });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to update project status" });
    }
});

// Delete project
app.delete('/api/admin/projects/:id', adminMiddleware, async (req, res) => {
    try {
        const project = await Project.findByIdAndDelete(req.params.id);
        if (!project) return res.status(404).json({ error: "Project not found" });

        res.json({ message: "Project deleted successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to delete project" });
    }
});

// Setup a basic route for testing
// Project Request Submission API
app.post('/api/projects', upload.single('file'), async (req, res) => {
    try {
        const { name, email, phone, serviceType, description } = req.body;
        
        let fileUrl = '';
        if (req.file) {
            fileUrl = `/uploads/${req.file.filename}`;
        }

        const newProject = new Project({
            name,
            email,
            phone,
            serviceType,
            description,
            fileUrl,
            status: 'Pending' // default as per requirement
        });

        await newProject.save();

        // Send Confirmation Email
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email, // Project request email
            subject: 'Project Request Received – Dev Designs',
            text: `Thank you for contacting Dev Designs. Your project request has been received successfully. Our team will review the details and contact you soon.`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log('Error sending email:', error);
            } else {
                console.log('Email sent: ' + info.response);
            }
        });

        res.status(201).json({ message: "Project submitted successfully!", project: newProject });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to submit project request." });
    }
});

// Reviews APIs
// Public: Submit a Review
app.post('/api/reviews', async (req, res) => {
    try {
        const { clientName, projectName, rating, reviewText } = req.body;
        
        // Validate rating
        if (rating < 1 || rating > 5) {
            return res.status(400).json({ error: "Rating must be between 1 and 5" });
        }

        const newReview = new Review({
            clientName,
            projectName,
            rating,
            reviewText,
            status: 'Pending' // Requires admin approval
        });

        await newReview.save();
        res.status(201).json({ message: "Review submitted successfully! Pending admin approval.", review: newReview });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to submit review." });
    }
});

// Public: Get Approved Reviews
app.get('/api/reviews', async (req, res) => {
    try {
        const approvedReviews = await Review.find({ status: 'Approved' }).sort({ createdAt: -1 });
        res.json(approvedReviews);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch reviews." });
    }
});

// Admin: Get all reviews (Pending & Approved)
app.get('/api/admin/reviews', adminMiddleware, async (req, res) => {
    try {
        const allReviews = await Review.find().sort({ createdAt: -1 });
        res.json(allReviews);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch reviews." });
    }
});

// Admin: Update review status (Approve/Reject)
app.put('/api/admin/reviews/:id', adminMiddleware, async (req, res) => {
    try {
        const { status } = req.body;
        if (!['Pending', 'Approved', 'Rejected'].includes(status)) {
            return res.status(400).json({ error: "Invalid status value" });
        }

        const review = await Review.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );

        if (!review) return res.status(404).json({ error: "Review not found" });

        res.json({ message: `Review status updated to ${status}`, review });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to update review status" });
    }
});

// Admin: Delete review
app.delete('/api/admin/reviews/:id', adminMiddleware, async (req, res) => {
    try {
        const review = await Review.findByIdAndDelete(req.params.id);
        if (!review) return res.status(404).json({ error: "Review not found" });

        res.json({ message: "Review deleted successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to delete review" });
    }
});

// Setup a basic route for testing
app.get('/', (req, res) => {
    res.json({ message: "Welcome to the Dev Designs Backend API!" });
});

app.get('/api/test', (req, res) => {
    res.json({ 
        status: "success", 
        message: "Backend is successfully connected to the frontend." 
    });
});

// Run the server on port 5000
app.listen(PORT, () => {
    console.log(`Server is successfully running on http://localhost:${PORT}`);
});
