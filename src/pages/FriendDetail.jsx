import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  collection, 
  query, 
  where, 
  onSnapshot,
  orderBy 
} from 'firebase/firestore';
import { MdArrowBack, MdPayment, MdHistory } from 'react-icons/md';
import TransactionHistory from '../components/TransactionHistory';
import SettleUpModal from '../components/SettleUpModal';
import '../styles/FriendDetail.css';

function FriendDetail() {
  const { friendId } = useParams();
  const navigate = useNavigate();
  const [friend, setFriend] = useState(null);
  const [balance, setBalance] = useState(0);
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const auth = getAuth();
  const db = getFirestore();
  const user = auth.currentUser;

  useEffect(() => {
    if (!user || !friendId) return;

    const fetchFriend = async () => {
      try {
        const friendDoc = await getDoc(doc(db, 'users', friendId));
        if (friendDoc.exists()) {
          setFriend({ id: friendDoc.id, ...friendDoc.data() });
        } else {
          setError('Friend not found');
        }
      } catch (err) {
        setError('Error loading friend details');
        console.error('Error:', err);
      }
    };

    // Listen for balance changes
    const balanceQuery = query(
      collection(db, 'balances'),
      where('users', 'array-contains', user.uid)
    );

    const unsubscribeBalance = onSnapshot(balanceQuery, (snapshot) => {
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.users.includes(friendId)) {
          setBalance(data.amount);
        }
      });
      setLoading(false);
    });

    fetchFriend();
    return () => unsubscribeBalance();
  }, [user, friendId, db]);

  if (loading) return <div className="friend-detail__loading">Loading...</div>;
  if (error) return <div className="friend-detail__error">{error}</div>;
  if (!friend) return null;

  return (
    <div className="friend-detail">
      <div className="friend-detail__header">
        <button 
          className="friend-detail__back"
          onClick={() => navigate('/friends')}
        >
          <MdArrowBack /> Back to Friends
        </button>
        <button 
          className="friend-detail__settle"
          onClick={() => setShowSettleModal(true)}
        >
          <MdPayment /> Settle Up
        </button>
      </div>

      <div className="friend-detail__content">
        <div className="friend-detail__info">
          <h1>{friend.email}</h1>
          <div className={`friend-detail__balance ${balance > 0 ? 'positive' : balance < 0 ? 'negative' : ''}`}>
            {balance > 0 ? (
              <span>They owe you RM {Math.abs(balance)}</span>
            ) : balance < 0 ? (
              <span>You owe RM {Math.abs(balance)}</span>
            ) : (
              <span>All settled up!</span>
            )}
          </div>
        </div>

        <div className="friend-detail__history">
          <div className="friend-detail__history-header">
            <h2><MdHistory /> Transaction History</h2>
          </div>
          <TransactionHistory friendId={friendId} />
        </div>
      </div>

      {showSettleModal && (
        <SettleUpModal
          friend={friend}
          balance={balance}
          onClose={() => setShowSettleModal(false)}
        />
      )}
    </div>
  );
}

export default FriendDetail; 