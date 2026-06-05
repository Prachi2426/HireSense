import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('resumeIqUser');
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  const login = (userData) => {
    setUser({ ...userData, role: userData.role || 'student' });
    localStorage.setItem('resumeIqUser', JSON.stringify({ ...userData, role: userData.role || 'student' }));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('resumeIqUser');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
