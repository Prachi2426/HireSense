import { Link } from 'react-router-dom';

const Landing = () => (
  <div className="w-full flex flex-col items-center justify-center py-20 px-4 text-center">
    <div className="bg-white p-12 rounded-3xl shadow-xl border border-slate-100 max-w-3xl">
      <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 mb-6 tracking-tight">
        HireSense: <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-500">Smart Resumes. Stronger Careers.</span>
      </h1>
      <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
        Analyze your resume like top recruiters. Beat the ATS, identify missing skills, and instantly optimize your profile to land your dream job.
      </p>
      <div className="flex flex-col sm:flex-row justify-center gap-4">
        <Link to="/auth" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-8 rounded-xl shadow-lg hover:shadow-indigo-500/30 transition duration-300 text-lg">
          Start Free Analysis
        </Link>
        <Link to="/auth" className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-4 px-8 rounded-xl shadow-sm transition duration-300 text-lg">
          Log In
        </Link>
      </div>
    </div>
  </div>
);

export default Landing;
