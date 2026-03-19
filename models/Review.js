const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
    clientName: { type: String, required: true },
    projectName: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    reviewText: { type: String, required: true },
    status: { type: String, default: 'Pending' }, // 'Pending' or 'Approved'
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Review', ReviewSchema);
