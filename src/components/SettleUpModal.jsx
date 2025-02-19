import React, { useState } from 'react';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore, 
  addDoc, 
  collection, 
  updateDoc,
  doc,
  serverTimestamp 
} from 'firebase/firestore';
import { MdClose, MdPayment } from 'react-icons/md';
import '../styles/SettleUpModal.css';

function SettleUpModal({ friend, balance, onClose }) {
  const [amount, setAmount] = useState(Math.abs(balance));
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const auth = getAuth();
  const db = getFirestore();
  const user = auth.currentUser;

  const handleSettle = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Create settlement transaction
      await addDoc(collection(db, 'transactions'), {
        from: user.uid,
        to: friend.id,
        amount: amount,
        type: 'settlement',
        note: note,
        timestamp: serverTimestamp()
      });

      // Update balance
      const balanceRef = doc(db, 'balances', `${user.uid}_${friend.id}`);
      await updateDoc(balanceRef, {
        amount: 0,
        lastSettled: serverTimestamp()
      });

      onClose();
    } catch (err) {
      setError('Failed to process settlement');
      console.error('Settlement error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settle-modal__overlay">
      <div className="settle-modal">
        <div className="settle-modal__header">
          <h2>Settle Up with {friend.email}</h2>
          <button 
            className="settle-modal__close"
            onClick={onClose}
          >
            <MdClose />
          </button>
        </div>

        <form onSubmit={handleSettle}>
          {error && (
            <div className="settle-modal__error">
              {error}
            </div>
          )}

          <div className="settle-modal__amount">
            <label>Settlement Amount</label>
            <div className="settle-modal__amount-input">
              <span>RM</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value))}
                min="0"
                step="0.01"
                required
              />
            </div>
          </div>

          <div className="settle-modal__note">
            <label>Note (optional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note"
            />
          </div>

          <div className="settle-modal__actions">
            <button 
              type="button" 
              className="settle-modal__button--secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="settle-modal__button--primary"
              disabled={loading}
            >
              {loading ? 'Processing...' : (
                <>
                  <MdPayment /> Settle Up
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SettleUpModal; 