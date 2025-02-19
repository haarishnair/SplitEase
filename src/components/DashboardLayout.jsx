import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { getAuth, signOut } from 'firebase/auth';
import { MdDashboard, MdGroups, MdPerson, MdLogout } from 'react-icons/md';
import '../styles/DashboardLayout.css';

function DashboardLayout({ children }) {
  const navigate = useNavigate();
  const auth = getAuth();

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="dashboard-layout">
      <div className="dashboard__sidebar">
        <div className="dashboard__nav">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `dashboard__nav-item ${isActive ? 'dashboard__nav-item--active' : ''}`
            }
          >
            <MdDashboard className="dashboard__nav-icon" />
            <span>Dashboard</span>
          </NavLink>
          <NavLink
            to="/groups"
            className={({ isActive }) =>
              `dashboard__nav-item ${isActive ? 'dashboard__nav-item--active' : ''}`
            }
          >
            <MdGroups className="dashboard__nav-icon" />
            <span>Groups</span>
          </NavLink>
          <NavLink
            to="/friends"
            className={({ isActive }) =>
              `dashboard__nav-item ${isActive ? 'dashboard__nav-item--active' : ''}`
            }
          >
            <MdPerson className="dashboard__nav-icon" />
            <span>Friends</span>
          </NavLink>
        </div>

        <button className="dashboard__nav-item dashboard__signout" onClick={handleSignOut}>
          <MdLogout className="dashboard__nav-icon" />
          <span>Sign Out</span>
        </button>
      </div>
      
      <main className="dashboard-layout__main">
        {children}
      </main>
    </div>
  );
}

export default DashboardLayout; 