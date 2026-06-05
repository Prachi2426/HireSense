const express = require('express');
const { listJobs, createJob, applyToJob, saveJob, undoApply, getUserApplications, getRecruiterJobs, getRecruiterApplications, updateApplication, updateJob, deleteJob } = require('../controllers/jobController');
const { protect, recruiterOnly, studentOnly } = require('../middleware/authMiddleware');
const router = express.Router();

// Public: list jobs with optional filters
router.get('/', listJobs);

// Protected: create job (recruiter only)
router.post('/', protect, recruiterOnly, createJob);

// Protected: recruiter-specific job list
router.get('/recruiter', protect, recruiterOnly, getRecruiterJobs);

// Protected: apply or save job (students only)
router.post('/:id/apply', protect, studentOnly, applyToJob);
router.post('/:id/save', protect, studentOnly, saveJob);
router.delete('/:id/apply/undo', protect, studentOnly, undoApply);

// Protected: get user's applications (students only)
router.get('/applications/my', protect, studentOnly, getUserApplications);

// Protected: get recruiter applications
router.get('/applications/recruiter', protect, recruiterOnly, getRecruiterApplications);

// Protected: update application status (recruiter only)
router.patch('/applications/:appId', protect, recruiterOnly, updateApplication);

// Protected: update and delete job (recruiter only)
router.put('/:id', protect, recruiterOnly, updateJob);
router.delete('/:id', protect, recruiterOnly, deleteJob);

module.exports = router;
