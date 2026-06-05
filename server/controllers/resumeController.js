const path = require('path');
const fs = require('fs');
const Resume = require('../models/Resume');
const Job = require('../models/Job');
const Application = require('../models/Application');
const dbFallback = require('../utils/dbFallback');
const pdfParse = require('pdf-parse');
const writeGood = require('write-good');

const skillDictionary = [
    'javascript', 'python', 'react', 'node', 'sql', 'aws', 'docker', 'agile', 'git', 'css', 'html', 'ci/cd', 
    'typescript', 'java', 'c++', 'machine learning', 'data analysis', 'kubernetes', 'terraform', 'linux', 
    'bash', 'excel', 'tableau', 'power bi', 'statistics', 'pandas', 'deep learning', 'tensorflow', 'pytorch',
    'vue', 'angular', 'ui/ux', 'responsive design', 'ruby', 'c#', 'nosql', 'api', 'redis', 'microservices',
    'azure', 'jenkins', 'ansible', 'scrum', 'jira', 'product strategy', 'roadmap', 'market research',
    'figma', 'sketch', 'adobe xd', 'wireframing', 'prototyping', 'user research'
];

const actionVerbs = [
    'achieved','built','developed','implemented','designed','led','improved','optimized','created','engineered','deployed','launched','managed','reduced','increased','automated','spearheaded','analyzed','maintained','tested','integrated'
];

const roleSkillsMap = {
    'Software Developer': ['javascript', 'react', 'node', 'git', 'html', 'css', 'typescript', 'java', 'c++', 'agile', 'sql'],
    'Cloud Engineer': ['aws', 'docker', 'kubernetes', 'ci/cd', 'terraform', 'linux', 'bash', 'python', 'git', 'sql'],
    'Data Analyst': ['python', 'sql', 'excel', 'tableau', 'power bi', 'statistics', 'pandas', 'git', 'data analysis'],
    'ML Engineer': ['python', 'machine learning', 'deep learning', 'tensorflow', 'pytorch', 'sql', 'git', 'pandas', 'c++'],
    'Frontend Developer': ['html', 'css', 'javascript', 'react', 'vue', 'angular', 'typescript', 'ui/ux', 'responsive design'],
    'Backend Developer': ['node', 'java', 'python', 'ruby', 'c#', 'sql', 'nosql', 'api', 'docker', 'redis', 'microservices'],
    'DevOps Engineer': ['aws', 'azure', 'docker', 'kubernetes', 'ci/cd', 'jenkins', 'terraform', 'ansible', 'linux', 'bash', 'python'],
    'Product Manager': ['agile', 'scrum', 'jira', 'product strategy', 'roadmap', 'market research', 'data analysis', 'ui/ux'],
    'UX/UI Designer': ['figma', 'sketch', 'adobe xd', 'wireframing', 'prototyping', 'user research', 'ui/ux', 'html', 'css']
};

const extractCollege = (text) => {
    const collegePattern = /(university|institute|college|school|campus|academy|polytechnic)/i;
    const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    for (const line of lines) {
        if (collegePattern.test(line) && line.length < 100) {
            return line;
        }
    }
    const shortMatch = text.match(/(?:graduated from|attended|studied at|university of|college of)\s+([A-Za-z0-9 .,&-]{5,80})/i);
    return shortMatch ? shortMatch[1].trim() : null;
};

const extractGraduationYear = (text) => {
    const yearMatch = text.match(/class of\s*(20\d{2})/i) || text.match(/graduated\s*(?:in|:)?\s*(20\d{2})/i) || text.match(/(20\d{2})\b/);
    return yearMatch ? parseInt(yearMatch[1], 10) : null;
};

const escapeRegExp = (value) => {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const generateInterviewQuestions = ({ resumeText, role, skillsFound, missingSkills, projectLines }) => {
    const questions = [];
    const normalizedRole = role || 'the target role';
    const skills = skillsFound.slice(0, 3);

    if (skills.length > 0) {
        skills.forEach((skill, idx) => {
            const phrasing = idx === 0 ? `Explain a project where you used ${skill}. What was your role and impact?` : `How did you apply ${skill} in your resume? Describe the business result.`;
            questions.push(phrasing);
        });
    }

    if (projectLines.length > 0) {
        const projectSnippet = projectLines[0].replace(/^[\u2022\-\*\•\s\t]+/, '').trim();
        questions.push(`Tell me about the project: "${projectSnippet}". What technologies did you choose and why?`);
    }

    questions.push(`Why are you a strong fit for ${normalizedRole} based on your resume experience?`);
    questions.push(`Describe one achievement from your resume that best demonstrates your strengths in ${skills[0] || normalizedRole}.`);

    if (missingSkills.length > 0) {
        const focusMissing = missingSkills.slice(0, 2).join(' and ');
        questions.push(`How would you learn and use ${focusMissing} to strengthen your contributions in a real role?`);
    }

    return Array.from(new Set(questions)).slice(0, 6);
};

const analyzeResume = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

        const { job_description, role, cgpa } = req.body;
        const _cgpa = parseFloat(cgpa);

        // Parse PDF Native
        const dataBuffer = fs.readFileSync(req.file.path);
        const data = await pdfParse(dataBuffer);
        const resumeText = data.text.toLowerCase();
        const college = extractCollege(data.text);
        const graduation_year = extractGraduationYear(data.text);
        const file_name = path.basename(req.file.path);

        // --- New ATS Enhancements ---
        // Grammar / style suggestions using write-good
        let grammarIssues = [];
        try {
            const suggestions = writeGood(data.text);
            grammarIssues = suggestions.map(s => s.reason || s.message || JSON.stringify(s));
        } catch (e) {
            grammarIssues = [];
        }

        // Resume length check (word count)
        const words = resumeText.split(/\s+/).filter(Boolean);
        const wordCount = words.length;
        let lengthStatus = 'OK';
        let lengthRecommendation = '';
        if (wordCount < 200) {
            lengthStatus = 'Too short';
            lengthRecommendation = 'Add more detailed bullets and projects to reach ~300+ words.';
        } else if (wordCount > 1200) {
            lengthStatus = 'Too long';
            lengthRecommendation = 'Trim redundant bullets; target 1-2 pages (~600-1000 words).' ;
        }

        // Missing contact details check
        const contactMissing = [];
        const emailRegex = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
        const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?(?:\(\d{2,4}\)|\d{2,4})[-.\s]?\d{3,4}[-.\s]?\d{3,4}/;
        if (!emailRegex.test(data.text)) contactMissing.push('email');
        if (!phoneRegex.test(data.text)) contactMissing.push('phone');
        if (!/linkedin.com|github.com|github/i.test(data.text)) contactMissing.push('linkedin/github');

        // Weak bullet detection & action verb suggestions
        const lines = data.text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        const bulletLines = lines.filter(l => /^[\u2022\-\*\•\•\s\t]*[A-Za-z]/.test(l));
        const projectLines = lines.filter(line => /(project|developed|built|designed|implemented|launched|deployed|engineered)/i.test(line)).slice(0, 3);
        const weakBullets = [];
        const actionVerbSuggestions = [];
        bulletLines.forEach(line => {
            // remove leading bullet markers
            const cleaned = line.replace(/^[\u2022\-\*\•\s\t]+/, '');
            const firstWord = (cleaned.split(/\s+/)[0] || '').replace(/[^a-zA-Z]/g, '').toLowerCase();
            if (firstWord && !actionVerbs.includes(firstWord)) {
                // flag as weak bullet
                weakBullets.push(cleaned.slice(0,200));
                // suggest an action verb
                const suggestion = actionVerbs.find(v => !cleaned.toLowerCase().includes(v)) || actionVerbs[0];
                actionVerbSuggestions.push({ line: cleaned.slice(0,120), suggestion });
            }
        });

        // Keyword stuffing detection
        const totalWords = words.length || 1;
        const keywordCounts = {};
        skillDictionary.forEach(skill => {
            const re = new RegExp(`\\b${escapeRegExp(skill)}\\b`, 'g');
            const count = (resumeText.match(re) || []).length;
            if (count > 0) keywordCounts[skill] = count;
        });
        const keyword_stuffing = Object.entries(keywordCounts).filter(([s,c]) => c > 8 || (c/totalWords) > 0.05).map(([s,c]) => ({ skill: s, count: c }));

        // 1. JD extraction
        const jdLower = job_description.toLowerCase();
        const requiredSkills = skillDictionary.filter(skill => jdLower.includes(skill));

        // 2. Keyword Matching against resume
        const skills_found = requiredSkills.filter(skill => resumeText.includes(skill));
        const missing_skills = requiredSkills.filter(skill => !resumeText.includes(skill));
        
        const match_percentage = requiredSkills.length > 0 ? Math.round((skills_found.length / requiredSkills.length) * 100) : 100;

        // 3. Section Detection
        const hasSkills = resumeText.includes('skills');
        const hasExp = resumeText.includes('experience') || resumeText.includes('history');
        const hasEdu = resumeText.includes('education') || resumeText.includes('university');
        const hasProj = resumeText.includes('projects');

        // --- Calculate ATS Score Breakdown (Skills: /40, Projects: /25, Experience: /20, Education: /15) ---
        // 1. Skills (max 40)
        const SkillsScore = Math.round((match_percentage / 100) * 40);

        // 2. Projects (max 25)
        let ProjectsScore = 0;
        if (hasProj) {
            ProjectsScore = Math.min(25, 15 + (projectLines.length * 5));
        }

        // 3. Experience (max 20)
        let ExperienceScore = 0;
        if (hasExp) {
            const deductions = weakBullets.length + (grammarIssues ? grammarIssues.length : 0);
            ExperienceScore = Math.max(10, 20 - deductions);
        }

        // 4. Education (max 15)
        let EducationScore = 0;
        if (hasEdu) {
            const cgpaBonus = _cgpa ? Math.round((_cgpa / 10) * 10) : 5;
            EducationScore = Math.min(15, 5 + cgpaBonus);
        }

        const section_scores = {
            Skills: SkillsScore,
            Experience: ExperienceScore,
            Education: EducationScore,
            Projects: ProjectsScore
        };

        const ats_score = SkillsScore + ProjectsScore + ExperienceScore + EducationScore;

        let strength_level = 'Average';
        if (ats_score < 50) strength_level = 'Weak';
        else if (ats_score > 75) strength_level = 'Strong';

        const suggestions = [];
        if (!hasExp) suggestions.push('Add an Experience section.');
        if (!hasProj) suggestions.push('Include technical projects.');
        if (missing_skills.length > 0) suggestions.push(`Add missing keywords: ${missing_skills.slice(0,3).join(', ')}`);
        
        if(_cgpa < 6) suggestions.push('Your CGPA is low, emphasize skills and live projects.');
        else if(_cgpa > 8) suggestions.push('Your academics are strong. Highlight them near the top.');

        // 3.5 Phase 2 Job Role Matching Logic
        const role_matches = Object.keys(roleSkillsMap).map(rName => {
            const rSkills = roleSkillsMap[rName];
            const found = rSkills.filter(skill => resumeText.includes(skill));
            const missing = rSkills.filter(skill => !resumeText.includes(skill));
            
            const matchPct = rSkills.length > 0 ? Math.round((found.length / rSkills.length) * 100) : 100;
            const roleSectionAvg = ( (hasSkills ? matchPct * 0.9 : 0) + (hasExp ? 85 : 0) + (hasEdu ? 90 : 0) + (hasProj ? 80 : 0) ) / 4;
            const rScore = Math.round((matchPct * 0.6) + (roleSectionAvg * 0.4));
            
            return {
                role: rName,
                score: rScore,
                skills_found: found,
                missing_skills: missing
            };
        });

        const interview_questions = generateInterviewQuestions({
            resumeText,
            role,
            skillsFound: skills_found,
            missingSkills: missing_skills,
            projectLines
        });

        // Determine best fit role
        let bestFit = role_matches[0];
        for (let i = 1; i < role_matches.length; i++) {
            if (role_matches[i].score > bestFit.score) {
                bestFit = role_matches[i];
            }
        }
        const best_fit_role = bestFit.role;

        // 4. Save to DB
        const isFallback = !dbFallback.isConnected();
        let resume;

        const resumeData = {
            user_id: req.user.id,
            file_path: req.file.path,
            file_name,
            resume_text: data.text.substring(0, 500) + '...', // save snippet
            job_description,
            role,
            cgpa: _cgpa,
            college,
            graduation_year,
            ats_score,
            match_percentage,
            // New ATS fields
            grammar_issues: grammarIssues,
            word_count: wordCount,
            length_status: lengthStatus,
            length_recommendation: lengthRecommendation,
            contact_missing: contactMissing,
            weak_bullets: weakBullets,
            action_verb_suggestions: actionVerbSuggestions,
            keyword_stuffing,
            skills_found,
            missing_skills,
            section_scores,
            strength_level,
            suggestions,
            interview_questions,
            role_matches,
            best_fit_role
        };

        if (isFallback) {
            console.log('MongoDB not connected. Saving resume analysis to local JSON database.');
            resume = await dbFallback.createResume(resumeData);
        } else {
            resume = await Resume.create(resumeData);
        }

        res.status(201).json(resume);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server analysis error' });
    }
};

const getHistory = async (req, res) => {
    try {
        const isFallback = !dbFallback.isConnected();
        if (isFallback) {
            console.log('MongoDB not connected. Fetching resume history from local JSON database.');
            const resumes = await dbFallback.findResumesByUserId(req.user.id);
            return res.json(resumes);
        }
        const resumes = await Resume.find({ user_id: req.user.id }).sort({ createdAt: -1 });
        res.json(resumes);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const downloadResume = async (req, res) => {
    try {
        const resumeId = req.params.id;
        const isFallback = !dbFallback.isConnected();
        if (isFallback) {
            const resume = await dbFallback.findResumeById(resumeId);
            if (!resume) return res.status(404).json({ message: 'Resume not found' });
            return res.download(resume.file_path, path.basename(resume.file_path));
        }

        const resume = await Resume.findById(resumeId);
        if (!resume) return res.status(404).json({ message: 'Resume not found' });

        if (req.user.role === 'recruiter') {
            const jobs = await Job.find({ postedBy: req.user.id }).select('_id');
            const jobIds = jobs.map((job) => job._id);
            const application = await Application.findOne({ user_id: resume.user_id, job_id: { $in: jobIds } });
            if (!application) {
                return res.status(403).json({ message: 'Access denied' });
            }
        } else if (req.user.id !== resume.user_id.toString()) {
            return res.status(403).json({ message: 'Access denied' });
        }

        return res.download(resume.file_path, path.basename(resume.file_path));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Resume download failed' });
    }
};

const deleteResume = async (req, res) => {
    try {
        const resumeId = req.params.id;
        const isFallback = !dbFallback.isConnected();
        let resume;

        if (isFallback) {
            resume = await dbFallback.findResumeById(resumeId);
        } else {
            resume = await Resume.findById(resumeId);
        }

        if (!resume) {
            return res.status(404).json({ message: 'Resume not found' });
        }

        // Check ownership (only the user who uploaded the resume can delete it)
        if (resume.user_id.toString() !== req.user.id.toString()) {
            return res.status(403).json({ message: 'Access denied. You do not own this resume.' });
        }

        // Delete the physical PDF file if it exists
        if (resume.file_path && fs.existsSync(resume.file_path)) {
            try {
                fs.unlinkSync(resume.file_path);
            } catch (err) {
                console.error(`Error deleting physical file at ${resume.file_path}:`, err);
            }
        }

        // Delete database record
        if (isFallback) {
            await dbFallback.deleteResume(resumeId);
        } else {
            await Resume.findByIdAndDelete(resumeId);
        }

        res.json({ message: 'Resume deleted successfully' });
    } catch (error) {
        console.error('Delete resume failed:', error);
        res.status(500).json({ message: 'Server error deleting resume' });
    }
};

const getComparisonStats = async (req, res) => {
    try {
        const { role } = req.query;
        if (!role) return res.status(400).json({ message: 'Role query parameter is required' });

        const isFallback = !dbFallback.isConnected();
        let resumes = [];
        
        if (isFallback) {
            const allResumes = await dbFallback.findAllResumes();
            resumes = allResumes.filter(r => r.role === role);
        } else {
            resumes = await Resume.find({ role });
        }

        if (resumes.length === 0) {
            return res.json({
                averageAtsScore: 0,
                topAtsScore: 0,
                averageMatchPercentage: 0,
                totalCandidates: 0
            });
        }

        let totalAts = 0;
        let totalMatch = 0;
        let topAtsScore = 0;

        resumes.forEach(r => {
            totalAts += r.ats_score || 0;
            totalMatch += r.match_percentage || 0;
            if ((r.ats_score || 0) > topAtsScore) {
                topAtsScore = r.ats_score || 0;
            }
        });

        const averageAtsScore = Math.round(totalAts / resumes.length);
        const averageMatchPercentage = Math.round(totalMatch / resumes.length);

        res.json({
            averageAtsScore,
            topAtsScore,
            averageMatchPercentage,
            totalCandidates: resumes.length
        });
    } catch (error) {
        console.error('Error fetching comparison stats', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const setDefaultResume = async (req, res) => {
    try {
        const resumeId = req.params.id;
        const isFallback = !dbFallback.isConnected();

        if (isFallback) {
            const updatedResume = await dbFallback.setDefaultResume(req.user.id, resumeId);
            if (!updatedResume) return res.status(404).json({ message: 'Resume not found' });
            return res.json({ message: 'Default resume updated', resume: updatedResume });
        }

        const resume = await Resume.findOne({ _id: resumeId, user_id: req.user.id });
        if (!resume) return res.status(404).json({ message: 'Resume not found' });

        const wasDefault = resume.is_default;

        // Unset previous default
        await Resume.updateMany({ user_id: req.user.id }, { $set: { is_default: false } });
        
        if (!wasDefault) {
            // Set new default
            resume.is_default = true;
            await resume.save();
        } else {
            resume.is_default = false;
        }

        res.json({ message: 'Default resume updated', resume });
    } catch (error) {
        console.error('Error setting default resume:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { analyzeResume, getHistory, downloadResume, deleteResume, getComparisonStats, setDefaultResume };
