import React, { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  updateDoc,
  doc 
} from 'firebase/firestore';
import { MdNotifications, MdClose } from 'react-icons/md';
import { format } from 'date-fns';
import '../styles/Notifications.css';

function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const auth = getAuth();
  const db = getFirestore();
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notificationsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate()
      }));
      
      setNotifications(notificationsData);
      setUnreadCount(notificationsData.filter(n => !n.read).length);
    });

    return () => unsubscribe();
  }, [user, db]);

  const markAsRead = async (notificationId) => {
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await updateDoc(notificationRef, {
        read: true
      });
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const promises = notifications
        .filter(n => !n.read)
        .map(n => markAsRead(n.id));
      await Promise.all(promises);
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  return (
    <div className="notifications">
      <button 
        className="notifications__toggle"
        onClick={() => setShowNotifications(!showNotifications)}
      >
        <MdNotifications />
        {unreadCount > 0 && (
          <span className="notifications__badge">{unreadCount}</span>
        )}
      </button>

      {showNotifications && (
        <div className="notifications__panel">
          <div className="notifications__header">
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <button 
                className="notifications__mark-all"
                onClick={markAllAsRead}
              >
                Mark all as read
              </button>
            )}
            <button 
              className="notifications__close"
              onClick={() => setShowNotifications(false)}
            >
              <MdClose />
            </button>
          </div>

          <div className="notifications__list">
            {notifications.length === 0 ? (
              <div className="notifications__empty">
                No notifications
              </div>
            ) : (
              notifications.map(notification => (
                <div 
                  key={notification.id}
                  className={`notifications__item ${!notification.read ? 'unread' : ''}`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="notifications__content">
                    <p>{notification.message}</p>
                    <span className="notifications__time">
                      {format(notification.timestamp, 'MMM d, h:mm a')}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Notifications; 