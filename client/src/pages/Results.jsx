import { useState, useEffect, useContext } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, PieChart, Pie, Cell } from 'recharts';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const Results = () => {
  const { state } = useLocation();
  const res = state?.result;
  const { user } = useContext(AuthContext);

  const [activeTab, setActiveTab] = useState('core'); // core | matching | comparison
  const [history, setHistory] = useState([]);
  const [compareWithId, setCompareWithId] = useState('');

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const { data } = await axios.get('http://localhost:5000/api/resumes/history', {
          headers: { Authorization: `Bearer ${user.token}` }
        });
        setHistory(data);
        // Default compareWithId to the second latest resume if available
        if (res && data.length > 1) {
          const otherResumes = data.filter(item => item._id !== res._id);
          if (otherResumes.length > 0) {
            setCompareWithId(otherResumes[0]._id);
          }
        }
      } catch (err) {
        console.error('Error fetching history', err);
      }
    };
    if (user && res) {
      fetchHistory();
    }
  }, [user, res]);

  if (!res) return <div className="text-center mt-20 font-bold">No results found. Go analyze a resume first!</div>;

  const getBadgeColor = (str) => str === 'Strong' ? 'bg-green-100 text-green-800' : str === 'Average' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800';

  const getSectionMax = (section) => {
    switch (section) {
      case 'Skills': return 40;
      case 'Projects': return 25;
      case 'Experience': return 20;
      case 'Education': return 15;
      default: return 100;
    }
  };

  // --- TAB 1: Core Analysis Data ---
  const chartData = Object.keys(res.section_scores || {}).map(key => {
    const rawVal = res.section_scores[key] || 0;
    const maxVal = getSectionMax(key);
    const percentage = Math.round((rawVal / maxVal) * 100);
    return {
      name: key,
      score: percentage,
      actual: rawVal,
      max: maxVal
    };
  });

  // --- TAB 2: Resume Comparison Calculations ---
  const selectedCompare = history.find(item => item._id === compareWithId);
  
  let comparisonStats = null;
  if (selectedCompare) {
    const scoreDiff = res.ats_score - selectedCompare.ats_score;
    const skillsAdded = res.skills_found.filter(s => !selectedCompare.skills_found.includes(s));
    const skillsRemoved = selectedCompare.skills_found.filter(s => !res.skills_found.includes(s));
    const suggestionsFixed = selectedCompare.suggestions.filter(s => !res.suggestions.includes(s));
    
    const sectionComparisonData = Object.keys(res.section_scores || {}).map(key => {
      const maxVal = getSectionMax(key);
      const prevRaw = selectedCompare.section_scores[key] || 0;
      const currRaw = res.section_scores[key] || 0;
      return {
        name: key,
        Previous: Math.round((prevRaw / maxVal) * 100),
        Current: Math.round((currRaw / maxVal) * 100),
        prevActual: prevRaw,
        currActual: currRaw,
        max: maxVal
      };
    });

    comparisonStats = {
      scoreDiff,
      skillsAdded,
      skillsRemoved,
      suggestionsFixed,
      sectionComparisonData
    };
  }

  // Chronological history for line chart (oldest to newest)
  const chronologicalHistory = [...history].reverse().map((h, i) => ({
    name: new Date(h.createdAt).toLocaleDateString(),
    Score: h.ats_score,
    Role: h.role,
    index: i + 1
  }));

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <Link to="/dashboard" className="text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1 transition">
          ← Back to Dashboard
        </Link>
        <div className="bg-slate-200 p-1 rounded-xl flex gap-1">
          <button 
            onClick={() => setActiveTab('core')} 
            className={`px-4 py-2 rounded-lg font-bold text-sm transition ${activeTab === 'core' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            Core Analysis
          </button>
          <button 
            onClick={() => setActiveTab('matching')} 
            className={`px-4 py-2 rounded-lg font-bold text-sm transition ${activeTab === 'matching' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            Job Role Matching
          </button>
          <button 
            onClick={() => setActiveTab('comparison')} 
            className={`px-4 py-2 rounded-lg font-bold text-sm transition ${activeTab === 'comparison' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            Resume Comparison
          </button>
          <button 
            onClick={() => setActiveTab('interview')} 
            className={`px-4 py-2 rounded-lg font-bold text-sm transition ${activeTab === 'interview' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            Interview Prep
          </button>
        </div>
      </div>

      {activeTab === 'core' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Main Score panel */}
            <div className="md:col-span-2 bg-gradient-to-br from-indigo-900 to-blue-800 rounded-3xl p-8 text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6">
              <div>
                <h2 className="text-3xl font-extrabold mb-2">ATS Match Score</h2>
                <p className="text-indigo-200 mb-4 font-medium">Target Role: {res.role}</p>
                <span className={`px-4 py-1.5 rounded-full font-bold uppercase text-xs shadow-sm ${getBadgeColor(res.strength_level)}`}>
                  {res.strength_level} Candidate
                </span>
              </div>
              <div className="relative w-32 h-32 flex-shrink-0 flex items-center justify-center rounded-full border-8 border-indigo-400 bg-white/10 shadow-inner">
                <span className="text-4xl font-black">{res.ats_score}</span>
              </div>
            </div>

            {/* Academics */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 flex flex-col justify-center text-center">
              <h3 className="text-slate-500 font-bold mb-2 uppercase text-xs tracking-wider">Academic CGPA</h3>
              <p className="text-5xl font-black text-slate-800">{res.cgpa}</p>
              <p className="text-xs text-slate-400 mt-2 font-medium">Included in improvement metrics</p>
            </div>
          </div>

          {/* New ATS Score Breakdown Section */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-2">
              <div>
                <h3 className="text-xl font-bold text-slate-800">ATS Score Breakdown</h3>
                <p className="text-slate-500 text-sm font-semibold">Transparent breakdown based on professional criteria. Total score is the sum of these four components.</p>
              </div>
              <span className="px-3.5 py-1 bg-indigo-50 text-indigo-700 rounded-xl font-bold text-sm border border-indigo-100 flex-shrink-0">
                Sum: {res.ats_score} / 100
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Skills */}
              <div className="p-5 border border-slate-100 rounded-2xl bg-slate-50 hover:shadow-md transition">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-bold text-slate-800">🎯 Skills</span>
                  <span className="font-black text-indigo-600">{(res.section_scores?.Skills ?? 0)} <span className="text-xs text-slate-400">/ 40</span></span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div className="bg-indigo-600 h-full rounded-full transition-all duration-500" style={{ width: `${(((res.section_scores?.Skills ?? 0) / 40) * 100)}%` }}></div>
                </div>
                <p className="text-xs text-slate-400 mt-2 font-medium">Based on required JD keyword match ({res.match_percentage || 0}%)</p>
              </div>

              {/* Projects */}
              <div className="p-5 border border-slate-100 rounded-2xl bg-slate-50 hover:shadow-md transition">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-bold text-slate-800">🚀 Projects</span>
                  <span className="font-black text-indigo-600">{(res.section_scores?.Projects ?? 0)} <span className="text-xs text-slate-400">/ 25</span></span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div className="bg-indigo-600 h-full rounded-full transition-all duration-500" style={{ width: `${(((res.section_scores?.Projects ?? 0) / 25) * 100)}%` }}></div>
                </div>
                <p className="text-xs text-slate-400 mt-2 font-medium">Evaluated section layout & technical projects lines count</p>
              </div>

              {/* Experience */}
              <div className="p-5 border border-slate-100 rounded-2xl bg-slate-50 hover:shadow-md transition">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-bold text-slate-800">💼 Experience</span>
                  <span className="font-black text-indigo-600">{(res.section_scores?.Experience ?? 0)} <span className="text-xs text-slate-400">/ 20</span></span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div className="bg-indigo-600 h-full rounded-full transition-all duration-500" style={{ width: `${(((res.section_scores?.Experience ?? 0) / 20) * 100)}%` }}></div>
                </div>
                <p className="text-xs text-slate-400 mt-2 font-medium">Experience history minus weak bullets or styling errors</p>
              </div>

              {/* Education */}
              <div className="p-5 border border-slate-100 rounded-2xl bg-slate-50 hover:shadow-md transition">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-bold text-slate-800">🎓 Education</span>
                  <span className="font-black text-indigo-600">{(res.section_scores?.Education ?? 0)} <span className="text-xs text-slate-400">/ 15</span></span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div className="bg-indigo-600 h-full rounded-full transition-all duration-500" style={{ width: `${(((res.section_scores?.Education ?? 0) / 15) * 100)}%` }}></div>
                </div>
                <p className="text-xs text-slate-400 mt-2 font-medium">Education details & academic performance (CGPA: {res.cgpa})</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* ATS Score History Chart */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
              <h3 className="text-lg font-extrabold text-slate-800 mb-6">ATS Score Trend</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chronologicalHistory}>
                    <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="Score" stroke="#4f46e5" strokeWidth={3} activeDot={{ r: 8 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Section Scores Radar Chart */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
              <h3 className="text-lg font-extrabold text-slate-800 mb-6">Resume Section Strengths</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={chartData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="name" stroke="#64748b" fontSize={11} />
                    <PolarRadiusAxis stroke="#64748b" fontSize={11} domain={[0, 100]} />
                    <Radar name="Score" dataKey="score" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.5} />
                    <Tooltip formatter={(value, name, props) => {
                      if (props.payload.actual !== undefined) {
                        return [`${props.payload.actual} / ${props.payload.max} (${value}%)`, "Score"];
                      }
                      return [value, name];
                    }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Skill Gap Pie Chart */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
              <h3 className="text-lg font-extrabold text-slate-800 mb-6">Skill Gap Analysis</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Found', value: res.skills_found?.length || 0, fill: '#10b981' },
                        { name: 'Missing', value: res.missing_skills?.length || 0, fill: '#ef4444' }
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                    >
                      <Cell fill="#10b981" />
                      <Cell fill="#ef4444" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Missing Skills */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
              <h3 className="text-lg font-extrabold text-slate-800 mb-4 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> Missing Keywords
              </h3>
              <div className="flex flex-wrap gap-2">
                {res.missing_skills?.length > 0 ? res.missing_skills.map(s => (
                  <span key={s} className="px-3 py-1 bg-red-50 text-red-700 border border-red-100 rounded-lg text-sm font-semibold">{s}</span>
                )) : <span className="text-emerald-600 font-semibold text-sm">Perfect match! No keywords missing.</span>}
              </div>
            </div>

            {/* Found Skills */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
              <h3 className="text-lg font-extrabold text-slate-800 mb-4 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span> Found Keywords
              </h3>
              <div className="flex flex-wrap gap-2">
                {res.skills_found?.length > 0 ? res.skills_found.map(s => (
                  <span key={s} className="px-3 py-1 bg-green-50 text-green-700 border border-green-100 rounded-lg text-sm font-semibold">{s}</span>
                )) : <span className="text-slate-500 text-sm">No target keywords detected yet.</span>}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Section Scores Chart */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
              <h3 className="text-lg font-extrabold text-slate-800 mb-6">Section Layout Strengths</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} domain={[0, 100]} />
                    <Tooltip cursor={{fill: 'transparent'}} formatter={(value, name, props) => {
                      if (props.payload.actual !== undefined) {
                        return [`${props.payload.actual} / ${props.payload.max} (${value}%)`, "Score"];
                      }
                      return [value, name];
                    }} />
                    <Bar dataKey="score" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Suggestions */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
              <h3 className="text-lg font-extrabold text-slate-800 mb-4">Top Actionable Improvements</h3>
              <ul className="space-y-3">
                {res.suggestions?.map((sugg, i) => (
                  <li key={i} className="flex gap-3 text-slate-700">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs">{i+1}</span>
                    <span className="text-sm font-semibold">{sugg}</span>
                  </li>
                ))}
                {res.suggestions?.length === 0 && (
                  <p className="text-slate-500 text-sm italic">Amazing work! There are no improvements needed.</p>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'matching' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-3xl p-6 text-emerald-800 flex items-center gap-5 shadow-sm">
            <div className="text-4xl bg-white p-3 rounded-2xl shadow-sm">🏆</div>
            <div>
              <h3 className="font-black text-xl text-emerald-950">Career Best-Fit Recommendation</h3>
              <p className="font-semibold mt-1">Based on global keyword evaluation, your resume is a prime fit for: <span className="underline font-black text-emerald-950">{res.best_fit_role || 'Software Developer'}</span></p>
            </div>
          </div>

          {/* Role Match Comparison Chart */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-extrabold text-slate-800 mb-6">Role Match Comparison</h3>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={(res.role_matches || []).map(m => ({ role: m.role, score: m.score }))} margin={{ top: 5, right: 30, left: 200, bottom: 5 }}>
                  <XAxis type="number" domain={[0, 100]} stroke="#64748b" fontSize={12} />
                  <YAxis dataKey="role" type="category" stroke="#64748b" fontSize={11} width={180} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="score" fill="#4f46e5" name="Match %" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(res.role_matches || []).map(match => (
              <div key={match.role} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 hover:shadow-md transition">
                <div className="flex justify-between items-center pb-3 border-b border-slate-100 flex-wrap gap-2">
                  <h4 className="font-extrabold text-slate-800 text-lg">{match.role}</h4>
                  <span className={`px-3.5 py-1 rounded-full font-black text-xs uppercase shadow-sm ${match.score > 75 ? 'bg-green-100 text-green-800' : match.score > 50 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                    {match.score}% Match
                  </span>
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Required Keywords Found</h5>
                  <div className="flex flex-wrap gap-1.5">
                    {match.skills_found.length > 0 ? match.skills_found.map(s => (
                      <span key={s} className="px-2.5 py-0.5 bg-green-50 text-green-700 border border-green-100 rounded-md text-xs font-semibold">{s}</span>
                    )) : <span className="text-slate-400 text-xs italic">No matching keywords found</span>}
                  </div>
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Missing Skills per Role</h5>
                  <div className="flex flex-wrap gap-1.5">
                    {match.missing_skills.length > 0 ? match.missing_skills.map(s => (
                      <span key={s} className="px-2.5 py-0.5 bg-red-50 text-red-700 border border-red-100 rounded-md text-xs font-semibold">{s}</span>
                    )) : <span className="text-emerald-600 text-xs font-black">100% Skills Matched!</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'comparison' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="font-extrabold text-slate-800 text-lg">Self-Comparison Dashboard</h3>
              <p className="text-sm text-slate-500 font-semibold">Select a previous analysis version to compare with your current scores.</p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-bold text-slate-600 whitespace-nowrap">Compare with:</label>
              <select 
                value={compareWithId} 
                onChange={e => setCompareWithId(e.target.value)} 
                className="border border-slate-300 rounded-xl p-2.5 bg-white text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select previous...</option>
                {history.filter(item => item._id !== res._id).map(item => (
                  <option key={item._id} value={item._id}>
                    {item.role} ({new Date(item.createdAt).toLocaleDateString()} - Score: {item.ats_score})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedCompare ? (
            <div className="space-y-6">
              {/* Score improvement panels */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 text-white p-6 rounded-3xl shadow-md flex items-center justify-between">
                  <div>
                    <h4 className="text-indigo-200 text-xs uppercase font-extrabold tracking-wider">Score Progression</h4>
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-4xl font-black">{res.ats_score}</span>
                      <span className="text-sm text-indigo-200">vs {selectedCompare.ats_score} (Old)</span>
                    </div>
                  </div>
                  <div className={`p-3 rounded-2xl font-black text-sm uppercase ${comparisonStats.scoreDiff >= 0 ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                    {comparisonStats.scoreDiff >= 0 ? `+${comparisonStats.scoreDiff}` : comparisonStats.scoreDiff} Score
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-center text-center">
                  <h4 className="text-slate-500 text-xs uppercase font-extrabold tracking-wider mb-1">Keywords Added</h4>
                  <p className="text-3xl font-black text-green-600">{comparisonStats.skillsAdded.length}</p>
                  <p className="text-xs text-slate-400 font-semibold mt-1">Successfully inserted</p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-center text-center">
                  <h4 className="text-slate-500 text-xs uppercase font-extrabold tracking-wider mb-1">Suggestions Solved</h4>
                  <p className="text-3xl font-black text-indigo-600">{comparisonStats.suggestionsFixed.length}</p>
                  <p className="text-xs text-slate-400 font-semibold mt-1">Addressed and completed</p>
                </div>
              </div>

              {/* Grouped Bar Chart & Historical Score Line */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                  <h3 className="text-md font-extrabold text-slate-800 mb-6">Layout Comparison (Old vs. New)</h3>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={comparisonStats.sectionComparisonData}>
                        <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                        <YAxis stroke="#64748b" fontSize={12} domain={[0, 100]} />
                        <Tooltip formatter={(value, name, props) => {
                          const payload = props.payload;
                          if (name === 'Previous' && payload.prevActual !== undefined) {
                            return [`${payload.prevActual} / ${payload.max} (${value}%)`, name];
                          }
                          if (name === 'Current' && payload.currActual !== undefined) {
                            return [`${payload.currActual} / ${payload.max} (${value}%)`, name];
                          }
                          return [value, name];
                        }} />
                        <Legend />
                        <Bar dataKey="Previous" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Current" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                  <h3 className="text-md font-extrabold text-slate-800 mb-6">My Score Improvement Over Time</h3>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chronologicalHistory}>
                        <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                        <YAxis stroke="#64748b" fontSize={12} domain={[0, 100]} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="Score" stroke="#4f46e5" strokeWidth={3} activeDot={{ r: 8 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Detailed Delta List */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                  <h4 className="font-extrabold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span> Skills Added
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {comparisonStats.skillsAdded.map(s => (
                      <span key={s} className="px-2 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded-md text-xs font-semibold">{s}</span>
                    ))}
                    {comparisonStats.skillsAdded.length === 0 && (
                      <span className="text-slate-400 text-xs italic">No new skills added</span>
                    )}
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                  <h4 className="font-extrabold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> Skills Removed
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {comparisonStats.skillsRemoved.map(s => (
                      <span key={s} className="px-2 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded-md text-xs font-semibold">{s}</span>
                    ))}
                    {comparisonStats.skillsRemoved.length === 0 && (
                      <span className="text-slate-400 text-xs italic">No skills removed</span>
                    )}
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                  <h4 className="font-extrabold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span> Suggestions Fixed
                  </h4>
                  <ul className="space-y-1.5">
                    {comparisonStats.suggestionsFixed.map((s, i) => (
                      <li key={i} className="text-slate-700 text-xs font-bold flex gap-1.5 items-start">
                        <span className="text-green-600 font-extrabold">✓</span> {s}
                      </li>
                    ))}
                    {comparisonStats.suggestionsFixed.length === 0 && (
                      <span className="text-slate-400 text-xs italic">No previous suggestions fixed</span>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-3xl p-12 text-center text-slate-500 font-semibold shadow-inner">
              📁 Please upload more than one resume or select a previous analysis version from the dropdown menu to perform a self-comparison!
            </div>
          )}
        </div>
      )}

      {activeTab === 'interview' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
            <h3 className="text-xl font-extrabold text-slate-800 mb-4">Interview Prep Questions</h3>
            <p className="text-sm text-slate-500 mb-4">Use these questions to practice explaining the strongest projects and skills on your resume.</p>
            <div className="space-y-4">
              {res.interview_questions?.length > 0 ? res.interview_questions.map((question, idx) => (
                <div key={idx} className="rounded-2xl border border-slate-200 p-4 bg-slate-50">
                  <span className="text-slate-500 text-xs uppercase tracking-[0.2em] font-bold">Question {idx + 1}</span>
                  <p className="mt-2 text-slate-800 font-semibold">{question}</p>
                </div>
              )) : (
                <div className="rounded-2xl border border-slate-200 p-6 bg-slate-50 text-slate-500">No interview questions were generated for this resume yet.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Results;
