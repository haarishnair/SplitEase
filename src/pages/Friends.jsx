import React, { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  onSnapshot,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  addDoc,
  getDocs
} from 'firebase/firestore';
import { 
  MdPersonAdd, 
  MdCheck, 
  MdClose, 
  MdSearch,
  MdArrowUpward,
  MdArrowDownward
} from 'react-icons/md';
import '../styles/Friends.css';

function Friends() {
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [balances, setBalances] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const auth = getAuth();
  const db = getFirestore();
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;

    // Listen for friends list changes
    const unsubscribeFriends = onSnapshot(
      query(
        collection(db, 'friendships'),
        where('users', 'array-contains', user.uid)
      ),
      (snapshot) => {
        const friendsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setFriends(friendsData);
        setLoading(false);
      }
    );

    // Listen for friend requests
    const unsubscribeRequests = onSnapshot(
      query(
        collection(db, 'friendRequests'),
        where('to', '==', user.uid)
      ),
      (snapshot) => {
        const requestsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setFriendRequests(requestsData);
      }
    );

    // Fetch balances
    const unsubscribeBalances = onSnapshot(
      query(
        collection(db, 'balances'),
        where('users', 'array-contains', user.uid)
      ),
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
      unsubscribeFriends();
      unsubscribeRequests();
      unsubscribeBalances();
    };
  }, [user, db]);

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.trim().length < 3) {
      setSearchResults([]);
      return;
    }

    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '>=', query), where('email', '<=', query + '\uf8ff'));
      const snapshot = await getDocs(q);
      const results = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(user => user.id !== auth.currentUser.uid);
      setSearchResults(results);
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to search users');
    }
  };

  const sendFriendRequest = async (toUserId) => {
    try {
      await addDoc(collection(db, 'friendRequests'), {
        from: user.uid,
        to: toUserId,
        status: 'pending',
        timestamp: new Date()
      });
      setSearchQuery('');
      setSearchResults([]);
    } catch (err) {
      setError('Failed to send friend request');
    }
  };

  const handleFriendRequest = async (requestId, accept) => {
    try {
      const requestRef = doc(db, 'friendRequests', requestId);
      if (accept) {
        // Create friendship
        await addDoc(collection(db, 'friendships'), {
          users: [user.uid, requestId],
          timestamp: new Date()
        });
        // Initialize balance
        await addDoc(collection(db, 'balances'), {
          users: [user.uid, requestId],
          amount: 0,
          timestamp: new Date()
        });
      }
      // Delete request
      await updateDoc(requestRef, { status: accept ? 'accepted' : 'rejected' });
    } catch (err) {
      setError(`Failed to ${accept ? 'accept' : 'reject'} friend request`);
    }
  };

  return (
    <div className="friends">
      <div className="friends__header">
        <h1>Friends</h1>
        <button 
          className="friends__add-button"
          onClick={() => setShowAddFriend(true)}
        >
          <MdPersonAdd /> Add Friend
        </button>
      </div>

      {showAddFriend && (
        <div className="friends__search">
          <div className="friends__search-input">
            <MdSearch />
            <input
              type="text"
              placeholder="Search by email"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          {searchResults.length > 0 && (
            <div className="friends__search-results">
              {searchResults.map(user => (
                <div key={user.id} className="friends__search-item">
                  <div className="friends__search-info">
                    <span className="friends__search-email">{user.email}</span>
                  </div>
                  <button 
                    className="friends__search-add"
                    onClick={() => sendFriendRequest(user.id)}
                  >
                    <MdPersonAdd />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {friendRequests.length > 0 && (
        <div className="friends__requests">
          <h2>Friend Requests</h2>
          <div className="friends__requests-list">
            {friendRequests.map(request => (
              <div key={request.id} className="friends__request-item">
                <span>{request.fromEmail}</span>
                <div className="friends__request-actions">
                  <button 
                    className="friends__request-accept"
                    onClick={() => handleFriendRequest(request.id, true)}
                  >
                    <MdCheck />
                  </button>
                  <button 
                    className="friends__request-reject"
                    onClick={() => handleFriendRequest(request.id, false)}
                  >
                    <MdClose />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="friends__list">
        {friends.map(friend => {
          const balance = balances[friend.id] || 0;
          return (
            <div key={friend.id} className="friends__item">
              <div className="friends__item-info">
                <h3>{friend.email}</h3>
                <div className={`friends__item-balance ${balance > 0 ? 'positive' : balance < 0 ? 'negative' : ''}`}>
                  {balance > 0 ? (
                    <>
                      <MdArrowUpward />
                      <span>They owe you RM {Math.abs(balance)}</span>
                    </>
                  ) : balance < 0 ? (
                    <>
                      <MdArrowDownward />
                      <span>You owe RM {Math.abs(balance)}</span>
                    </>
                  ) : (
                    <span>All settled up!</span>
                  )}
                </div>
              </div>
              <button className="friends__item-settle">Settle Up</button>
            </div>
          );
        })}
      </div>

      {error && <div className="friends__error">{error}</div>}
    </div>
  );
}

export default Friends; 