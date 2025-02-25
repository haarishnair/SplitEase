import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { 
  MdDashboard, 
  MdGroups, 
  MdPeopleAlt, 
  MdLogout, 
  MdTrendingUp, 
  MdTrendingDown, 
  MdHistory,
  MdAccountBalance
} from 'react-icons/md';
import '../styles/Dashboard.css';
import Navigation from '../components/Navigation';

function Dashboard() {
  const [recentActivity, setRecentActivity] = useState([]);
  const [groups, setGroups] = useState([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [totalOwed, setTotalOwed] = useState(0);
  const [totalIOwe, setTotalIOwe] = useState(0);
  const navigate = useNavigate();
  const user = auth.currentUser;

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      // Fetch groups
      const groupsQuery = query(
        collection(db, 'groups'),
        where('members', 'array-contains', user.uid)
      );
      const groupsSnapshot = await getDocs(groupsQuery);
      const groupsData = groupsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setGroups(groupsData);

      // Fetch balances
      const balancesQuery = query(
        collection(db, 'balances'),
        where('userId', '==', user.uid)
      );
      const balancesSnapshot = await getDocs(balancesQuery);
      
      let owed = 0;
      let iOwe = 0;
      
      balancesSnapshot.docs.forEach(doc => {
        const amount = doc.data().amount;
        if (amount > 0) {
          owed += amount;
        } else {
          iOwe += Math.abs(amount);
        }
      });

      setTotalOwed(owed);
      setTotalIOwe(iOwe);
      setTotalBalance(owed - iOwe);

      // Modified recent activity query
      const activityQuery = query(
        collection(db, 'transactions'),
        where('participants', 'array-contains', user.uid),
      );
      const activitySnapshot = await getDocs(activityQuery);
      const activityData = await Promise.all(activitySnapshot.docs.map(async doc => {
        const data = doc.data();
        // Get group name
        const groupDoc = await getDocs(doc(db, 'groups', data.groupId));
        const groupName = groupDoc.exists() ? groupDoc.data().name : 'Unknown Group';
        return {
          id: doc.id,
          ...data,
          groupName
        };
      }));
      
      // Sort and limit the results in memory instead
      const sortedActivity = activityData
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 5);
      
      setRecentActivity(sortedActivity);
    };

    fetchData();
  }, [user]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="layout">
      <Navigation />
      <main className="main-content">
        <div className="main-content__header">
          <h1>Dashboard</h1>
        </div>

        <div className="dashboard-cards">
          <div className="dashboard-card balance gradient-1">
            <div className="dashboard-card__icon">
              <MdAccountBalance />
            </div>
            <div className="dashboard-card__content">
              <h3>Total Balance</h3>
              <p className={`dashboard-card__number ${totalBalance >= 0 ? 'positive' : 'negative'}`}>
                RM {Math.abs(totalBalance).toFixed(2)}
              </p>
            </div>
          </div>

          <div className="dashboard-card owed gradient-2">
            <div className="dashboard-card__icon">
              <MdTrendingUp />
            </div>
            <div className="dashboard-card__content">
              <h3>Total Owed to You</h3>
              <p className="dashboard-card__number positive">
                RM {totalOwed.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="dashboard-card owe gradient-3">
            <div className="dashboard-card__icon">
              <MdTrendingDown />
            </div>
            <div className="dashboard-card__content">
              <h3>Total You Owe</h3>
              <p className="dashboard-card__number negative">
                RM {totalIOwe.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <div className="dashboard-grid">
          <div className="activity-list">
            <h2>
              <MdHistory />
              Recent Activity
            </h2>
            {recentActivity.length > 0 ? (
              <div className="activity-items">
                {recentActivity.map(activity => (
                  <div key={activity.id} className="activity-item">
                    <div className="activity-item__icon">
                      <MdAccountBalance />
                    </div>
                    <div className="activity-item__content">
                      <h3>{activity.description}</h3>
                      <p>
                        {activity.groupName} • {new Date(activity.timestamp?.toDate()).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="activity-item__amount">
                      <span className={activity.amount >= 0 ? 'positive' : 'negative'}>
                        RM {Math.abs(activity.amount).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="activity-empty">No recent activity</p>
            )}
          </div>

          <div className="groups-list">
            <h2>Your Groups</h2>
            {groups.length > 0 ? (
              <div className="groups-grid">
                {groups.map(group => (
                  <Link to={`/groups/${group.id}`} key={group.id} className="group-card">
                    <div className="group-card__icon">
                      <MdGroups />
                    </div>
                    <div className="group-card__content">
                      <h3>{group.name}</h3>
                      <p>{Object.keys(group.memberEmails || {}).length} members</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="groups-empty">
                <MdGroups className="groups-empty__icon" />
                <p>No groups yet</p>
                <p className="groups-empty__subtitle">Create a group to get started</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;