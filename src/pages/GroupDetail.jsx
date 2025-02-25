import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  addDoc, 
  onSnapshot,
  query,
  where,
  runTransaction,
  orderBy,
  getDocs,
  updateDoc,
  arrayUnion
} from 'firebase/firestore';
import { MdAddCircle, MdPerson, MdReceipt, MdArrowBack, MdAttachMoney, MdPersonAdd, MdClose, MdCheckBox, MdCheckBoxOutlineBlank } from 'react-icons/md';
import Navigation from '../components/Navigation';
import '../styles/GroupDetail.css';

function GroupDetail() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [members, setMembers] = useState([]);
  const [balances, setBalances] = useState({});
  const [settlements, setSettlements] = useState([]);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const user = auth.currentUser;

  const [expenseDetails, setExpenseDetails] = useState({
    amount: '',
    description: '',
    splitType: 'equal',
    splitDetails: {},
    paidBy: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [showAddMemberForm, setShowAddMemberForm] = useState(false);
  const [availableFriends, setAvailableFriends] = useState([]);
  const [selectedFriendIds, setSelectedFriendIds] = useState(new Set());
  const [addMemberError, setAddMemberError] = useState('');

  useEffect(() => {
    const fetchGroupData = async () => {
      if (!groupId || !user) {
        setLoading(false);
        return;
      }

      try {
        // Fetch group data
        const groupRef = doc(db, 'groups', groupId);
        const groupSnap = await getDoc(groupRef);
        
        if (!groupSnap.exists()) {
          setError('Group not found');
          setLoading(false);
          return;
        }

        const groupData = { id: groupSnap.id, ...groupSnap.data() };
        setGroup(groupData);

        // Check if members array exists and is valid
        let memberIds = [];
        if (groupData && Array.isArray(groupData.members)) {
          memberIds = groupData.members;
        }
        
        // Add current user if not already in members
        if (!memberIds.includes(user.uid)) {
          memberIds.push(user.uid);
        }

        // Fetch member details
        const memberPromises = memberIds.map(async (memberId) => {
          try {
            const userDoc = await getDoc(doc(db, 'users', memberId));
            return {
              id: memberId,
              email: userDoc.exists() ? userDoc.data().email : 'Unknown User',
              displayName: userDoc.exists() ? userDoc.data().displayName : null,
              isCurrentUser: memberId === user.uid
            };
          } catch (error) {
            console.error(`Error fetching member ${memberId}:`, error);
            return {
              id: memberId,
              email: 'Unknown User',
              displayName: null,
              isCurrentUser: memberId === user.uid
            };
          }
        });

        const memberDetails = await Promise.all(memberPromises);
        // Sort members to put current user first
        const sortedMembers = memberDetails.sort((a, b) => {
          if (a.isCurrentUser) return -1;
          if (b.isCurrentUser) return 1;
          return 0;
        });
        setMembers(sortedMembers);

        // Fetch expenses
        const expensesQuery = query(
          collection(db, 'expenses'),
          where('groupId', '==', groupId)
        );
        const expensesSnapshot = await getDocs(expensesQuery);
        const expensesData = expensesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Sort expenses in memory
        const sortedExpenses = expensesData.sort((a, b) => 
          b.date.toMillis() - a.date.toMillis()
        );
        
        setExpenses(sortedExpenses);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching group data:', error);
        setError('Failed to load group data');
        setLoading(false);
      }
    };

    fetchGroupData();
  }, [groupId, user]);

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!group) return;

    try {
      const expenseRef = await addDoc(collection(db, 'expenses'), {
        groupId: group.id,
        amount: parseFloat(expenseDetails.amount),
        description: expenseDetails.description,
        splitType: expenseDetails.splitType,
        splitDetails: expenseDetails.splitDetails,
        paidBy: expenseDetails.paidBy,
        date: new Date(expenseDetails.date),
        participants: group.members,
        createdBy: user.uid,
        timestamp: new Date()
      });

      const shares = calculateShares(expenseDetails, group.members);
      await updateGroupBalances(group.id, shares, expenseDetails.paidBy);

      setShowExpenseForm(false);
      setExpenseDetails({
        amount: '',
        description: '',
        splitType: 'equal',
        splitDetails: {},
        paidBy: '',
        date: new Date().toISOString().split('T')[0]
      });
    } catch (err) {
      console.error('Error adding expense:', err);
      setError('Failed to add expense');
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

        Object.keys(shares).forEach(memberId => {
          if (!balances[memberId]) balances[memberId] = 0;
        });

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

  const fetchAvailableFriends = async () => {
    try {
      setAddMemberError('');
      
      // Get current group members for filtering
      const currentMemberIds = members.map(member => member.id);
      
      // First get all friendships where current user is involved
      const friendshipsQuery = query(
        collection(db, 'friendships'),  // Changed from 'friends' to 'friendships'
        where('users', 'array-contains', user.uid)
      );
      
      const friendshipsSnapshot = await getDocs(friendshipsQuery);
      
      // Get all friend IDs and fetch their user data
      const friendPromises = friendshipsSnapshot.docs.map(async (friendshipDoc) => {
        // Get the other user's ID from the friendship
        const friendId = friendshipDoc.data().users.find(id => id !== user.uid);
        
        // Skip if friend is already in the group
        if (currentMemberIds.includes(friendId)) {
          return null;
        }

        // Get friend's user data
        const friendDoc = await getDoc(doc(db, 'users', friendId));
        
        if (friendDoc.exists()) {
          return {
            id: friendId,
            ...friendDoc.data()
          };
        }
        return null;
      });

      const friendsData = (await Promise.all(friendPromises))
        .filter(friend => friend !== null);

      console.log('Available friends:', friendsData); // Debug log
      setAvailableFriends(friendsData);
      
      if (friendsData.length === 0) {
        setAddMemberError('No friends available to add');
      }
    } catch (error) {
      console.error('Error fetching friends:', error);
      setAddMemberError('Failed to load friends');
    }
  };

  useEffect(() => {
    if (showAddMemberForm && user) {
      fetchAvailableFriends();
    }
  }, [showAddMemberForm, user]);

  const handleAddMembers = async (e) => {
    e.preventDefault();
    setAddMemberError('');

    if (selectedFriendIds.size === 0) {
      setAddMemberError('Please select at least one friend');
      return;
    }

    try {
      const groupRef = doc(db, 'groups', groupId);
      const selectedIds = Array.from(selectedFriendIds);

      // Add members to group
      await updateDoc(groupRef, {
        members: arrayUnion(...selectedIds)
      });

      // Update local state
      const newMembers = selectedIds.map(id => {
        const friend = availableFriends.find(f => f.id === id);
        return {
          id,
          email: friend.email,
          displayName: friend.displayName,
          isCurrentUser: false
        };
      });

      setMembers(prev => [...prev, ...newMembers]);
      setShowAddMemberForm(false);
      setSelectedFriendIds(new Set());
    } catch (error) {
      console.error('Error adding members:', error);
      setAddMemberError('Failed to add members');
    }
  };

  const toggleFriendSelection = (friendId) => {
    const newSelection = new Set(selectedFriendIds);
    if (newSelection.has(friendId)) {
      newSelection.delete(friendId);
    } else {
      newSelection.add(friendId);
    }
    setSelectedFriendIds(newSelection);
  };

  if (loading) {
    return (
      <div className="layout">
        <Navigation />
        <main className="main-content">
          <div className="group-detail__loading">Loading...</div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="layout">
        <Navigation />
        <main className="main-content">
          <div className="group-detail__error">
            <h2>Group not found</h2>
            <button 
              className="group-detail__back-button"
              onClick={() => navigate('/groups')}
            >
              <MdArrowBack />
              Back to Groups
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (!group) {
    return <div className="group-detail__error">Group not found</div>;
  }

  return (
    <div className="layout">
      <Navigation />
      <main className="main-content">
        <div className="group-detail">
          <button 
            className="group-detail__back-button"
            onClick={() => navigate('/groups')}
          >
            <MdArrowBack />
            Back to Groups
          </button>

          <div className="group-detail__grid">
            <aside className="group-detail__sidebar">
              <div className="group-detail__header">
                <h1>{group.name}</h1>
              </div>

              <button 
                className="group-detail__add-expense"
                onClick={() => setShowExpenseForm(true)}
              >
                <MdAttachMoney />
                Add Expense
              </button>

              <div className="group-detail__members">
                <div className="group-detail__members-header">
                  <h2>Members</h2>
                  <button 
                    className="group-detail__add-member-btn"
                    onClick={() => {
                      setShowAddMemberForm(true);
                    }}
                  >
                    <MdPersonAdd />
                    Add Member
                  </button>
                </div>
                <div className="group-detail__member-list">
                  {members.map(member => (
                    <div 
                      key={member.id} 
                      className={`group-detail__member-item ${member.isCurrentUser ? 'current-user' : ''}`}
                    >
                      <div className="group-detail__member-avatar">
                        {member.displayName 
                          ? member.displayName[0].toUpperCase()
                          : member.email[0].toUpperCase()
                        }
                      </div>
                      <div className="group-detail__member-info">
                        {member.displayName && (
                          <span className="group-detail__member-name">
                            {member.displayName}
                            {member.isCurrentUser && " (You)"}
                          </span>
                        )}
                        <span className="group-detail__member-email">
                          {member.email}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="group-detail__balances">
                <h2>Balances</h2>
                {Object.keys(balances).length > 0 ? (
                  <div className="group-detail__balance-list">
                    {Object.entries(balances).map(([userId, balance]) => {
                      const member = members.find(m => m.id === userId);
                      return (
                        <div key={userId} className="group-detail__balance-item">
                          <span className="group-detail__member-name">
                            {member?.email}
                          </span>
                          <span className={`group-detail__balance-amount ${balance >= 0 ? 'positive' : 'negative'}`}>
                            {balance >= 0 ? '+' : ''}{balance.toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="group-detail__empty-balances">
                    No balances to show
                  </div>
                )}
              </div>

              {settlements.length > 0 && (
                <div className="group-detail__settlements">
                  <h2>Suggested Settlements</h2>
                  <div className="group-detail__settlement-list">
                    {settlements.map((settlement, index) => (
                      <div key={index} className="group-detail__settlement-item">
                        <span>{settlement.from}</span>
                        <span className="group-detail__settlement-arrow">→</span>
                        <span>{settlement.to}</span>
                        <span className="group-detail__settlement-amount">
                          ${settlement.amount.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </aside>

            <div className="group-detail__content">
              <div className="group-detail__expenses">
                <h2>Expenses</h2>
                {expenses.length > 0 ? (
                  <div className="group-detail__expense-list">
                    {expenses.map(expense => (
                      <div key={expense.id} className="group-detail__expense-item">
                        <div className="group-detail__expense-icon">
                          <MdAttachMoney />
                        </div>
                        <div className="group-detail__expense-info">
                          <h3>{expense.description}</h3>
                          <p>Paid by {expense.paidByEmail}</p>
                          <p className="group-detail__expense-info-split">
                            Split between {Object.keys(expense.splits || {}).length} members
                          </p>
                        </div>
                        <div className="group-detail__expense-amount">
                          ${expense.amount.toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="group-detail__empty-expenses">
                    <MdAttachMoney className="group-detail__empty-icon" />
                    <h3>No expenses yet</h3>
                    <p>Add an expense to start tracking</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {showExpenseForm && (
          <div className="expense-form-overlay">
            <div className="expense-form">
              <h2>Add Expense in {group.name}</h2>
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
                    {group.members.map(memberId => (
                      <option key={memberId} value={memberId}>
                        {memberId === user.uid ? 'You' : group.memberEmails[memberId]}
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
                    {group.members.map(memberId => (
                      <div key={memberId} className="split-member">
                        <label>
                          {memberId === user.uid ? 'You' : group.memberEmails[memberId]}
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
                    onClick={() => setShowExpenseForm(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showAddMemberForm && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal__header">
                <h2>Add Friends to Group</h2>
                <button 
                  className="modal__close"
                  onClick={() => {
                    setShowAddMemberForm(false);
                    setSelectedFriendIds(new Set());
                  }}
                >
                  <MdClose />
                </button>
              </div>

              <div className="modal__content">
                {availableFriends.length > 0 ? (
                  <form onSubmit={handleAddMembers}>
                    <div className="friends-list">
                      {availableFriends.map(friend => (
                        <div 
                          key={friend.id} 
                          className={`friend-item ${selectedFriendIds.has(friend.id) ? 'selected' : ''}`}
                          onClick={() => toggleFriendSelection(friend.id)}
                        >
                          <div className="friend-item__checkbox">
                            {selectedFriendIds.has(friend.id) ? (
                              <MdCheckBox className="checkbox-icon checked" />
                            ) : (
                              <MdCheckBoxOutlineBlank className="checkbox-icon" />
                            )}
                          </div>
                          <div className="friend-item__avatar">
                            {(friend.displayName || friend.email)[0].toUpperCase()}
                          </div>
                          <div className="friend-item__info">
                            {friend.displayName && (
                              <span className="friend-item__name">{friend.displayName}</span>
                            )}
                            <span className="friend-item__email">{friend.email}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {addMemberError && (
                      <div className="form-error">{addMemberError}</div>
                    )}

                    <div className="form-actions">
                      <button type="submit" className="btn-primary">
                        Add Selected Friends ({selectedFriendIds.size})
                      </button>
                      <button 
                        type="button" 
                        className="btn-secondary"
                        onClick={() => {
                          setShowAddMemberForm(false);
                          setSelectedFriendIds(new Set());
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="modal__empty">
                    <p>No friends available to add</p>
                    <button 
                      className="btn-secondary"
                      onClick={() => setShowAddMemberForm(false)}
                    >
                      Close
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default GroupDetail;

// Add this helper function to calculate settlements
function calculateSettlements(balances, memberEmails) {
  const settlements = [];
  const debtors = [];
  const creditors = [];

  // Separate debtors and creditors
  Object.entries(balances).forEach(([memberId, balance]) => {
    if (balance < 0) {
      debtors.push({ id: memberId, amount: Math.abs(balance) });
    } else if (balance > 0) {
      creditors.push({ id: memberId, amount: balance });
    }
  });

  // Sort by amount (largest first)
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  // Calculate settlements
  while (debtors.length > 0 && creditors.length > 0) {
    const debtor = debtors[0];
    const creditor = creditors[0];
    const amount = Math.min(debtor.amount, creditor.amount);

    settlements.push({
      from: debtor.id,
      to: creditor.id,
      amount: amount
    });

    debtor.amount -= amount;
    creditor.amount -= amount;

    if (debtor.amount < 0.01) debtors.shift();
    if (creditor.amount < 0.01) creditors.shift();
  }

  return settlements;
} 