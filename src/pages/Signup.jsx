import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import signupImage from "../assets/signup.png";
import "../styles/SignUp.css";

function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const auth = getAuth();

    try {
      await createUserWithEmailAndPassword(auth, email, password);
      alert("Account created successfully!");
      navigate("/login");
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div className="signup">
      <div className="signup__image-section">
        <img 
          src={signupImage} 
          alt="Sign up illustration" 
          className="signup__image"
        />
      </div>
      <div className="signup__content">
        <h1 className="signup__title">Create Account</h1>
        <p className="signup__subtitle">Join SplitEase and start managing expenses with friends</p>
        
        <form className="signup__form" onSubmit={handleSubmit}>
          <div className="signup__form-group">
            <input 
              type="text" 
              className="signup__input" 
              placeholder="Full Name"
              required 
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          
          <div className="signup__form-group">
            <input 
              type="email" 
              className="signup__input" 
              placeholder="Email Address"
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          
          <div className="signup__form-group">
            <input 
              type="password" 
              className="signup__input" 
              placeholder="Password"
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          
          <button type="submit" className="signup__button">
            Sign Up
          </button>
        </form>
        
        <p className="signup__login-text">
          Already have an account? <a href="/login" className="signup__login-link">Log In</a>
        </p>
      </div>
    </div>
  );
}

export default SignUp;
