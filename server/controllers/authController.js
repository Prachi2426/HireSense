const User = require('../models/User');
const dbFallback = require('../utils/dbFallback');
const jwt = require('jsonwebtoken');

const generateToken = (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET || 'supersecretresumeiqtoken123', { expiresIn: '30d' });
};

const registerUser = async (req, res) => {
    const { name, email, password, role = 'student' } = req.body;
    try {
        const isFallback = !dbFallback.isConnected();
        if (isFallback) {
            console.log('MongoDB not connected or using default URI. Falling back to local JSON database.');
            const userExists = await dbFallback.findUserByEmail(email);
            if (userExists) return res.status(400).json({ message: 'User already exists' });

            const user = await dbFallback.createUser({ name, email, password, role });
            return res.status(201).json({ _id: user._id, name: user.name, email: user.email, role: user.role, token: generateToken(user._id, user.role) });
        }

        const userExists = await User.findOne({ email });
        if (userExists) return res.status(400).json({ message: 'User already exists' });

        const user = await User.create({ name, email, password, role });
        if (user) {
            res.status(201).json({ _id: user._id, name: user.name, email: user.email, role: user.role, github_username: user.github_username, token: generateToken(user._id, user.role) });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const loginUser = async (req, res) => {
    const { email, password } = req.body;
    try {
        const isFallback = !dbFallback.isConnected();
        if (isFallback) {
            console.log('MongoDB not connected or using default URI. Falling back to local JSON database.');
            const user = await dbFallback.findUserByEmail(email);
            if (user && (await dbFallback.matchPassword(password, user.password))) {
                return res.json({ _id: user._id, name: user.name, email: user.email, role: user.role, token: generateToken(user._id, user.role) });
            } else {
                return res.status(401).json({ message: 'Invalid email or password' });
            }
        }

        const user = await User.findOne({ email });
        if (user && (await user.matchPassword(password))) {
            res.json({ _id: user._id, name: user.name, email: user.email, role: user.role, github_username: user.github_username, token: generateToken(user._id, user.role) });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateProfile = async (req, res) => {
    try {
        const { name, email, github_username } = req.body;
        const isFallback = !dbFallback.isConnected();

        if (isFallback) {
            try {
                const updatedUser = await dbFallback.updateUserProfile(req.user.id, { name, email, github_username });
                if (!updatedUser) return res.status(404).json({ message: 'User not found' });
                return res.json({ _id: updatedUser._id, name: updatedUser.name, email: updatedUser.email, role: updatedUser.role, github_username: updatedUser.github_username });
            } catch (err) {
                return res.status(400).json({ message: err.message });
            }
        }

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (email && email !== user.email) {
            const existingUser = await User.findOne({ email });
            if (existingUser) return res.status(400).json({ message: 'Email already in use' });
            user.email = email;
        }

        if (name) user.name = name;
        if (github_username !== undefined) user.github_username = github_username;

        const updatedUser = await user.save();
        res.json({ _id: updatedUser._id, name: updatedUser.name, email: updatedUser.email, role: updatedUser.role, github_username: updatedUser.github_username });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updatePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const isFallback = !dbFallback.isConnected();

        if (isFallback) {
            const user = await dbFallback.findUserById(req.user.id);
            if (!user) return res.status(404).json({ message: 'User not found' });
            
            const isMatch = await dbFallback.matchPassword(currentPassword, user.password);
            if (!isMatch) return res.status(400).json({ message: 'Incorrect current password' });
            
            await dbFallback.updateUserPassword(req.user.id, newPassword);
            return res.json({ message: 'Password updated successfully' });
        }

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const isMatch = await user.matchPassword(currentPassword);
        if (!isMatch) return res.status(400).json({ message: 'Incorrect current password' });

        user.password = newPassword;
        await user.save();
        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const forgotPassword = async (req, res) => {
    // Mock forgot password flow for local testing
    try {
        const { email, pin, newPassword } = req.body;
        
        // Hardcoded master pin for demo/local environment
        if (pin !== '0000') {
            return res.status(400).json({ message: 'Invalid verification PIN' });
        }

        const isFallback = !dbFallback.isConnected();
        if (isFallback) {
            const user = await dbFallback.findUserByEmail(email);
            if (!user) return res.status(404).json({ message: 'User not found' });
            
            await dbFallback.updateUserPassword(user._id, newPassword);
            return res.json({ message: 'Password reset successfully' });
        }

        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.password = newPassword;
        await user.save();
        res.json({ message: 'Password reset successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { registerUser, loginUser, updateProfile, updatePassword, forgotPassword };
