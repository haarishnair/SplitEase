import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  getDocs,
  deleteDoc,
  setDoc,
  orderBy,
  startAt,
  endAt,
  getDoc
} from 'firebase/firestore';
import { MdDashboard, MdGroups, MdPeopleAlt, MdSearch, MdPersonAdd } from 'react-icons/md';
import Navigation from '../components/Navigation';
import '../styles/Friends.css';

function Friends() {
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [balances, setBalances] = useState({});
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddFriend, setShowAddFriend] = useState(false);

  const auth = getAuth();
  const db = getFirestore();
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'friends'),
      where('users', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const friendsData = [];
      for (const docSnapshot of snapshot.docs) {
        const friendId = docSnapshot.data().users.find(id => id !== user.uid);
        const friendDocRef = doc(db, 'users', friendId);
        const friendDocSnap = await getDoc(friendDocRef);
        
        // Get balance with this friend
        const balanceDoc = await getDoc(doc(db, 'balances', `${user.uid}_${friendId}`));
        const reverseBalanceDoc = await getDoc(doc(db, 'balances', `${friendId}_${user.uid}`));
        
        let balance = 0;
        if (balanceDoc.exists()) {
          balance = balanceDoc.data().amount;
        } else if (reverseBalanceDoc.exists()) {
          balance = -reverseBalanceDoc.data().amount;
        }

        if (friendDocSnap.exists()) {
          friendsData.push({
            id: docSnapshot.id,
            ...friendDocSnap.data(),
            balance: balance
          });
        }
      }
      setFriends(friendsData);
      setLoading(false);
    });

    const unsubscribeRequests = onSnapshot(
      query(collection(db, 'friendRequests'), where('to', '==', user.uid)),
      (snapshot) => {
        setFriendRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }
    );

    const unsubscribeBalances = onSnapshot(
      query(collection(db, 'balances'), where('users', 'array-contains', user.uid)),
      (snapshot) => {
        const balancesData = {};
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          const otherUser = data.users.find(id => id !== user.uid);
          balancesData[otherUser] = data.amount;
        });
        setBalances(balancesData);
      }
    );

    return () => {
      unsubscribe();
      unsubscribeRequests();
      unsubscribeBalances();
    };
  }, [user]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchEmail.trim()) return;

    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', searchEmail.toLowerCase()));
      const querySnapshot = await getDocs(q);
      
      const results = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(user => user.uid !== auth.currentUser.uid)
        .filter(user => !friends.some(friend => friend.id === user.id));

      setSearchResults(results);
      if (results.length === 0) {
        setError('No user found with that email');
      } else {
        setError('');
      }
    } catch (err) {
      console.error('Error searching for user:', err);
      setError('Error searching for user');
    }
  };

  const sendFriendRequest = async (toUser) => {
    try {
      await addDoc(collection(db, 'notifications'), {
        type: 'friendRequest',
        fromUserId: user.uid,
        fromUserEmail: user.email,
        toUserId: toUser.id,
        status: 'pending',
        createdAt: new Date()
      });

      setSearchResults([]);
      setSearchEmail('');
      setError('Friend request sent!');
    } catch (err) {
      console.error('Error sending friend request:', err);
      setError('Error sending friend request');
    }
  };

  const handleFriendRequest = async (request, accept) => {
    try {
      const requestRef = doc(db, 'friendRequests', request.id);
      if (accept) {
        await addDoc(collection(db, 'friendships'), {
          users: [user.uid, request.from],
          emails: [user.email, request.fromEmail],
          timestamp: new Date()
        });
        await addDoc(collection(db, 'balances'), {
          users: [user.uid, request.from],
          amount: 0,
          timestamp: new Date()
        });
      }
      await deleteDoc(requestRef);
    } catch (err) {
      setError(`Failed to ${accept ? 'accept' : 'reject'} friend request`);
    }
  };

  const removeFriend = async (friendId) => {
    try {
      const friendshipQuery = query(
        collection(db, 'friends'),
        where('users', 'array-contains', user.uid)
      );
      
      const querySnapshot = await getDocs(friendshipQuery);
      const friendshipDoc = querySnapshot.docs.find(doc => 
        doc.data().users.includes(friendId)
      );

      if (friendshipDoc) {
        await deleteDoc(doc(db, 'friends', friendshipDoc.id));
      }
    } catch (err) {
      console.error('Error removing friend:', err);
      setError('Error removing friend');
    }
  };

  return (
    <div className="layout">
      <Navigation />
      <main className="main-content">
        <div className="friends">
          <div className="friends__container">
            <section className="friends__search-section">
              <h2>Find Friends</h2>
              <form className="friends__search-form" onSubmit={handleSearch}>
                <div className="friends__search-input-container">
                  <MdSearch className="friends__search-icon" />
                  <input
                    type="email"
                    placeholder="Search by email"
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                    className="friends__search-input"
                  />
                </div>
                <button type="submit" className="friends__search-button">
                  Search
                </button>
              </form>

              {error && <div className="friends__message">{error}</div>}

              {searchResults.length > 0 && (
                <div className="friends__search-results">
                  {searchResults.map(result => (
                    <div key={result.id} className="friends__search-item">
                      <div className="friends__search-info">
                        <div className="friends__avatar">
                          {result.email[0].toUpperCase()}
                        </div>
                        <div className="friends__details">
                          <span className="friends__email">{result.email}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => sendFriendRequest(result)}
                        className="friends__add-button"
                      >
                        <MdPersonAdd />
                        <span>Add Friend</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="friends__list-section">
              <h2>Your Friends</h2>
              {loading ? (
                <div className="friends__loading">Loading...</div>
              ) : friends.length > 0 ? (
                <div className="friends__list">
                  {friends.map(friend => (
                    <div key={friend.id} className="friends__item">
                      <div className="friends__info">
                        <div className="friends__avatar">
                          {friend.displayName ? friend.displayName[0].toUpperCase() : 'U'}
                        </div>
                        <div className="friends__details">
                          <span className="friends__name">
                            {friend.displayName || friend.name || 'Unnamed User'}
                          </span>
                          <span className="friends__email">{friend.email}</span>
                          <span className={`friends__balance ${friend.balance > 0 ? 'positive' : friend.balance < 0 ? 'negative' : ''}`}>
                            {friend.balance > 0 
                              ? `Owes you RM${friend.balance.toFixed(2)}`
                              : friend.balance < 0
                                ? `You owe RM${Math.abs(friend.balance).toFixed(2)}`
                                : 'No outstanding balance'}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => removeFriend(friend.id)}
                        className="friends__remove-button"
                        title="Remove friend"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="friends__empty">
                  <div className="friends__empty-icon">
                    <MdPeopleAlt />
                  </div>
                  <h3>No friends yet</h3>
                  <p className="friends__empty-subtitle">
                    Search for friends using their email address
                  </p>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Friends;
