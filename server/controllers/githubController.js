const User = require('../models/User');
const dbFallback = require('../utils/dbFallback');

const buildGithubHeaders = () => {
    const headers = {
        'User-Agent': 'ResumeIQ',
        Accept: 'application/vnd.github+json'
    };
    if (process.env.GITHUB_TOKEN) {
        headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }
    return headers;
};

const parseCommitCountFromLink = (linkHeader) => {
    if (!linkHeader) return null;
    const match = linkHeader.match(/&page=(\d+)>; rel="last"/);
    if (match) return parseInt(match[1], 10);
    return null;
};

const fetchJson = async (url) => {
    const response = await fetch(url, { headers: buildGithubHeaders() });
    if (!response.ok) {
        const body = await response.text();
        throw new Error(`GitHub API error ${response.status}: ${body}`);
    }
    return response.json();
};

const fetchRepoCommitCount = async (owner, repoName) => {
    try {
        const url = `https://api.github.com/repos/${owner}/${repoName}/commits?per_page=1`;
        const response = await fetch(url, { headers: buildGithubHeaders() });
        if (!response.ok) return 0;
        const link = response.headers.get('link');
        const count = parseCommitCountFromLink(link);
        if (count !== null) return count;
        const json = await response.json();
        return Array.isArray(json) ? json.length : 0;
    } catch (error) {
        return 0;
    }
};

const buildProjectSuggestion = (repo) => {
    const languages = repo.language ? repo.language : 'multiple languages';
    return {
        name: repo.name,
        description: repo.description || 'No description provided.',
        url: repo.html_url,
        stars: repo.stargazers_count,
        commits: repo.commit_count || 0,
        language: repo.language || 'unknown',
        suggestion: `Add ${repo.name} to your resume as a ${repo.language || 'tech'} project. Highlight ${repo.commit_count || 0} commits, ${repo.stargazers_count} stars, and use of ${languages}.`
    };
};

const fetchGithubData = async (github_username) => {
    const profile = await fetchJson(`https://api.github.com/users/${github_username}`);
    const repos = await fetchJson(`https://api.github.com/users/${github_username}/repos?per_page=100&type=owner&sort=pushed`);
    const repoSummaries = repos.map((repo) => ({
        id: repo.id,
        name: repo.name,
        description: repo.description,
        html_url: repo.html_url,
        stargazers_count: repo.stargazers_count,
        forks_count: repo.forks_count,
        language: repo.language,
        pushed_at: repo.pushed_at,
        updated_at: repo.updated_at,
        archived: repo.archived,
        private: repo.private
    })).filter((repo) => !repo.private);

    const languages = {};
    repoSummaries.forEach((repo) => {
        if (repo.language) {
            languages[repo.language] = (languages[repo.language] || 0) + 1;
        }
    });

    const sampleRepos = repoSummaries.slice(0, 10);
    const commitCounts = await Promise.all(sampleRepos.map((repo) => fetchRepoCommitCount(github_username, repo.name)));
    sampleRepos.forEach((repo, index) => {
        repo.commit_count = commitCounts[index] || 0;
    });

    const total_commits = sampleRepos.reduce((sum, repo) => sum + (repo.commit_count || 0), 0);

    const scoredRepos = sampleRepos.map((repo) => {
        const repoAgeScore = repo.updated_at ? Math.max(0, 1 - (new Date() - new Date(repo.updated_at)) / (1000 * 60 * 60 * 24 * 365)) : 0;
        const score = repo.stargazers_count * 3 + (repo.commit_count || 0) * 0.2 + repoAgeScore * 10;
        return { ...repo, score };
    });

    scoredRepos.sort((a, b) => b.score - a.score);
    const suggested_projects = scoredRepos.slice(0, 3).map(buildProjectSuggestion);

    return {
        github_username,
        profile: {
            login: profile.login,
            name: profile.name,
            avatar_url: profile.avatar_url,
            html_url: profile.html_url,
            bio: profile.bio,
            location: profile.location,
            public_repos: profile.public_repos,
            followers: profile.followers,
            following: profile.following
        },
        repo_count: repoSummaries.length,
        total_commits,
        languages: Object.entries(languages).sort((a, b) => b[1] - a[1]).map(([language, count]) => ({ language, count })),
        top_repositories: scoredRepos.slice(0, 5).map((repo) => ({
            name: repo.name,
            description: repo.description,
            html_url: repo.html_url,
            stars: repo.stargazers_count,
            commits: repo.commit_count || 0,
            language: repo.language || 'unknown',
            updated_at: repo.updated_at
        })),
        suggested_projects
    };
};

const connectGithub = async (req, res) => {
    try {
        const { github_username } = req.body;
        if (!github_username) {
            return res.status(400).json({ message: 'GitHub username is required' });
        }

        const githubData = await fetchGithubData(github_username);

        const isFallback = !dbFallback.isConnected();
        if (isFallback) {
            await dbFallback.updateUserGithub(req.user.id, github_username);
        } else {
            await User.findByIdAndUpdate(req.user.id, { github_username }, { new: true });
        }

        return res.json(githubData);
    } catch (error) {
        console.error(error);
        if (error.message.includes('GitHub API error 404')) {
            return res.status(404).json({ message: 'GitHub user not found' });
        }
        res.status(500).json({ message: 'Unable to connect GitHub account' });
    }
};

const getGithubProfile = async (req, res) => {
    try {
        const isFallback = !dbFallback.isConnected();
        let github_username = null;
        if (isFallback) {
            const user = await dbFallback.findUserById(req.user.id);
            github_username = user?.github_username;
        } else {
            const user = await User.findById(req.user.id);
            github_username = user?.github_username;
        }

        if (!github_username) {
            return res.status(404).json({ message: 'GitHub username not connected' });
        }

        const githubData = await fetchGithubData(github_username);
        res.json(githubData);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Unable to fetch GitHub data' });
    }
};

module.exports = { connectGithub, getGithubProfile };
