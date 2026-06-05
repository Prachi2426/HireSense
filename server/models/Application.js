const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
    job_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['Applied', 'Viewed', 'Shortlisted', 'Rejected', 'Saved'], default: 'Applied' }
}, { timestamps: true });

module.exports = mongoose.model('Application', applicationSchema);
