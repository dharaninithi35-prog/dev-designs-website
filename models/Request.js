const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: String,
    email: String,
    phone: String,
    serviceType: { type: String, enum: ['Graphic Design', 'Video Editing', 'Photo Editing', 'Brand Identity', '3D Modeling', 'Writing', 'Other'] },
    description: String,
    deadline: Date,
    fileUrl: String, 
    status: { type: String, enum: ['Pending', 'In Progress', 'Completed'], default: 'Pending' },
    completedFileUrl: String, // uploaded by admin once done
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Request', requestSchema);
