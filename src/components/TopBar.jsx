import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import icon from "../assets/icon.png";
import Notifications from './Notifications';
import '../styles/Navigation.css';
import { MdAccountBalance } from 'react-icons/md';

function Navigation() {
  const navigate = useNavigate();

  const handleNotificationClick = () => {
    navigate('/notifications');
  };

  return (
    <nav className="navigation">
      <Link to="/dashboard" className="navigation__brand">
        <img 
          src={icon} 
          alt="SplitEase icon" 
          className="navigation__icon"
        />
        <span className="navigation__title">SplitSmart</span>
      </Link>
      
      <div className="navigation__actions">
        <button 
          className="navigation__notification-btn"
          onClick={handleNotificationClick}
        >
          <Notifications />
        </button>
      </div>
    </nav>
  );
}

export default Navigation;