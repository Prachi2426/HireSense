const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
    let token;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretresumeiqtoken123');
            req.user = decoded;
            return next();
        } catch (error) {
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }
};

const recruiterOnly = (req, res, next) => {
    if (!req.user || req.user.role !== 'recruiter') {
        return res.status(403).json({ message: 'Access denied. Recruiter role required.' });
    }
    next();
};

const studentOnly = (req, res, next) => {
    if (!req.user || req.user.role === 'recruiter') {
        return res.status(403).json({ message: 'Access denied. This action is for candidates only.' });
    }
    next();
};

module.exports = { protect, recruiterOnly, studentOnly };
