import React, { useState, useEffect } from 'react';
import { getAuth, updateProfile } from 'firebase/auth';
import { doc, getDoc, updateDoc, getFirestore } from 'firebase/firestore';
import { MdEdit } from 'react-icons/md';
import Navigation from '../components/Navigation';
import '../styles/Profile.css';

function Profile() {
  const [displayName, setDisplayName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const auth = getAuth();
  const db = getFirestore();
  const user = auth.currentUser;

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Update Auth Profile
      await updateProfile(user, {
        displayName: displayName
      });

      // Update Firestore User Document
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        displayName: displayName
      });

      setSuccess('Profile updated successfully!');
      setIsEditing(false);
    } catch (err) {
      setError('Failed to update profile. Please try again.');
      console.error('Error updating profile:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="layout">
      <Navigation />
      <main className="main-content">
        <div className="profile">
          <div className="profile__container">
            <div className="profile__header">
              <h1>Profile Settings</h1>
            </div>

            <div className="profile__card">
              <div className="profile__avatar">
                {displayName ? displayName[0].toUpperCase() : user?.email[0].toUpperCase()}
              </div>

              <div className="profile__info">
                <div className="profile__field">
                  <label>Email</label>
                  <p>{user?.email}</p>
                </div>

                <div className="profile__field">
                  <label>Display Name</label>
                  {isEditing ? (
                    <form onSubmit={handleSubmit} className="profile__edit-form">
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Enter your name"
                        className="profile__input"
                      />
                      <div className="profile__actions">
                        <button 
                          type="submit" 
                          className="profile__save-btn"
                          disabled={loading}
                        >
                          {loading ? 'Saving...' : 'Save'}
                        </button>
                        <button 
                          type="button" 
                          className="profile__cancel-btn"
                          onClick={() => setIsEditing(false)}
                          disabled={loading}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="profile__display-name">
                      <p>{displayName || 'No name set'}</p>
                      <button 
                        className="profile__edit-btn"
                        onClick={() => setIsEditing(true)}
                      >
                        <MdEdit />
                        Edit
                      </button>
                    </div>
                  )}
                </div>

                {error && <div className="profile__error">{error}</div>}
                {success && <div className="profile__success">{success}</div>}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Profile; 