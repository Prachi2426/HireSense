const express = require('express');
const { analyzeResume, getHistory, downloadResume, deleteResume, getComparisonStats, setDefaultResume } = require('../controllers/resumeController');
const { protect, recruiterOnly, studentOnly } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const router = express.Router();

router.post('/analyze', protect, studentOnly, upload.single('resume'), analyzeResume);
router.get('/history', protect, studentOnly, getHistory);
router.get('/compare', protect, studentOnly, getComparisonStats);
router.put('/:id/default', protect, studentOnly, setDefaultResume);
router.get('/:id/download', protect, downloadResume);  // recruiters need this
router.delete('/:id', protect, studentOnly, deleteResume);

module.exports = router;
