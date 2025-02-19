import React from "react";
import { Link, useNavigate } from "react-router-dom";
import homepageImage from "../assets/homepage.png";
import icon from "../assets/icon.png";
import "../styles/Home.css";

function Home() {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/login');
  };

  return (
    <div className="home">
      <div className="home__image-section">
        <img 
          src={homepageImage}
          alt="Split expenses illustration" 
          className="home__image"
        />
      </div>
      <div className="home__content">
        <img 
          src={icon} 
          alt="SplitEase icon" 
          className="home__icon"
        />
        <h1 className="home__title">Welcome to SplitEase</h1>
        <p className="home__description">Easily split your bills with friends and manage expenses.</p>
        <div className="home__buttons">
          <button onClick={handleGetStarted} className="home__button home__button--primary">
            Get Started
          </button>
          <Link to="/login" className="home__button home__button--secondary">
            Login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Home;