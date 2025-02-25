import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { MdDashboard, MdGroups, MdPeopleAlt, MdPerson, MdLogout } from 'react-icons/md';
import { getAuth, signOut } from 'firebase/auth';
import '../styles/Navigation.css';

function Navigation() {
  const location = useLocation();
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

  const navItems = [
    {
      path: '/dashboard',
      icon: <MdDashboard className="nav-icon" />,
      label: 'Dashboard'
    },
    {
      path: '/groups',
      icon: <MdGroups className="nav-icon" />,
      label: 'Groups'
    },
    {
      path: '/friends',
      icon: <MdPeopleAlt className="nav-icon" />,
      label: 'Friends'
    },
    {
      path: '/profile',
      icon: <MdPerson className="nav-icon" />,
      label: 'Profile'
    }
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar__content">
        <h2>Navigation</h2>
        <nav className="sidebar__nav">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`sidebar__nav-item ${location.pathname === item.path ? 'active' : ''}`}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>
      <button className="navigation__signout" onClick={handleSignOut}>
        <MdLogout />
        <span>Sign Out</span>
      </button>
    </aside>
  );
}

export default Navigation;