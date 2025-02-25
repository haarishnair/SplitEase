import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  addDoc
} from 'firebase/firestore';
import { MdNotifications, MdClose } from 'react-icons/md';
import '../styles/Notifications.css';

function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const notificationRef = useRef(null);

  useEffect(() => {
    const user = auth.currentUser;
    
    if (!user) {
      setLoading(false);
      return;
    }

    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('toUserId', '==', user.uid),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      const newNotifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setNotifications(newNotifications);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleNotificationClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDropdown(!showDropdown);
  };

  const handleClose = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDropdown(false);
  };

  const handleNotificationItemClick = (e) => {
    e.stopPropagation(); // Prevent event from bubbling up
  };

  const handleAccept = async (notification) => {
    try {
      const notificationRef = doc(db, 'notifications', notification.id);
      
      if (notification.type === 'friendRequest') {
        const friendsRef = collection(db, 'friends');
        await addDoc(friendsRef, {
          users: [auth.currentUser.uid, notification.fromUserId],
          createdAt: new Date()
        });
      }
      
      await updateDoc(notificationRef, {
        status: 'accepted'
      });
    } catch (error) {
      console.error('Error accepting notification:', error);
    }
  };

  const handleReject = async (notificationId) => {
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await deleteDoc(notificationRef);
    } catch (error) {
      console.error('Error rejecting notification:', error);
    }
  };

  return (
    <div className="notifications" ref={notificationRef}>
      <div 
        className="notifications__icon-wrapper"
        onClick={handleNotificationClick}
      >
        <MdNotifications className="notifications__icon" />
        {notifications.length > 0 && (
          <span className="notification-badge"></span>
        )}
      </div>

      {showDropdown && (
        <div className="notifications__dropdown" onClick={handleNotificationItemClick}>
          <div className="notifications__header">
            <h3>Notifications</h3>
            <button 
              className="notifications__close"
              onClick={handleClose}
            >
              <MdClose />
            </button>
          </div>
          {loading ? (
            <div className="notifications__loading">Loading...</div>
          ) : notifications.length > 0 ? (
            <div className="notifications__list">
              {notifications.map(notification => (
                <div key={notification.id} className="notification__item">
                  <div className="notification__content">
                    <p className="notification__text">
                      {notification.type === 'friendRequest' 
                        ? `${notification.fromUserEmail} sent you a friend request`
                        : `${notification.fromUserEmail} invited you to join ${notification.groupName}`
                      }
                    </p>
                    <div className="notification__actions">
                      <button 
                        onClick={() => handleAccept(notification)}
                        className="notification__accept"
                      >
                        Accept
                      </button>
                      <button 
                        onClick={() => handleReject(notification.id)}
                        className="notification__reject"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="notifications__empty">
              No new notifications
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Notifications; 