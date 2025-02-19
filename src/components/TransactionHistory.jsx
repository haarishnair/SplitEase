import React, { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  limit 
} from 'firebase/firestore';
import { format } from 'date-fns';
import { MdPayment, MdArrowUpward, MdArrowDownward } from 'react-icons/md';
import '../styles/TransactionHistory.css';

function TransactionHistory({ friendId }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const auth = getAuth();
  const db = getFirestore();
  const user = auth.currentUser;

  useEffect(() => {
    if (!user || !friendId) return;

    const q = query(
      collection(db, 'transactions'),
      where('users', 'array-contains', user.uid),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      try {
        const transactionsData = snapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp?.toDate()
          }))
          .filter(transaction => 
            transaction.from === friendId || 
            transaction.to === friendId
          );
        setTransactions(transactionsData);
        setLoading(false);
      } catch (err) {
        setError('Error loading transactions');
        console.error('Transaction error:', err);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [user, friendId, db]);

  if (loading) return <div className="transaction-history__loading">Loading transactions...</div>;
  if (error) return <div className="transaction-history__error">{error}</div>;

  return (
    <div className="transaction-history">
      {transactions.length === 0 ? (
        <div className="transaction-history__empty">
          No transactions yet
        </div>
      ) : (
        <div className="transaction-history__list">
          {transactions.map(transaction => {
            const isIncoming = transaction.to === user.uid;
            return (
              <div key={transaction.id} className="transaction-history__item">
                <div className="transaction-history__icon">
                  {transaction.type === 'settlement' ? (
                    <MdPayment className="settlement" />
                  ) : isIncoming ? (
                    <MdArrowDownward className="incoming" />
                  ) : (
                    <MdArrowUpward className="outgoing" />
                  )}
                </div>
                <div className="transaction-history__details">
                  <div className="transaction-history__main">
                    <span className="transaction-history__type">
                      {transaction.type === 'settlement' ? 'Settlement' : 'Expense'}
                    </span>
                    <span className={`transaction-history__amount ${isIncoming ? 'incoming' : 'outgoing'}`}>
                      RM {transaction.amount}
                    </span>
                  </div>
                  <div className="transaction-history__sub">
                    <span className="transaction-history__note">
                      {transaction.note || 'No note'}
                    </span>
                    <span className="transaction-history__date">
                      {format(transaction.timestamp, 'MMM d, yyyy')}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default TransactionHistory; 