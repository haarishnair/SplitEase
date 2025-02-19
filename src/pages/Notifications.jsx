import React, { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  getFirestore,
  Timestamp 
} from 'firebase/firestore';
import { MdNotifications, MdArrowBack } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import '../styles/Notifications.css';

function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const auth = getAuth();
  const db = getFirestore();
  const navigate = useNavigate();

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      const notificationsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setNotifications(notificationsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth, db]);

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      const hours = Math.floor(diffTime / (1000 * 60 * 60));
      if (hours === 0) {
        const minutes = Math.floor(diffTime / (1000 * 60));
        return `${minutes} minutes ago`;
      }
      return `${hours} hours ago`;
    }
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const handleBack = () => {
    navigate(-1);
  };

  if (loading) {
    return <div className="notifications__loading">Loading...</div>;
  }

  return (
    <div className="notifications-page">
      <div className="notifications-page__header">
        <button 
          className="notifications-page__back" 
          onClick={handleBack}
        >
          <MdArrowBack />
          <span>Back</span>
        </button>
        <h1>Notifications</h1>
      </div>

      <div className="notifications-page__content">
        {notifications.length === 0 ? (
          <div className="notifications-page__empty">
            <MdNotifications className="notifications-page__empty-icon" />
            <p>No notifications yet</p>
          </div>
        ) : (
          <div className="notifications-page__list">
            {notifications.map((notification) => (
              <div 
                key={notification.id} 
                className={`notifications-page__item ${
                  notification.read ? '' : 'notifications-page__item--unread'
                }`}
              >
                <div className="notifications-page__item-content">
                  <p className="notifications-page__item-text">
                    {notification.message}
                  </p>
                  <span className="notifications-page__item-time">
                    {formatDate(notification.timestamp)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Notifications;