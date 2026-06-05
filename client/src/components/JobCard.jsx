import React from 'react';

const JobCard = ({ job, onApply, onSave, onUndoApply, isApplied, isSaved }) => {
  return (
    <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-extrabold text-slate-800">{job.title}</h4>
          <p className="text-sm text-slate-500">{job.company} • {job.location}</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => onSave(job._id)} 
            disabled={isApplied || isSaved}
            className={`text-sm px-3 py-1 rounded-lg transition-colors ${isSaved ? 'bg-indigo-100 text-indigo-700 font-medium' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
          >
            {isSaved ? 'Saved' : 'Save'}
          </button>
          <button 
            onClick={() => isApplied ? onUndoApply(job._id) : onApply(job._id)} 
            className={`text-sm px-3 py-1 rounded-lg transition-colors ${isApplied ? 'bg-green-100 hover:bg-red-100 text-green-700 hover:text-red-700 font-medium' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
          >
            {isApplied ? 'Applied (Undo)' : 'Apply'}
          </button>
        </div>
      </div>
      <p className="mt-3 text-sm text-slate-600">{job.description?.slice(0, 200)}{job.description && job.description.length > 200 ? '...' : ''}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {(job.requirements || []).slice(0,5).map(req => (
          <span key={req} className="px-2 py-0.5 bg-slate-50 text-slate-700 border border-slate-100 rounded-md text-xs">{req}</span>
        ))}
      </div>
    </div>
  );
};

export default JobCard;
