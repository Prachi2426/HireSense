const mongoose = require('mongoose');

const resumeSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    file_path: { type: String, required: true },
    resume_text: { type: String },
    job_description: { type: String, required: true },
    role: { type: String, required: true },
    cgpa: { type: Number, required: true },
    ats_score: { type: Number, required: true },
    match_percentage: { type: Number, required: true },
    skills_found: [{ type: String }],
    missing_skills: [{ type: String }],
    college: { type: String },
    graduation_year: { type: Number },
    file_name: { type: String },
    section_scores: {
        Skills: { type: Number, default: 0 },
        Experience: { type: Number, default: 0 },
        Education: { type: Number, default: 0 },
        Projects: { type: Number, default: 0 }
    },
    strength_level: { type: String, enum: ['Weak', 'Average', 'Strong'], required: true },
    suggestions: [{ type: String }],
    interview_questions: [{ type: String }],
    // New Phase 2 Fields
    role_matches: [{
        role: { type: String },
        score: { type: Number },
        skills_found: [{ type: String }],
        missing_skills: [{ type: String }]
    }],
    best_fit_role: { type: String },
    is_default: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Resume', resumeSchema);
