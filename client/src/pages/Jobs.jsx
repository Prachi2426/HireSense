import { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import JobCard from '../components/JobCard';
import { AuthContext } from '../context/AuthContext';

const Jobs = () => {
  const { user } = useContext(AuthContext);
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [role, setRole] = useState('');
  const [keyword, setKeyword] = useState('');

  const fetchJobs = async () => {
    try {
      const params = {};
      if (role) params.role = role;
      if (keyword) params.keyword = keyword;
      const { data } = await axios.get('http://localhost:5000/api/jobs', { params });
      setJobs(data);
    } catch (err) {
      console.error('Error fetching jobs', err);
    }
  };

  const fetchApplications = async () => {
    if (!user) {
      setApplications([]);
      return;
    }
    try {
      const { data } = await axios.get('http://localhost:5000/api/jobs/applications/my', {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setApplications(data);
    } catch (err) {
      console.error('Error fetching applications', err);
    }
  };

  useEffect(() => { 
    fetchJobs(); 
    fetchApplications();
  }, [user]);

  const handleApply = async (jobId) => {
    if (!user) return alert('Please log in to apply');
    try {
      await axios.post(`http://localhost:5000/api/jobs/${jobId}/apply`, {}, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      alert('Applied');
      fetchApplications();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Apply failed');
    }
  };

  const handleUndoApply = async (jobId) => {
    if (!user) return;
    try {
      await axios.delete(`http://localhost:5000/api/jobs/${jobId}/apply/undo`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      alert('Application undone');
      fetchApplications();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Undo Apply failed');
    }
  };

  const handleSave = async (jobId) => {
    if (!user) return alert('Please log in to save');
    try {
      await axios.post(`http://localhost:5000/api/jobs/${jobId}/save`, {}, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      alert('Saved');
      fetchApplications();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Save failed');
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchJobs();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200">
        <form onSubmit={handleSearch} className="flex gap-4">
          <select value={role} onChange={e => setRole(e.target.value)} className="border p-3 rounded-lg">
            <option value="">All Roles</option>
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
          <input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="Keyword" className="flex-1 border p-3 rounded-lg" />
          <button className="bg-indigo-600 text-white px-6 rounded-lg">Filter</button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {jobs.map(job => {
          const userApp = applications.find(app => (app.job_id?._id || app.job_id) === job._id);
          const isApplied = userApp && userApp.status !== 'Saved';
          const isSaved = userApp && userApp.status === 'Saved';
          
          return (
            <JobCard 
              key={job._id} 
              job={job} 
              onApply={handleApply} 
              onSave={handleSave} 
              onUndoApply={handleUndoApply}
              isApplied={isApplied}
              isSaved={isSaved}
            />
          );
        })}
      </div>
    </div>
  );
};

export default Jobs;
