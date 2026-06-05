import { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LogOut, User } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link to="/" className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-500">
            HireSense
          </Link>
          
          <div className="flex items-center space-x-4">
                {user ? (
              <>
                {user.role === 'recruiter' ? (
                  <>
                    <Link to="/recruiter" className="text-slate-600 hover:text-indigo-600 font-medium">Dashboard</Link>
                  </>
                ) : (
                  <>
                    <Link to="/dashboard" className="text-slate-600 hover:text-indigo-600 font-medium">Dashboard</Link>
                    <Link to="/jobs" className="text-slate-600 hover:text-indigo-600 font-medium">Jobs</Link>
                    <Link to="/compare" className="text-slate-600 hover:text-indigo-600 font-medium">Compare</Link>
                  </>
                )}
                <Link to="/profile" className="flex items-center gap-2 bg-slate-100 hover:bg-indigo-50 px-3 py-1.5 rounded-full border border-slate-200 transition-colors">
                  <User size={18} className="text-slate-500" />
                  <span className="text-sm font-semibold text-slate-700">{user.name}</span>
                  <span className="text-xs text-slate-500 ml-1">({user.role})</span>
                </Link>
                <button onClick={handleLogout} className="text-slate-500 hover:text-red-500 transition">
                  <LogOut size={20} />
                </button>
              </>
            ) : (
              <>
                <Link to="/auth" className="text-slate-600 hover:text-indigo-600 font-medium px-4 py-2">Login</Link>
                <Link to="/auth" className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-5 py-2 rounded-lg shadow-sm transition">Sign Up</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
export default Navbar;
