import React, { useState, useEffect } from "react";
import { getAuth } from "firebase/auth";
import { 
  collection, 
  query, 
  where, 
  onSnapshot,
  getFirestore,
  orderBy,
  limit
} from "firebase/firestore";
import { 
  MdDashboard, 
  MdGroups, 
  MdAttachMoney, 
  MdCalendarToday,
  MdAdd,
  MdHome,
  MdFlight,
  MdRestaurant,
  MdLocalGroceryStore
} from "react-icons/md";
import "../styles/Dashboard.css";
import { useNavigate } from "react-router-dom";

function Dashboard() {
  const auth = getAuth();
  const db = getFirestore();
  const user = auth.currentUser;
  const navigate = useNavigate();

  const [activities, setActivities] = useState([]);
  const [groups, setGroups] = useState([]);
  const [financialSummary, setFinancialSummary] = useState({
    totalBalance: 0,
    youAreOwed: { amount: 0, people: 0 },
    youOwe: { amount: 0, people: 0 }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // Set up real-time listeners
    const unsubscribers = [];

    // Listen to activities
    const activitiesQuery = query(
      collection(db, "activities"),
      where("userId", "==", user.uid),
      orderBy("timestamp", "desc"),
      limit(10)
    );

    const activitiesUnsubscribe = onSnapshot(activitiesQuery, (snapshot) => {
      const activitiesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setActivities(activitiesData);
    });
    unsubscribers.push(activitiesUnsubscribe);

    // Listen to groups
    const groupsQuery = query(
      collection(db, "groups"),
      where("members", "array-contains", user.uid)
    );

    const groupsUnsubscribe = onSnapshot(groupsQuery, (snapshot) => {
      const groupsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setGroups(groupsData);
    });
    unsubscribers.push(groupsUnsubscribe);

    // Listen to financial summary
    const summaryQuery = query(
      collection(db, "financialSummary"),
      where("userId", "==", user.uid)
    );

    const summaryUnsubscribe = onSnapshot(summaryQuery, (snapshot) => {
      if (!snapshot.empty) {
        setFinancialSummary(snapshot.docs[0].data());
      }
    });
    unsubscribers.push(summaryUnsubscribe);

    setLoading(false);

    // Cleanup function
    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, [user, db]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: 'MYR'
    }).format(amount);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const handleGroupClick = (groupId) => {
    navigate(`/groups/${groupId}`);
  };

  if (loading) {
    return <div className="dashboard__loading">Loading...</div>;
  }

  return (
    <div className="dashboard__content">
      <header className="dashboard__header">
        <h1 className="dashboard__title">Dashboard</h1>
        <button className="dashboard__add-button">
          <MdAdd className="dashboard__button-icon" /> Add Expense
        </button>
      </header>

      <div className="dashboard__cards">
        <div className="dashboard__card">
          <h3 className="dashboard__card-title">Total Balance</h3>
          <p className="dashboard__card-amount">
            {formatCurrency(financialSummary.totalBalance)}
          </p>
          <p className="dashboard__card-trend dashboard__card-trend--positive">
            {financialSummary.trend || '+0%'}
          </p>
        </div>

        <div className="dashboard__card">
          <h3 className="dashboard__card-title">You're Owed</h3>
          <p className="dashboard__card-amount dashboard__card-amount--positive">
            {formatCurrency(financialSummary.youAreOwed.amount)}
          </p>
          <p className="dashboard__card-subtitle">
            From {financialSummary.youAreOwed.people} people
          </p>
        </div>

        <div className="dashboard__card">
          <h3 className="dashboard__card-title">You Owe</h3>
          <p className="dashboard__card-amount dashboard__card-amount--negative">
            {formatCurrency(financialSummary.youOwe.amount)}
          </p>
          <p className="dashboard__card-subtitle">
            To {financialSummary.youOwe.people} people
          </p>
        </div>
      </div>

      <div className="dashboard__recent">
        <h2 className="dashboard__section-title">Recent Activity</h2>
        <div className="dashboard__activity-list">
          {activities.map((activity) => (
            <div key={activity.id} className="dashboard__activity-item">
              <div className="dashboard__activity-icon">
                <MdAttachMoney />
              </div>
              <div className="dashboard__activity-details">
                <h4>{activity.title}</h4>
                <p>
                  {activity.isPaid 
                    ? `You paid ${formatCurrency(activity.amount)}` 
                    : `You owe ${formatCurrency(activity.amount)}`}
                </p>
              </div>
              <p className="dashboard__activity-date">
                {formatDate(activity.timestamp)}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="dashboard__groups">
        <h2 className="dashboard__section-title">Your Groups</h2>
        <div className="dashboard__group-list">
          {groups.map((group) => (
            <div 
              key={group.id} 
              className="dashboard__group-item"
              onClick={() => handleGroupClick(group.id)}
            >
              <div className="dashboard__group-icon">
                <MdGroups />
              </div>
              <div className="dashboard__group-details">
                <h4>{group.name}</h4>
                <p>{group.members.length} members</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;