import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, signInWithEmailAndPassword, setPersistence, browserLocalPersistence, browserSessionPersistence } from "firebase/auth";
import loginImage from "../assets/login.png";
import "../styles/Login.css";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const auth = getAuth();

    try {
      // Set persistence based on rememberMe checkbox
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      
      // Sign in user
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/dashboard"); // or wherever you want to redirect after login
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div className="login">
      <div className="login__image-section">
        <img 
          src={loginImage}
          alt="Login illustration" 
          className="login__image"
        />
      </div>
      <div className="login__content">
        <h1 className="login__title">Welcome Back</h1>
        <p className="login__subtitle">Log in to manage your shared expenses</p>
        
        <form className="login__form" onSubmit={handleSubmit}>
          <div className="login__form-group">
            <input 
              type="email" 
              className="login__input" 
              placeholder="Email Address"
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          
          <div className="login__form-group">
            <input 
              type="password" 
              className="login__input" 
              placeholder="Password"
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          
          <div className="login__form-group login__remember-me">
            <label className="login__checkbox-label">
              <input 
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="login__checkbox"
              />
              Remember me
            </label>
          </div>
          
          <button type="submit" className="login__button">
            Log In
          </button>
        </form>
        
        <p className="login__signup-text">
          Don't have an account? <a href="/signup" className="login__signup-link">Sign Up</a>
        </p>
      </div>
    </div>
  );
}

export default Login;