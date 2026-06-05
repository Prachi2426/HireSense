const express = require('express');
const { connectGithub, getGithubProfile } = require('../controllers/githubController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

router.post('/connect', protect, connectGithub);
router.get('/profile', protect, getGithubProfile);

module.exports = router;
