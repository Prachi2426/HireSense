import { useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { Edit2, Trash2 } from 'lucide-react';

const RecruiterDashboard = () => {
  const { user } = useContext(AuthContext);
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState('');
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterSkills, setFilterSkills] = useState('');
  const [filterAts, setFilterAts] = useState('80');
  const [filterCgpa, setFilterCgpa] = useState('');
  const [filterCollege, setFilterCollege] = useState('');
  const [filterGradYear, setFilterGradYear] = useState('');
  const [activeAppTab, setActiveAppTab] = useState('all'); // all | shortlisted
  const [editingJobId, setEditingJobId] = useState(null);

  useEffect(() => {
    fetchJobs();
    fetchApplications();
  }, []);

  const fetchJobs = async () => {
    try {
      const { data } = await axios.get('http://localhost:5000/api/jobs?postedBy=mine', {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setJobs(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchApplications = async (params = {}) => {
    try {
      const { data } = await axios.get('http://localhost:5000/api/jobs/applications/recruiter', {
        headers: { Authorization: `Bearer ${user.token}` },
        params
      });
      setApplications(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearchCandidates = () => {
    fetchApplications({
      skills: filterSkills,
      atsMin: filterAts,
      cgpaMin: filterCgpa,
      college: filterCollege,
      gradYear: filterGradYear
    });
  };

  const handleClearFilters = () => {
    setFilterSkills('');
    setFilterAts('80');
    setFilterCgpa('');
    setFilterCollege('');
    setFilterGradYear('');
    fetchApplications();
  };

  const handleDownloadResume = async (resumeId, fileName) => {
    if (!resumeId) return alert('No resume available');
    try {
      const response = await axios.get(`http://localhost:5000/api/resumes/${resumeId}/download`, {
        headers: { Authorization: `Bearer ${user.token}` },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName || 'resume.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Resume download failed');
    }
  };

  const clearForm = () => {
    setTitle('');
    setCompany('');
    setLocation('');
    setDescription('');
    setRequirements('');
    setEditingJobId(null);
  };

  const handlePostJob = async (e) => {
    e.preventDefault();
    if (!title || !company || !location || !description) return alert('Fill all fields');
    setLoading(true);
    try {
      const reqs = requirements.split(',').map(r => r.trim()).filter(Boolean);
      if (editingJobId) {
        // --- EDIT MODE ---
        await axios.put(`http://localhost:5000/api/jobs/${editingJobId}`, {
          title, company, location, description, requirements: reqs
        }, { headers: { Authorization: `Bearer ${user.token}` } });
        clearForm();
        fetchJobs();
      } else {
        // --- CREATE MODE ---
        await axios.post('http://localhost:5000/api/jobs', {
          title, company, location, description, requirements: reqs
        }, { headers: { Authorization: `Bearer ${user.token}` } });
        clearForm();
        fetchJobs();
      }
    } catch (err) {
      alert(editingJobId ? 'Failed to update job' : 'Failed to post job');
    }
    setLoading(false);
  };

  const handleStartEditJob = (job) => {
    setEditingJobId(job._id);
    setTitle(job.title || '');
    setCompany(job.company || '');
    setLocation(job.location || '');
    setDescription(job.description || '');
    setRequirements((job.requirements || []).join(', '));
    // Scroll form into view smoothly
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteJob = async (jobId) => {
    if (!window.confirm('Are you sure you want to delete this job posting? All associated applications will also be removed.')) return;
    try {
      await axios.delete(`http://localhost:5000/api/jobs/${jobId}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      fetchJobs();
      fetchApplications();
    } catch (err) {
      alert('Failed to delete job: ' + (err.response?.data?.message || err.message));
    }
  };

  const updateApplicationStatus = async (appId, status) => {
    try {
      await axios.patch(`http://localhost:5000/api/jobs/applications/${appId}`, 
        { status },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      fetchApplications();
    } catch (err) {
      console.error(err);
    }
  };

  const toggleShortlistStatus = async (app) => {
    const nextStatus = app.status === 'Shortlisted' ? 'Applied' : 'Shortlisted';
    await updateApplicationStatus(app._id, nextStatus);
  };

  const handleExportShortlisted = () => {
    const shortlistedApps = applications.filter(app => app.status === 'Shortlisted');
    if (shortlistedApps.length === 0) {
      return alert('No shortlisted candidates to export.');
    }

    // CSV headers
    const headers = ['Candidate Name', 'Email', 'Target Job', 'ATS Score', 'Match Percentage', 'CGPA', 'College', 'Graduation Year', 'Skills Found', 'Status', 'Resume Download Link'];
    
    // CSV rows
    const rows = shortlistedApps.map(app => [
      `"${(app.user_id?.name || 'Unknown').replace(/"/g, '""')}"`,
      `"${(app.user_id?.email || 'N/A').replace(/"/g, '""')}"`,
      `"${(app.job_id?.title || 'Unknown Job').replace(/"/g, '""')}"`,
      app.ats_score ?? 'N/A',
      app.match_percentage ? `${app.match_percentage}%` : 'N/A',
      app.cgpa ?? 'N/A',
      `"${(app.college || 'N/A').replace(/"/g, '""')}"`,
      app.graduation_year || 'N/A',
      `"${(app.skills_found || []).join(', ').replace(/"/g, '""')}"`,
      app.status,
      app.latestResumeId ? `http://localhost:5000/api/resumes/${app.latestResumeId}/download` : 'No Resume'
    ]);

    const csvContent = "\ufeff" + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `shortlisted_candidates_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBulkDownloadResumes = async () => {
    const shortlistedApps = applications.filter(app => app.status === 'Shortlisted');
    const appsWithResumes = shortlistedApps.filter(app => app.latestResumeId);
    
    if (appsWithResumes.length === 0) {
      return alert('No shortlisted candidates have resumes available.');
    }

    if (!window.confirm(`Are you sure you want to download resumes for all ${appsWithResumes.length} shortlisted candidates sequentially?`)) {
      return;
    }

    for (let i = 0; i < appsWithResumes.length; i++) {
      const app = appsWithResumes[i];
      const fileName = app.user_id?.name ? `${app.user_id.name.replace(/\s+/g, '_')}_resume.pdf` : `candidate_${i+1}_resume.pdf`;
      
      // Delay to avoid spamming the browser downloads
      await new Promise(resolve => setTimeout(resolve, 800));
      await handleDownloadResume(app.latestResumeId, fileName);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800">Recruiter Dashboard</h1>
          <p className="text-slate-500 text-sm">Post jobs, manage applications, track candidates</p>
        </div>
        <Link to="/" className="text-indigo-600 hover:text-indigo-800 font-semibold">← Home</Link>
      </div>

      {/* Post Job Section */}
      <div className={`bg-white p-8 rounded-2xl border shadow-sm transition-all duration-300 ${editingJobId ? 'border-indigo-300 ring-2 ring-indigo-100' : 'border-slate-200'}`}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              {editingJobId ? '✏️ Edit Job Posting' : 'Post a New Job'}
            </h2>
            {editingJobId && (
              <p className="text-sm text-indigo-600 font-medium mt-1">Editing an existing job — make your changes and save.</p>
            )}
          </div>
          {editingJobId && (
            <button
              type="button"
              onClick={clearForm}
              className="text-sm text-slate-500 hover:text-slate-800 font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition"
            >
              ✕ Cancel Edit
            </button>
          )}
        </div>
        <form onSubmit={handlePostJob} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Job Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:border-indigo-500"
                placeholder="e.g. Senior React Developer"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Company</label>
              <input
                type="text"
                required
                value={company}
                onChange={e => setCompany(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:border-indigo-500"
                placeholder="e.g. Acme Tech"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Location</label>
            <input
              type="text"
              required
              value={location}
              onChange={e => setLocation(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:border-indigo-500"
              placeholder="e.g. Remote, San Francisco"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Job Description</label>
            <textarea
              rows="5"
              required
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:border-indigo-500"
              placeholder="Describe the role, responsibilities, and qualifications..."
            ></textarea>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Required Skills (comma-separated)</label>
            <input
              type="text"
              value={requirements}
              onChange={e => setRequirements(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:border-indigo-500"
              placeholder="e.g. javascript, react, node, git"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 font-bold py-3 rounded-lg transition text-white ${editingJobId ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
            >
              {loading ? (editingJobId ? 'Saving...' : 'Posting...') : (editingJobId ? '✓ Save Changes' : 'Post Job')}
            </button>
            {editingJobId && (
              <button
                type="button"
                onClick={clearForm}
                className="px-6 font-bold py-3 rounded-lg transition bg-slate-100 hover:bg-slate-200 text-slate-700"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Posted Jobs */}
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-800 mb-6">My Posted Jobs ({jobs.length})</h2>
        <div className="space-y-4">
          {jobs.length === 0 ? (
            <p className="text-slate-500">No jobs posted yet.</p>
          ) : (
            jobs.map(job => (
              <div key={job._id} className={`p-5 border rounded-xl bg-slate-50 hover:bg-white hover:shadow-md transition-all duration-200 ${editingJobId === job._id ? 'border-indigo-300 ring-2 ring-indigo-100 bg-indigo-50' : 'border-slate-100'}`}>
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-slate-800 text-lg">{job.title}</h3>
                      {editingJobId === job._id && (
                        <span className="text-xs bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-full">Editing</span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">{job.company} • {job.location}</p>
                    <p className="mt-2 text-sm text-slate-600 line-clamp-2">{job.description?.slice(0, 150)}...</p>
                    {job.requirements?.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {job.requirements.map((skill, i) => (
                          <span key={i} className="text-xs bg-slate-200 text-slate-700 font-semibold px-2 py-0.5 rounded-full">{skill}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => handleStartEditJob(job)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 transition"
                      title="Edit this job"
                    >
                      <Edit2 size={14} /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteJob(job._id)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 transition"
                      title="Delete this job"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Applications */}
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-100 pb-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Applications Received</h2>
            <p className="text-sm text-slate-500">Filter, manage, shortlist, and export candidate data</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={handleExportShortlisted}
              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold py-2.5 px-4 rounded-xl text-sm border border-indigo-100 transition inline-flex items-center gap-1.5 shadow-sm"
            >
              📥 Export Shortlist (CSV)
            </button>
            <button 
              onClick={handleBulkDownloadResumes}
              className="bg-slate-800 hover:bg-slate-900 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition inline-flex items-center gap-1.5 shadow-sm"
            >
              📂 Download Resumes (Bulk)
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 p-1 bg-slate-100 rounded-xl w-fit">
          <button 
            type="button"
            onClick={() => setActiveAppTab('all')} 
            className={`px-4 py-2 rounded-lg font-bold text-sm transition ${activeAppTab === 'all' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:bg-slate-50/50'}`}
          >
            All Applications ({applications.length})
          </button>
          <button 
            type="button"
            onClick={() => setActiveAppTab('shortlisted')} 
            className={`px-4 py-2 rounded-lg font-bold text-sm transition ${activeAppTab === 'shortlisted' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:bg-slate-50/50'}`}
          >
            Shortlisted ({applications.filter(a => a.status === 'Shortlisted').length})
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 mb-6">
          <input value={filterSkills} onChange={e => setFilterSkills(e.target.value)} placeholder="Skills (comma-separated)" className="border border-slate-300 rounded-lg p-3" />
          <input value={filterAts} onChange={e => setFilterAts(e.target.value)} type="number" min="0" max="100" placeholder="Min ATS (80)" className="border border-slate-300 rounded-lg p-3" />
          <input value={filterCgpa} onChange={e => setFilterCgpa(e.target.value)} type="number" step="0.1" min="0" max="10" placeholder="Min CGPA" className="border border-slate-300 rounded-lg p-3" />
          <input value={filterCollege} onChange={e => setFilterCollege(e.target.value)} placeholder="College" className="border border-slate-300 rounded-lg p-3" />
          <input value={filterGradYear} onChange={e => setFilterGradYear(e.target.value)} type="number" placeholder="Graduation Year" className="border border-slate-300 rounded-lg p-3" />
          <div className="flex gap-3">
            <button type="button" onClick={handleSearchCandidates} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg transition">Search</button>
            <button type="button" onClick={handleClearFilters} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-lg transition">Reset</button>
          </div>
        </div>
        <div className="space-y-4">
          {applications.length === 0 ? (
            <p className="text-slate-500">No applications yet.</p>
          ) : activeAppTab === 'shortlisted' && applications.filter(a => a.status === 'Shortlisted').length === 0 ? (
            <p className="text-slate-500 py-4 italic">No candidates have been shortlisted yet. Use the star icon to shortlist candidates!</p>
          ) : (
            applications
              .filter(app => activeAppTab === 'all' || app.status === 'Shortlisted')
              .map(app => (
                <div key={app._id} className="p-5 border border-slate-100 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50 hover:bg-white hover:shadow-md transition">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <button 
                        type="button"
                        onClick={() => toggleShortlistStatus(app)} 
                        className={`text-2xl transition-all duration-200 hover:scale-110 flex-shrink-0 cursor-pointer ${app.status === 'Shortlisted' ? 'text-amber-500' : 'text-slate-300 hover:text-amber-400'}`}
                        title={app.status === 'Shortlisted' ? 'Remove from shortlist' : 'Shortlist candidate'}
                      >
                        ★
                      </button>
                      <div>
                        <p className="font-extrabold text-slate-800 text-lg">{app.job_id?.title || 'Unknown Job'}</p>
                        <p className="text-sm font-semibold text-slate-500">Candidate: {app.user_id?.name || 'Unknown'}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">Rank {app.rank_score ?? 'N/A'}</span>
                      <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">ATS {app.ats_score ?? 'N/A'}</span>
                      <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">Match {app.match_percentage ?? 'N/A'}%</span>
                      <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">CGPA {app.cgpa ?? 'N/A'}</span>
                      {app.college && <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">{app.college}</span>}
                      {app.graduation_year && <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">Grad {app.graduation_year}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-3 md:items-end w-full md:w-auto">
                    <select 
                      value={app.status} 
                      onChange={e => updateApplicationStatus(app._id, e.target.value)}
                      className="border border-slate-300 rounded p-2 text-sm w-full md:w-auto font-semibold text-slate-700 bg-white"
                    >
                      <option value="Applied">Applied</option>
                      <option value="Viewed">Viewed</option>
                      <option value="Shortlisted">Shortlisted</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                    <button type="button" onClick={() => handleDownloadResume(app.latestResumeId, app.user_id?.name ? `${app.user_id.name}-resume.pdf` : 'resume.pdf')} className="w-full md:w-auto bg-slate-800 hover:bg-slate-900 text-white font-semibold py-2 px-4 rounded-lg transition">Download Resume</button>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
};

export default RecruiterDashboard;
