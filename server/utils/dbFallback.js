const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const dbPath = path.join(__dirname, '../db.json');

const isConnected = () => {
    const uri = process.env.MONGO_URI || '';
    if (uri.includes('<username>') || uri.includes('<password>')) {
        return false;
    }
    return mongoose.connection.readyState === 1;
};

const readData = () => {
    try {
        if (!fs.existsSync(dbPath)) {
            fs.writeFileSync(dbPath, JSON.stringify({ users: [], resumes: [], jobs: [], applications: [] }, null, 2));
        }
        const data = fs.readFileSync(dbPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading local db.json', error);
        return { users: [], resumes: [], jobs: [], applications: [] };
    }
};

const writeData = (data) => {
    try {
        fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error writing local db.json', error);
    }
};

const findUserByEmail = async (email) => {
    const db = readData();
    return db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
};

const createUser = async ({ name, email, password, role = 'student', github_username = '' }) => {
    const db = readData();
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const newUser = {
        _id: 'local_u_' + Math.random().toString(36).substr(2, 9),
        name,
        email,
        password: hashedPassword,
        role,
        github_username,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    db.users.push(newUser);
    writeData(db);
    return newUser;
};

const matchPassword = async (enteredPassword, hashedPassword) => {
    return await bcrypt.compare(enteredPassword, hashedPassword);
};

const updateUserProfile = async (userId, data) => {
    const db = readData();
    const user = db.users.find(u => u._id === userId);
    if (!user) return null;

    if (data.email && data.email !== user.email) {
        const existingEmail = db.users.find(u => u.email.toLowerCase() === data.email.toLowerCase());
        if (existingEmail) {
            throw new Error('Email already exists');
        }
        user.email = data.email;
    }

    if (data.name) user.name = data.name;
    if (data.github_username !== undefined) user.github_username = data.github_username;
    
    user.updatedAt = new Date().toISOString();
    writeData(db);
    return user;
};

const updateUserPassword = async (userId, newPassword) => {
    const db = readData();
    const user = db.users.find(u => u._id === userId);
    if (user) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        user.updatedAt = new Date().toISOString();
        writeData(db);
    }
    return user;
};

const createResume = async (resumeData) => {
    const db = readData();
    const newResume = {
        _id: 'local_r_' + Math.random().toString(36).substr(2, 9),
        ...resumeData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    db.resumes.push(newResume);
    writeData(db);
    return newResume;
};

const findResumesByUserId = async (userId) => {
    const db = readData();
    return db.resumes
        .filter(r => r.user_id === userId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

const findLatestResumeByUserId = async (userId) => {
    const resumes = await findResumesByUserId(userId);
    return resumes.length > 0 ? resumes[0] : null;
};

const findResumeById = async (resumeId) => {
    const db = readData();
    return db.resumes.find(r => r._id === resumeId);
};

const findUserById = async (userId) => {
    const db = readData();
    return db.users.find(u => u._id === userId);
};

// Jobs & Applications fallback
const createJob = async (job) => {
    const db = readData();
    const newJob = {
        _id: 'local_j_' + Math.random().toString(36).substr(2, 9),
        ...job,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    db.jobs.push(newJob);
    writeData(db);
    return newJob;
};

const findJobs = async (filter = {}) => {
    const db = readData();
    let results = db.jobs;
    if (filter.role) results = results.filter(j => j.title && j.title.toLowerCase().includes(filter.role.toLowerCase()));
    if (filter.keyword) results = results.filter(j => (j.description || '').toLowerCase().includes(filter.keyword.toLowerCase()));
    if (filter.location) results = results.filter(j => j.location && j.location.toLowerCase().includes(filter.location.toLowerCase()));
    if (filter.postedBy) results = results.filter(j => j.postedBy === filter.postedBy);
    return results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

const createApplication = async ({ job_id, user_id, status = 'Applied' }) => {
    const db = readData();
    const newApp = {
        _id: 'local_a_' + Math.random().toString(36).substr(2, 9),
        job_id,
        user_id,
        status,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    db.applications.push(newApp);
    writeData(db);
    return newApp;
};

const findApplicationsByUserId = async (userId) => {
    const db = readData();
    return db.applications.filter(a => a.user_id === userId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

const findApplicationsByRecruiterId = async (recruiterId) => {
    const db = readData();
    const recruiterJobIds = db.jobs.filter(j => j.postedBy === recruiterId).map(j => j._id);
    return db.applications
        .filter(a => recruiterJobIds.includes(a.job_id))
        .map(app => {
            const job = db.jobs.find(j => j._id === app.job_id);
            return {
                ...app,
                job_id: job ? { _id: job._id, title: job.title, company: job.company, location: job.location } : { _id: app.job_id, title: 'Unknown Job' }
            };
        })
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

const updateApplicationStatus = async (applicationId, status) => {
    const db = readData();
    const app = db.applications.find(a => a._id === applicationId);
    if (app) {
        app.status = status;
        app.updatedAt = new Date().toISOString();
        writeData(db);
    }
    return app;
};

const updateUserGithub = async (userId, github_username) => {
    const db = readData();
    const user = db.users.find(u => u._id === userId);
    if (user) {
        user.github_username = github_username;
        user.updatedAt = new Date().toISOString();
        writeData(db);
    }
    return user;
};

const deleteResume = async (resumeId) => {
    const db = readData();
    const resumeIndex = db.resumes.findIndex(r => r._id === resumeId);
    if (resumeIndex !== -1) {
        db.resumes.splice(resumeIndex, 1);
        writeData(db);
        return true;
    }
    return false;
};

const deleteApplication = async (jobId, userId) => {
    const db = readData();
    const appIndex = db.applications.findIndex(a => a.job_id === jobId && a.user_id === userId);
    if (appIndex !== -1) {
        db.applications.splice(appIndex, 1);
        writeData(db);
        return true;
    }
    return false;
};

const findAllResumes = async () => {
    const db = readData();
    return db.resumes;
};

const setDefaultResume = async (userId, resumeId) => {
    const db = readData();
    const resume = db.resumes.find(r => r._id === resumeId && r.user_id === userId);
    if (!resume) return null;

    const wasDefault = resume.is_default;
    db.resumes = db.resumes.map(r => {
        if (r.user_id === userId) {
            if (r._id === resumeId) {
                r.is_default = !wasDefault;
            } else {
                r.is_default = false;
            }
        }
        return r;
    });
    writeData(db);
    return db.resumes.find(r => r._id === resumeId);
};

const updateJob = async (jobId, jobData) => {
    const db = readData();
    const jobIndex = db.jobs.findIndex(j => j._id === jobId);
    if (jobIndex === -1) return null;
    db.jobs[jobIndex] = {
        ...db.jobs[jobIndex],
        ...jobData,
        updatedAt: new Date().toISOString()
    };
    writeData(db);
    return db.jobs[jobIndex];
};

const deleteJob = async (jobId) => {
    const db = readData();
    const jobIndex = db.jobs.findIndex(j => j._id === jobId);
    if (jobIndex === -1) return false;
    db.jobs.splice(jobIndex, 1);
    db.applications = db.applications.filter(app => app.job_id !== jobId);
    writeData(db);
    return true;
};

module.exports = {
    isConnected,
    findUserByEmail,
    createUser,
    matchPassword,
    updateUserProfile,
    updateUserPassword,
    createResume,
    findResumesByUserId,
    findAllResumes,
    findLatestResumeByUserId,
    findResumeById,
    findUserById,
    deleteResume,
    setDefaultResume,
    // Jobs fallback
    createJob,
    findJobs,
    updateJob,
    deleteJob,
    createApplication,
    findApplicationsByUserId,
    updateApplicationStatus,
    deleteApplication,
    updateUserGithub
};
