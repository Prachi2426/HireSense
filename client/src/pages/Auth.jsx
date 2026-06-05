import { useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Auth = () => {
  const [role, setRole] = useState('student'); // student or recruiter
  const [isLogin, setIsLogin] = useState(true);
  const [isForgot, setIsForgot] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      if (isForgot) {
        // Assume password field is used for 'newPassword' and name field is used for 'pin'
        const { data } = await axios.post(`http://localhost:5000/api/auth/forgot-password`, { email, pin: name, newPassword: password });
        alert(data.message);
        setIsForgot(false);
        setPassword('');
        setName('');
        return;
      }

      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const payload = isLogin ? { email, password } : { name, email, password, role };
      
      const { data } = await axios.post(`http://localhost:5000${endpoint}`, payload);
      login({ 
        token: data.token, 
        name: data.name, 
        role: data.role, 
        email: data.email, 
        _id: data._id, 
        github_username: data.github_username 
      });
      navigate(data.role === 'recruiter' ? '/recruiter' : '/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication error. Make sure Server is running.');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-16 bg-white p-8 border border-slate-200 rounded-2xl shadow-xl">
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold text-slate-900 mb-2">
          {isLogin ? `Login as ${role === 'recruiter' ? 'Recruiter' : 'Student'}` : `Sign up as ${role === 'recruiter' ? 'Recruiter' : 'Student'}`}
        </h1>
        <p className="text-sm text-slate-500">
          {role === 'recruiter'
            ? 'Recruiters can post jobs, add required skills, and manage applicants.'
            : 'Students can build resumes, search jobs, and apply.'}
        </p>
      </div>
      {/* Role Toggle */}
      <div className="flex gap-2 mb-6 pb-4 border-b border-slate-200">
        <button 
          onClick={() => setRole('student')}
          className={`flex-1 pb-3 font-bold text-sm ${role === 'student' ? 'text-indigo-600 border-b-2 border-indigo-600 -mb-4' : 'text-slate-400'}`}
        >
          👨‍🎓 Student
        </button>
        <button 
          onClick={() => setRole('recruiter')}
          className={`flex-1 pb-3 font-bold text-sm ${role === 'recruiter' ? 'text-indigo-600 border-b-2 border-indigo-600 -mb-4' : 'text-slate-400'}`}
        >
          💼 Recruiter
        </button>
      </div>

      {/* Login/Sign Up Toggle */}
      {!isForgot && (
        <div className="flex mb-8 pb-4 border-b border-slate-200">
          <button onClick={() => setIsLogin(true)} className={`flex-1 pb-4 -mb-[17px] text-center font-bold text-lg ${isLogin ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400'}`}>Login</button>
          <button onClick={() => setIsLogin(false)} className={`flex-1 pb-4 -mb-[17px] text-center font-bold text-lg ${!isLogin ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400'}`}>Sign Up</button>
        </div>
      )}
      
      {isForgot && (
        <div className="mb-6 flex items-center gap-4 border-b border-slate-200 pb-4">
          <button onClick={() => setIsForgot(false)} className="text-sm font-bold text-slate-500 hover:text-indigo-600">&larr; Back to Login</button>
          <span className="font-bold text-lg text-indigo-600">Reset Password</span>
        </div>
      )}
      
      {error && <div className="mb-4 text-red-600 bg-red-50 p-3 rounded-lg text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-5">
        {!isLogin && !isForgot && (
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name</label>
            <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition" />
          </div>
        )}
        {isForgot && (
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Verification PIN (Hint: 0000)</label>
            <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition" placeholder="Enter master PIN" />
          </div>
        )}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Email</label>
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">{isForgot ? 'New Password' : 'Password'}</label>
          <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition" />
        </div>
        
        {!isForgot && isLogin && (
          <div className="flex justify-end">
            <button type="button" onClick={() => {setIsForgot(true); setName(''); setPassword('');}} className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition">Forgot Password?</button>
          </div>
        )}

        <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg shadow transition">
          {isForgot ? 'Reset Password' : (isLogin ? 'Log In' : `Create ${role === 'recruiter' ? 'Recruiter' : 'Student'} Account`)}
        </button>
      </form>
    </div>
  );
};
export default Auth;
