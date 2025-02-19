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
  onSnapshot 
} from 'firebase/firestore';
import { MdArrowBack, MdAdd, MdPerson, MdAttachMoney } from 'react-icons/md';
import '../styles/GroupDetail.css';

function GroupDetail() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const auth = getAuth();
  const db = getFirestore();

  useEffect(() => {
    const fetchGroup = async () => {
      try {
        const groupDoc = await getDoc(doc(db, 'groups', groupId));
        if (groupDoc.exists()) {
          setGroup({ id: groupDoc.id, ...groupDoc.data() });
        } else {
          setError('Group not found');
        }
      } catch (err) {
        setError('Error loading group');
        console.error('Error:', err);
      }
    };

    const unsubscribe = onSnapshot(
      query(collection(db, 'expenses'), where('groupId', '==', groupId)),
      (snapshot) => {
        const expensesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setExpenses(expensesData);
        setLoading(false);
      },
      (err) => {
        setError('Error loading expenses');
        console.error('Error:', err);
        setLoading(false);
      }
    );

    fetchGroup();
    return () => unsubscribe();
  }, [groupId, db]);

  if (loading) return <div className="group-detail__loading">Loading...</div>;
  if (error) return <div className="group-detail__error">{error}</div>;
  if (!group) return null;

  return (
    <div className="group-detail">
      <div className="group-detail__header">
        <button 
          className="group-detail__back" 
          onClick={() => navigate('/groups')}
        >
          <MdArrowBack /> Back to Groups
        </button>
        <button className="group-detail__add-expense">
          <MdAdd /> Add Expense
        </button>
      </div>

      <div className="group-detail__content">
        <div className="group-detail__info">
          <h1 className="group-detail__title">{group.name}</h1>
          <p className="group-detail__description">{group.description}</p>
          
          <div className="group-detail__stats">
            <div className="group-detail__stat">
              <MdPerson />
              <span>{group.members.length} members</span>
            </div>
            <div className="group-detail__stat">
              <MdAttachMoney />
              <span>Total: RM {group.totalExpenses || 0}</span>
            </div>
          </div>
        </div>

        <div className="group-detail__expenses">
          <h2>Expenses</h2>
          {expenses.length === 0 ? (
            <div className="group-detail__empty">
              No expenses yet. Add your first expense!
            </div>
          ) : (
            <div className="group-detail__expenses-list">
              {expenses.map(expense => (
                <div key={expense.id} className="group-detail__expense-item">
                  <div className="group-detail__expense-info">
                    <h3>{expense.description}</h3>
                    <p>Paid by: {expense.paidBy}</p>
                  </div>
                  <div className="group-detail__expense-amount">
                    RM {expense.amount}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default GroupDetail; 