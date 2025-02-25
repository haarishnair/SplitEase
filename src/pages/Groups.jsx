import React, { useState, useEffect } from "react";
import { getAuth } from "firebase/auth";
import { 
  collection, 
  query, 
  where, 
  onSnapshot,
  addDoc,
  getFirestore,
  serverTimestamp,
  doc,
  updateDoc,
  runTransaction,
  getDocs,
  orderBy
} from "firebase/firestore";
import { Link, useNavigate } from 'react-router-dom';
import { MdAdd, MdGroup, MdHome, MdFlight, MdRestaurant, MdClose, MdPersonAdd, MdAddCircle, MdPerson, MdDashboard, MdGroups, MdPeopleAlt } from "react-icons/md";
import "../styles/Groups.css";
import Navigation from '../components/Navigation';

function Groups() {
  const [groups, setGroups] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [expenseDetails, setExpenseDetails] = useState({
    amount: '',
    description: '',
    splitType: 'equal', // equal, percentage, exact, shares
    splitDetails: {},
    paidBy: '',
    date: new Date().toISOString().split('T')[0]
  });

  const auth = getAuth();
  const db = getFirestore();
  const user = auth.currentUser;
  const navigate = useNavigate();

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const q = query(
        collection(db, 'groups'),
        where('members', 'array-contains', user.uid)
      );
      const querySnapshot = await getDocs(q);
      const groupsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setGroups(groupsData);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching groups:', err);
      setError('Failed to load groups');
      setLoading(false);
    }
  };

  const groupIcons = {
    home: MdHome,
    travel: MdFlight,
    food: MdRestaurant,
    other: MdGroup
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    try {
      const groupRef = await addDoc(collection(db, 'groups'), {
        name: newGroupName.trim(),
        members: [user.uid],
        memberEmails: { [user.uid]: user.email },
        createdAt: new Date(),
        createdBy: user.uid
      });

      setShowCreateModal(false);
      setNewGroupName('');
      navigate(`/groups/${groupRef.id}`);
    } catch (err) {
      console.error('Error creating group:', err);
      setError('Failed to create group');
    }
  };

  const handleGroupClick = (groupId) => {
    navigate(`/groups/${groupId}`);
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!selectedGroup) return;

    try {
      const expenseRef = await addDoc(collection(db, 'expenses'), {
        groupId: selectedGroup.id,
        amount: parseFloat(expenseDetails.amount),
        description: expenseDetails.description,
        splitType: expenseDetails.splitType,
        splitDetails: expenseDetails.splitDetails,
        paidBy: expenseDetails.paidBy,
        date: new Date(expenseDetails.date),
        participants: selectedGroup.members,
        createdBy: user.uid,
        timestamp: new Date()
      });

      // Calculate individual shares based on split type
      const shares = calculateShares(expenseDetails, selectedGroup.members);
      
      // Update balances for all group members
      await updateGroupBalances(selectedGroup.id, shares, expenseDetails.paidBy);

      setShowExpenseForm(false);
      setExpenseDetails({
        amount: '',
        description: '',
        splitType: 'equal',
        splitDetails: {},
        paidBy: '',
        date: new Date().toISOString().split('T')[0]
      });
      setSelectedGroup(null);
    } catch (err) {
      setError('Failed to add expense');
      console.error(err);
    }
  };

  const calculateShares = (details, members) => {
    const amount = parseFloat(details.amount);
    const shares = {};
    
    switch (details.splitType) {
      case 'equal':
        const equalShare = amount / members.length;
        members.forEach(memberId => {
          shares[memberId] = equalShare;
        });
        break;
        
      case 'percentage':
        members.forEach(memberId => {
          const percentage = details.splitDetails[memberId] || 0;
          shares[memberId] = (amount * percentage) / 100;
        });
        break;
        
      case 'exact':
        members.forEach(memberId => {
          shares[memberId] = details.splitDetails[memberId] || 0;
        });
        break;
        
      case 'shares':
        const totalShares = Object.values(details.splitDetails).reduce((a, b) => a + b, 0);
        members.forEach(memberId => {
          const memberShares = details.splitDetails[memberId] || 0;
          shares[memberId] = (amount * memberShares) / totalShares;
        });
        break;
    }
    
    return shares;
  };

  const updateGroupBalances = async (groupId, shares, paidBy) => {
    const balanceRef = doc(db, 'groupBalances', groupId);
    
    try {
      await runTransaction(db, async (transaction) => {
        const balanceDoc = await transaction.get(balanceRef);
        let balances = balanceDoc.exists() ? balanceDoc.data().balances : {};

        // Initialize balances if they don't exist
        Object.keys(shares).forEach(memberId => {
          if (!balances[memberId]) balances[memberId] = 0;
        });

        // Update balances based on shares
        Object.entries(shares).forEach(([memberId, amount]) => {
          if (memberId === paidBy) {
            balances[memberId] += parseFloat(amount);
          } else {
            balances[memberId] -= parseFloat(amount);
          }
        });

        transaction.set(balanceRef, { balances }, { merge: true });
      });
    } catch (err) {
      console.error('Error updating balances:', err);
      throw err;
    }
  };

  return (
    <div className="layout">
      <Navigation />
      <main className="main-content">
        <div className="groups">
          <div className="groups__header">
            <h1>Your Groups</h1>
            <button className="groups__add-button" onClick={() => setShowCreateModal(true)}>
              <MdAdd />
              Create Group
            </button>
          </div>

          {error && <div className="groups__error">{error}</div>}

          {loading ? (
            <div className="groups__loading">Loading...</div>
          ) : groups.length > 0 ? (
            <div className="groups__grid">
              {groups.map(group => (
                <Link
                  to={`/groups/${group.id}`}
                  key={group.id}
                  className="group-card"
                >
                  <div className="group-card__icon">
                    <MdGroup />
                  </div>
                  <div className="group-card__content">
                    <h3 className="group-card__title">{group.name}</h3>
                    <p className="group-card__members">
                      {group.memberEmails ? Object.keys(group.memberEmails).length : 0} members
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="groups__empty">
              <div className="groups__empty-icon">
                <MdGroups />
              </div>
              <h2>No Groups Yet</h2>
              <p>Create a group to start splitting expenses with friends</p>
              <button className="groups__add-button" onClick={() => setShowCreateModal(true)}>
                <MdAdd />
                Create Your First Group
              </button>
            </div>
          )}

          {showCreateModal && (
            <div className="modal">
              <div className="modal__content">
                <h2>Create New Group</h2>
                <form onSubmit={handleCreateGroup}>
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="Group name"
                    required
                  />
                  <div className="modal__actions">
                    <button type="submit">Create</button>
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {showExpenseForm && selectedGroup && (
            <div className="expense-form-overlay">
              <div className="expense-form">
                <h2>Add Expense in {selectedGroup.name}</h2>
                <form onSubmit={handleAddExpense}>
                  <div className="form-group">
                    <label>Amount (RM)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={expenseDetails.amount}
                      onChange={(e) => setExpenseDetails({
                        ...expenseDetails,
                        amount: e.target.value
                      })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Description</label>
                    <input
                      type="text"
                      value={expenseDetails.description}
                      onChange={(e) => setExpenseDetails({
                        ...expenseDetails,
                        description: e.target.value
                      })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Paid By</label>
                    <select
                      value={expenseDetails.paidBy}
                      onChange={(e) => setExpenseDetails({
                        ...expenseDetails,
                        paidBy: e.target.value
                      })}
                      required
                    >
                      <option value="">Select who paid</option>
                      {selectedGroup.members.map(memberId => (
                        <option key={memberId} value={memberId}>
                          {memberId === user.uid ? 'You' : selectedGroup.memberEmails[memberId]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Split Type</label>
                    <select
                      value={expenseDetails.splitType}
                      onChange={(e) => setExpenseDetails({
                        ...expenseDetails,
                        splitType: e.target.value,
                        splitDetails: {}
                      })}
                    >
                      <option value="equal">Split Equally</option>
                      <option value="percentage">Split by Percentage</option>
                      <option value="exact">Split by Exact Amount</option>
                      <option value="shares">Split by Shares</option>
                    </select>
                  </div>

                  {expenseDetails.splitType !== 'equal' && (
                    <div className="form-group split-details">
                      {selectedGroup.members.map(memberId => (
                        <div key={memberId} className="split-member">
                          <label>
                            {memberId === user.uid ? 'You' : selectedGroup.memberEmails[memberId]}
                          </label>
                          <input
                            type={expenseDetails.splitType === 'exact' ? 'number' : 'text'}
                            step={expenseDetails.splitType === 'exact' ? '0.01' : undefined}
                            value={expenseDetails.splitDetails[memberId] || ''}
                            onChange={(e) => setExpenseDetails({
                              ...expenseDetails,
                              splitDetails: {
                                ...expenseDetails.splitDetails,
                                [memberId]: parseFloat(e.target.value) || 0
                              }
                            })}
                            placeholder={
                              expenseDetails.splitType === 'percentage' ? '%' :
                              expenseDetails.splitType === 'exact' ? 'RM' :
                              'shares'
                            }
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="form-group">
                    <label>Date</label>
                    <input
                      type="date"
                      value={expenseDetails.date}
                      onChange={(e) => setExpenseDetails({
                        ...expenseDetails,
                        date: e.target.value
                      })}
                      required
                    />
                  </div>

                  <div className="form-actions">
                    <button type="submit" className="btn-primary">Add Expense</button>
                    <button 
                      type="button" 
                      className="btn-secondary"
                      onClick={() => {
                        setShowExpenseForm(false);
                        setSelectedGroup(null);
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default Groups;