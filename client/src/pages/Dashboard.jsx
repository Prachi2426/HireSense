import { useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Trash2, Star } from 'lucide-react';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [role, setRole] = useState('');
  const [jobDesc, setJobDesc] = useState('');
  const [cgpa, setCgpa] = useState('');
  const [history, setHistory] = useState([]);
  const [githubUsername, setGithubUsername] = useState('');
  const [githubData, setGithubData] = useState(null);
  const [githubLoading, setGithubLoading] = useState(false);
  const [githubError, setGithubError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.token) {
      fetchHistory();
      fetchGithubProfile();
    }
  }, [user]);

  const fetchHistory = async () => {
    if (!user?.token) return;
    try {
      const { data } = await axios.get('http://localhost:5000/api/resumes/history', {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setHistory(data);
    } catch (error) {
      console.error('History load failed', error);
    }
  };

  const fetchGithubProfile = async () => {
    if (!user?.token) return;
    try {
      const { data } = await axios.get('http://localhost:5000/api/github/profile', {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setGithubData(data);
      setGithubUsername(data.github_username || '');
    } catch (error) {
      setGithubData(null);
    }
  };

  const handleConnectGithub = async (e) => {
    e.preventDefault();
    if (!githubUsername) return setGithubError('Enter your GitHub username');

    setGithubLoading(true);
    setGithubError('');
    try {
      const { data } = await axios.post('http://localhost:5000/api/github/connect', { github_username: githubUsername }, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setGithubData(data);
      setGithubError('Connected successfully');
    } catch (error) {
      setGithubError(error.response?.data?.message || 'GitHub connection failed');
    } finally {
      setGithubLoading(false);
    }
  };

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!file || !role || !jobDesc || !cgpa) return alert('Fill all fields');

    const formData = new FormData();
    formData.append('resume', file);
    formData.append('role', role);
    formData.append('job_description', jobDesc);
    formData.append('cgpa', cgpa);

    setLoading(true);
    if (!user?.token) {
      alert('You must be logged in to analyze a resume.');
      setLoading(false);
      return;
    }

    try {
      const { data } = await axios.post('http://localhost:5000/api/resumes/analyze', formData, {
        headers: { 
          Authorization: `Bearer ${user.token}`
        }
      });
      navigate('/results', { state: { result: data } });
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Analysis failed.';
      alert(`Analysis failed: ${message}`);
      console.error('Analyze error', error);
      setLoading(false);
    }
  };

  const handleDeleteResume = async (resumeId, e) => {
    e.stopPropagation(); // Prevent navigating to /results
    if (!window.confirm('Are you sure you want to delete this resume history record?')) return;

    try {
      await axios.delete(`http://localhost:5000/api/resumes/${resumeId}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      // Remove from state
      setHistory(prev => prev.filter(item => item._id !== resumeId));
    } catch (error) {
      alert('Failed to delete resume: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleSetDefault = async (resumeId, e) => {
    e.stopPropagation();
    try {
      const { data } = await axios.put(`http://localhost:5000/api/resumes/${resumeId}/default`, {}, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      // Update local state to reflect the new default / toggle state
      const updatedResume = data.resume;
      setHistory(prev => prev.map(item => {
        if (item._id === resumeId) {
          return { ...item, is_default: updatedResume.is_default };
        } else {
          return { ...item, is_default: false };
        }
      }));
    } catch (error) {
      alert('Failed to set default: ' + (error.response?.data?.message || error.message));
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Upload Form */}
      <div className="lg:col-span-2 bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-2xl font-bold text-slate-800 mb-6">New Analysis</h2>
        <form onSubmit={handleAnalyze} className="space-y-6">
          <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center cursor-pointer hover:bg-slate-50 transition relative">
            <input type="file" accept=".pdf" onChange={e => setFile(e.target.files[0])} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
            <p className="text-slate-600 font-medium">{file ? file.name : "Drag & drop your PDF resume here, or click to browse"}</p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Target Role</label>
            <select required value={role} onChange={e => setRole(e.target.value)} className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:border-indigo-500 bg-white">
              <option value="">Select...</option>
              <option value="Software Developer">Software Developer</option>
              <option value="Frontend Developer">Frontend Developer</option>
              <option value="Backend Developer">Backend Developer</option>
              <option value="Cloud Engineer">Cloud Engineer</option>
              <option value="DevOps Engineer">DevOps Engineer</option>
              <option value="Data Analyst">Data Analyst</option>
              <option value="ML Engineer">ML Engineer</option>
              <option value="Product Manager">Product Manager</option>
              <option value="UX/UI Designer">UX/UI Designer</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Job Description</label>
            <textarea rows="4" required value={jobDesc} onChange={e => setJobDesc(e.target.value)} className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:border-indigo-500" placeholder="Paste target description..."></textarea>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Academic Score (CGPA)</label>
            <input type="number" step="0.1" required value={cgpa} onChange={e => setCgpa(e.target.value)} className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:border-indigo-500" placeholder="e.g. 8.5" />
          </div>
          <button disabled={loading} type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg transition">
            {loading ? 'Analyzing...' : 'Analyze My Resume'}
          </button>
        </form>
      </div>

      {/* History */}
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 space-y-8">
        <div>
          <h2 className="text-xl font-bold text-slate-800 mb-6">Connect GitHub</h2>
          <form onSubmit={handleConnectGithub} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">GitHub Username</label>
              <input value={githubUsername} onChange={(e) => setGithubUsername(e.target.value)} className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:border-indigo-500" placeholder="github_username" />
            </div>
            <button disabled={githubLoading} type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl transition">
              {githubLoading ? 'Connecting...' : 'Connect GitHub'}
            </button>
            {githubError && <p className="text-sm text-red-600">{githubError}</p>}
          </form>
          {githubData && (
            <div className="mt-6 bg-slate-50 border border-slate-200 rounded-xl p-4">
              <h3 className="font-semibold text-slate-800">Connected GitHub</h3>
              <p className="text-sm text-slate-600">{githubData.profile.name || githubData.profile.login}</p>
              <p className="text-sm text-slate-500">{githubData.repo_count} public repos · {githubData.total_commits} commits</p>
            </div>
          )}
        </div>

        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-800">Recent History</h2>
            <span className="bg-indigo-100 text-indigo-800 text-xs font-bold px-3 py-1 rounded-full shadow-sm">
              Total Resumes: {history.length}
            </span>
          </div>
          <div className="space-y-4">
            {history.length === 0 ? (
               <p className="text-slate-500 text-sm">No analysis history found.</p>
            ) : (
              history.map(item => (
                <div key={item._id} className={`p-4 border rounded-xl flex justify-between items-center hover:shadow-md transition cursor-pointer group ${item.is_default ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-100'}`} onClick={() => navigate('/results', { state: { result: item } })}>
                  <div>
                    <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                      {item.role}
                      {item.is_default && <span className="bg-indigo-600 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded-md">Default</span>}
                    </h4>
                    <p className="text-xs text-slate-500">{new Date(item.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`font-bold text-lg ${item.ats_score > 75 ? 'text-green-600' : item.ats_score > 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {item.ats_score}
                    </span>
                    <button 
                      onClick={(e) => handleSetDefault(item._id, e)}
                      className={`p-2 rounded-lg transition duration-200 ${item.is_default ? 'text-yellow-500 bg-yellow-50' : 'text-slate-400 hover:text-yellow-500 hover:bg-yellow-50'}`}
                      title={item.is_default ? 'Current Default (Click to remove)' : 'Set as Default'}
                    >
                      <Star size={18} fill={item.is_default ? 'currentColor' : 'none'} />
                    </button>
                    <button 
                      onClick={(e) => handleDeleteResume(item._id, e)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition duration-200"
                      title="Delete Resume"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
export default Dashboard;
