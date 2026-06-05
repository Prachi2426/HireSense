import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

const Compare = () => {
  const { user } = useContext(AuthContext);
  const [role, setRole] = useState('Software Developer');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchStats = async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await axios.get(`http://localhost:5000/api/resumes/compare?role=${role}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setStats(data);
    } catch (err) {
      setError('Failed to load comparison data');
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStats();
  }, [role, user]);

  const chartData = stats ? [
    {
      name: 'ATS Score',
      Average: stats.averageAtsScore,
      Top: stats.topAtsScore
    },
    {
      name: 'Match %',
      Average: stats.averageMatchPercentage,
      Top: 100 // Typically top match is 100%
    }
  ] : [];

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 sm:px-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Resume Leaderboard</h1>
          <p className="text-slate-500">Compare your potential against other candidates by role.</p>
        </div>
        <div>
          <select 
            value={role} 
            onChange={(e) => setRole(e.target.value)}
            className="w-full sm:w-auto rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 font-medium"
          >
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
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-center font-medium border border-red-100">{error}</div>
      ) : stats ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm text-center">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Candidates</h3>
              <p className="text-5xl font-extrabold text-indigo-600">{stats.totalCandidates}</p>
              <p className="text-sm text-slate-400 mt-2">resumes analyzed for this role</p>
            </div>
            
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm text-center">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Average ATS Score</h3>
              <p className="text-5xl font-extrabold text-slate-800">{stats.averageAtsScore}</p>
              <p className="text-sm text-slate-400 mt-2">out of 100</p>
            </div>
            
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm text-center border-t-4 border-t-green-500">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Top ATS Score</h3>
              <p className="text-5xl font-extrabold text-green-600">{stats.topAtsScore}</p>
              <p className="text-sm text-slate-400 mt-2">highest achieved score</p>
            </div>
          </div>

          <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-2xl border border-slate-100 shadow-sm flex flex-col h-[480px]">
            <h3 className="text-lg font-bold text-slate-800 mb-6">Aggregate Performance Matrix</h3>
            {stats.totalCandidates === 0 ? (
              <div className="flex-1 flex items-center justify-center text-slate-400 font-medium">
                No data available for this role yet. Be the first!
              </div>
            ) : (
              <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontWeight: 500}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} domain={[0, 100]} />
                    <Tooltip 
                      cursor={{fill: '#f8fafc'}}
                      contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontWeight: 600}}
                    />
                    <Legend iconType="circle" wrapperStyle={{paddingTop: '20px'}} />
                    <Bar dataKey="Average" fill="#818cf8" radius={[6, 6, 0, 0]} maxBarSize={60} />
                    <Bar dataKey="Top" fill="#34d399" radius={[6, 6, 0, 0]} maxBarSize={60} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default Compare;
