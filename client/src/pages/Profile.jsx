import { useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const Profile = () => {
  const { user, login } = useContext(AuthContext);
  
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    github_username: user?.github_username || ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [profileMsg, setProfileMsg] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        github_username: user.github_username || ''
      });
    }
  }, [user]);

  const handleProfileChange = (e) => {
    setProfileData({ ...profileData, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = (e) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  };

  const submitProfile = async (e) => {
    e.preventDefault();
    setProfileMsg('');
    try {
      const { data } = await axios.put('http://localhost:5000/api/auth/profile', profileData, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      // Update local context
      login({ ...user, ...data });
      setProfileMsg('Profile updated successfully');
    } catch (error) {
      setProfileMsg(error.response?.data?.message || 'Failed to update profile');
    }
  };

  const submitPassword = async (e) => {
    e.preventDefault();
    setPasswordMsg('');
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      return setPasswordMsg('New passwords do not match');
    }
    try {
      const { data } = await axios.put('http://localhost:5000/api/auth/password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      }, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setPasswordMsg(data.message);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      setPasswordMsg(error.response?.data?.message || 'Failed to update password');
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 sm:px-6">
      <h1 className="text-3xl font-extrabold text-slate-900 mb-8">My Profile</h1>
      
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-100 shadow-sm mb-8">
        <h2 className="text-xl font-bold text-slate-800 mb-6">Personal Information</h2>
        {profileMsg && <p className={`mb-4 text-sm ${profileMsg.includes('success') ? 'text-green-600' : 'text-red-600'}`}>{profileMsg}</p>}
        <form onSubmit={submitProfile} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">Email</label>
              <input type="email" name="email" value={profileData.email} onChange={handleProfileChange} required className="mt-1 block w-full rounded-xl border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-4 py-3" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Full Name</label>
              <input type="text" name="name" value={profileData.name} onChange={handleProfileChange} required className="mt-1 block w-full rounded-xl border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-4 py-3" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">GitHub Username</label>
            <input type="text" name="github_username" value={profileData.github_username} onChange={handleProfileChange} placeholder="e.g. octocat" className="mt-1 block w-full rounded-xl border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-4 py-3" />
          </div>
          <div className="flex justify-end">
            <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-6 rounded-xl transition-colors shadow-sm">
              Save Changes
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-100 shadow-sm">
        <h2 className="text-xl font-bold text-slate-800 mb-6">Security</h2>
        {passwordMsg && <p className={`mb-4 text-sm ${passwordMsg.includes('success') ? 'text-green-600' : 'text-red-600'}`}>{passwordMsg}</p>}
        <form onSubmit={submitPassword} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700">Current Password</label>
            <input type="password" name="currentPassword" value={passwordData.currentPassword} onChange={handlePasswordChange} required className="mt-1 block w-full rounded-xl border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-4 py-3" />
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">New Password</label>
              <input type="password" name="newPassword" value={passwordData.newPassword} onChange={handlePasswordChange} required className="mt-1 block w-full rounded-xl border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-4 py-3" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Confirm New Password</label>
              <input type="password" name="confirmPassword" value={passwordData.confirmPassword} onChange={handlePasswordChange} required className="mt-1 block w-full rounded-xl border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-4 py-3" />
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" className="bg-slate-800 hover:bg-slate-900 text-white font-semibold py-2 px-6 rounded-xl transition-colors shadow-sm">
              Update Password
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Profile;
