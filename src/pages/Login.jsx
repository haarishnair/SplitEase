import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getAuth, signInWithEmailAndPassword, setPersistence, browserLocalPersistence, browserSessionPersistence } from "firebase/auth";
import loginImage from "../assets/login.png";
import "../styles/Login.css";
import { auth } from '../firebase';

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Set persistence based on rememberMe checkbox
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      
      // Sign in user
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/dashboard"); // Redirect to dashboard page after successful login
    } catch (err) {
      console.error("Login error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
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
        <p className="login__subtitle">Please enter your details to sign in</p>
        
        {error && <div className="login__error">{error}</div>}
        
        <form className="login__form" onSubmit={handleSubmit}>
          <div className="login__form-group">
            <input 
              type="email" 
              className="login__input" 
              placeholder="Email"
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
          
          <button 
            type="submit" 
            className="login__button"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        
        <p className="login__signup-text">
          Don't have an account?{' '}
          <Link to="/signup" className="login__signup-link">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Login;