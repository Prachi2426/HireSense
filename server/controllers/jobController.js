const Job = require('../models/Job');
const Application = require('../models/Application');
const Resume = require('../models/Resume');
const dbFallback = require('../utils/dbFallback');

const computeRankScore = (ats_score = 0, match_percentage = 0, cgpa = 0) => {
    const cgpaScore = Math.min(Math.max(cgpa, 0), 10) * 10;
    return Math.round(ats_score * 0.5 + match_percentage * 0.3 + cgpaScore * 0.2);
};

const listJobs = async (req, res) => {
    try {
        const { role, keyword, location, postedBy } = req.query;
        const isFallback = !dbFallback.isConnected();
        if (isFallback) {
            const jobs = await dbFallback.findJobs({ role, keyword, location, postedBy: postedBy === 'mine' ? req.user?.id : undefined });
            return res.json(jobs);
        }
        const filter = {};
        if (role) filter.title = new RegExp(role, 'i');
        if (keyword) filter.description = new RegExp(keyword, 'i');
        if (location) filter.location = new RegExp(location, 'i');
        if (postedBy === 'mine' && req.user?.id) filter.postedBy = req.user.id;
        const jobs = await Job.find(filter).sort({ createdAt: -1 });
        res.json(jobs);
    } catch (error) {
        res.status(500).json({ message: 'Error listing jobs' });
    }
};

const getRecruiterJobs = async (req, res) => {
    try {
        const recruiterId = req.user?.id;
        const isFallback = !dbFallback.isConnected();
        if (isFallback) {
            const jobs = await dbFallback.findJobs({ postedBy: recruiterId });
            return res.json(jobs);
        }
        const jobs = await Job.find({ postedBy: recruiterId }).sort({ createdAt: -1 });
        res.json(jobs);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching recruiter jobs' });
    }
};

const getRecruiterApplications = async (req, res) => {
    try {
        const recruiterId = req.user?.id;
        const { skills, atsMin, cgpaMin, college, gradYear } = req.query;
        const skillFilters = skills
            ? skills.split(',').map((skill) => skill.trim().toLowerCase()).filter(Boolean)
            : [];
        const isFallback = !dbFallback.isConnected();
        if (isFallback) {
            const applications = await dbFallback.findApplicationsByRecruiterId(recruiterId);
            const ranked = await Promise.all(applications.map(async (app) => {
                const latestResume = await dbFallback.findLatestResumeByUserId(app.user_id);
                const ats_score = latestResume?.ats_score || 0;
                const match_percentage = latestResume?.match_percentage || 0;
                const cgpa = latestResume?.cgpa || 0;
                const rank_score = computeRankScore(ats_score, match_percentage, cgpa);
                const user = await dbFallback.findUserById(app.user_id);
                return {
                    ...app,
                    user_id: user ? { _id: user._id, name: user.name, email: user.email } : { _id: app.user_id, name: 'Unknown' },
                    ats_score,
                    match_percentage,
                    cgpa,
                    rank_score,
                    college: latestResume?.college || null,
                    graduation_year: latestResume?.graduation_year || null,
                    latestResumeId: latestResume?._id || null,
                    resume_text: latestResume?.resume_text || '',
                    skills_found: latestResume?.skills_found || [],
                    best_fit_role: latestResume?.best_fit_role || null
                };
            }));

            const filtered = ranked.filter((app) => {
                if (atsMin && app.ats_score < Number(atsMin)) return false;
                if (cgpaMin && app.cgpa < Number(cgpaMin)) return false;
                if (college && !app.college?.toLowerCase().includes(college.toLowerCase())) return false;
                if (gradYear && app.graduation_year !== Number(gradYear)) return false;
                if (skillFilters.length > 0) {
                    const resumeText = (app.resume_text || '').toLowerCase();
                    return skillFilters.every((skill) =>
                        (app.skills_found || []).map((s) => s.toLowerCase()).includes(skill) || resumeText.includes(skill)
                    );
                }
                return true;
            });

            filtered.sort((a, b) => b.rank_score - a.rank_score);
            return res.json(filtered);
        }

        const jobs = await Job.find({ postedBy: recruiterId }).select('_id');
        const jobIds = jobs.map((job) => job._id);
        const applications = await Application.find({ job_id: { $in: jobIds } })
            .populate('job_id')
            .populate('user_id', 'name email');

        const appsWithRank = await Promise.all(applications.map(async (app) => {
            const latestResume = await Resume.findOne({ user_id: app.user_id._id }).sort({ createdAt: -1 });
            const ats_score = latestResume?.ats_score || 0;
            const match_percentage = latestResume?.match_percentage || 0;
            const cgpa = latestResume?.cgpa || 0;
            const rank_score = computeRankScore(ats_score, match_percentage, cgpa);
            return {
                ...app.toObject(),
                ats_score,
                match_percentage,
                cgpa,
                rank_score,
                college: latestResume?.college || null,
                graduation_year: latestResume?.graduation_year || null,
                latestResumeId: latestResume?._id || null,
                resume_text: latestResume?.resume_text || '',
                skills_found: latestResume?.skills_found || [],
                best_fit_role: latestResume?.best_fit_role || null
            };
        }));

        const filtered = appsWithRank.filter((app) => {
            if (atsMin && app.ats_score < Number(atsMin)) return false;
            if (cgpaMin && app.cgpa < Number(cgpaMin)) return false;
            if (college && !app.college?.toLowerCase().includes(college.toLowerCase())) return false;
            if (gradYear && app.graduation_year !== Number(gradYear)) return false;
            if (skillFilters.length > 0) {
                const resumeText = (app.resume_text || '').toLowerCase();
                return skillFilters.every((skill) =>
                    (app.skills_found || []).map((s) => s.toLowerCase()).includes(skill) || resumeText.includes(skill)
                );
            }
            return true;
        });

        filtered.sort((a, b) => b.rank_score - a.rank_score);
        res.json(filtered);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching recruiter applications' });
    }
};

const createJob = async (req, res) => {
    try {
        const { title, company, location, description, requirements } = req.body;
        const isFallback = !dbFallback.isConnected();
        if (isFallback) {
            const job = await dbFallback.createJob({ title, company, location, description, requirements, postedBy: req.user?.id });
            return res.status(201).json(job);
        }
        const job = await Job.create({ title, company, location, description, requirements, postedBy: req.user?.id });
        res.status(201).json(job);
    } catch (error) {
        res.status(500).json({ message: 'Error creating job' });
    }
};

const applyToJob = async (req, res) => {
    try {
        const jobId = req.params.id;
        const userId = req.user.id;
        const isFallback = !dbFallback.isConnected();
        if (isFallback) {
            const apps = await dbFallback.findApplicationsByUserId(userId);
            let app = apps.find(a => a.job_id === jobId);
            if (app) {
                if (app.status !== 'Saved') {
                    return res.status(400).json({ message: 'Already applied to this job' });
                }
                app = await dbFallback.updateApplicationStatus(app._id, 'Applied');
                return res.status(200).json(app);
            }
            app = await dbFallback.createApplication({ job_id: jobId, user_id: userId, status: 'Applied' });
            return res.status(201).json(app);
        }
        
        let app = await Application.findOne({ job_id: jobId, user_id: userId });
        if (app) {
            if (app.status !== 'Saved') {
                return res.status(400).json({ message: 'Already applied to this job' });
            }
            app.status = 'Applied';
            await app.save();
            return res.status(200).json(app);
        }
        
        app = await Application.create({ job_id: jobId, user_id: userId, status: 'Applied' });
        res.status(201).json(app);
    } catch (error) {
        res.status(500).json({ message: 'Error applying to job' });
    }
};

const saveJob = async (req, res) => {
    try {
        const jobId = req.params.id;
        const userId = req.user.id;
        const isFallback = !dbFallback.isConnected();
        if (isFallback) {
            // Save as an application with status 'Saved'
            const app = await dbFallback.createApplication({ job_id: jobId, user_id: userId, status: 'Saved' });
            return res.status(201).json(app);
        }
        const app = await Application.create({ job_id: jobId, user_id: userId, status: 'Saved' });
        res.status(201).json(app);
    } catch (error) {
        res.status(500).json({ message: 'Error saving job' });
    }
};

const getUserApplications = async (req, res) => {
    try {
        const userId = req.user.id;
        const isFallback = !dbFallback.isConnected();
        if (isFallback) {
            const apps = await dbFallback.findApplicationsByUserId(userId);
            return res.json(apps);
        }
        const apps = await Application.find({ user_id: userId }).populate('job_id').sort({ createdAt: -1 });
        res.json(apps);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching applications' });
    }
};

const updateApplication = async (req, res) => {
    try {
        const { appId } = req.params;
        const { status } = req.body;
        const isFallback = !dbFallback.isConnected();
        if (isFallback) {
            const updated = await dbFallback.updateApplicationStatus(appId, status);
            return res.json(updated);
        }
        const app = await Application.findById(appId);
        if (!app) return res.status(404).json({ message: 'Application not found' });
        app.status = status;
        await app.save();
        res.json(app);
    } catch (error) {
        res.status(500).json({ message: 'Error updating application' });
    }
};

const undoApply = async (req, res) => {
    try {
        const jobId = req.params.id;
        const userId = req.user.id;
        const isFallback = !dbFallback.isConnected();
        
        if (isFallback) {
            const success = await dbFallback.deleteApplication(jobId, userId);
            if (!success) {
                return res.status(404).json({ message: 'Application not found' });
            }
            return res.json({ message: 'Application undone successfully' });
        }

        const result = await Application.findOneAndDelete({ job_id: jobId, user_id: userId });
        if (!result) {
            return res.status(404).json({ message: 'Application not found' });
        }
        res.json({ message: 'Application undone successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error undoing application' });
    }
};

const updateJob = async (req, res) => {
    try {
        const jobId = req.params.id;
        const recruiterId = req.user.id;
        const { title, company, location, description, requirements } = req.body;
        const isFallback = !dbFallback.isConnected();

        if (isFallback) {
            const jobs = await dbFallback.findJobs({ postedBy: recruiterId });
            const targetJob = jobs.find(j => j._id === jobId);
            if (!targetJob) return res.status(404).json({ message: 'Job not found or unauthorized' });

            const updatedJob = await dbFallback.updateJob(jobId, { title, company, location, description, requirements });
            return res.json(updatedJob);
        }

        const job = await Job.findOne({ _id: jobId, postedBy: recruiterId });
        if (!job) return res.status(404).json({ message: 'Job not found or unauthorized' });

        job.title = title || job.title;
        job.company = company || job.company;
        job.location = location || job.location;
        job.description = description || job.description;
        job.requirements = requirements || job.requirements;

        await job.save();
        res.json(job);
    } catch (error) {
        res.status(500).json({ message: 'Error updating job' });
    }
};

const deleteJob = async (req, res) => {
    try {
        const jobId = req.params.id;
        const recruiterId = req.user.id;
        const isFallback = !dbFallback.isConnected();

        if (isFallback) {
            const jobs = await dbFallback.findJobs({ postedBy: recruiterId });
            const targetJob = jobs.find(j => j._id === jobId);
            if (!targetJob) return res.status(404).json({ message: 'Job not found or unauthorized' });

            await dbFallback.deleteJob(jobId);
            return res.json({ message: 'Job deleted successfully' });
        }

        const job = await Job.findOneAndDelete({ _id: jobId, postedBy: recruiterId });
        if (!job) return res.status(404).json({ message: 'Job not found or unauthorized' });

        // Delete associated applications
        await Application.deleteMany({ job_id: jobId });

        res.json({ message: 'Job deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting job' });
    }
};

module.exports = { listJobs, createJob, applyToJob, saveJob, undoApply, getUserApplications, getRecruiterJobs, getRecruiterApplications, updateApplication, updateJob, deleteJob };
