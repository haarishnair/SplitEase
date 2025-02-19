import React, { useState, useEffect } from "react";
import { getAuth } from "firebase/auth";
import { 
  collection, 
  query, 
  where, 
  onSnapshot,
  addDoc,
  getFirestore,
  serverTimestamp
} from "firebase/firestore";
import { 
  MdAdd, 
  MdGroup, 
  MdHome, 
  MdFlight, 
  MdRestaurant, 
  MdClose,
  MdPersonAdd
} from "react-icons/md";
import "../styles/Groups.css";
import { useNavigate } from 'react-router-dom';

function Groups() {
  const [groups, setGroups] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newGroup, setNewGroup] = useState({
    name: "",
    description: "",
    type: "home",
    friends: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const auth = getAuth();
  const db = getFirestore();
  const user = auth.currentUser;
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "groups"),
      where("members", "array-contains", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const groupsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setGroups(groupsData);
    });

    return () => unsubscribe();
  }, [user, db]);

  const groupIcons = {
    home: MdHome,
    travel: MdFlight,
    food: MdRestaurant,
    other: MdGroup
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    if (!newGroup.name.trim()) {
      setError("Group name is required");
      setIsSubmitting(false);
      return;
    }

    try {
      await addDoc(collection(db, "groups"), {
        name: newGroup.name.trim(),
        description: newGroup.description.trim(),
        type: newGroup.type,
        members: [user.uid],
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        totalExpenses: 0
      });

      setShowModal(false);
      setNewGroup({ name: "", description: "", type: "home", friends: [] });
    } catch (error) {
      setError("Failed to create group. Please try again.");
      console.error("Error creating group:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setNewGroup({ name: "", description: "", type: "home", friends: [] });
    setError("");
  };

  const handleGroupClick = (groupId) => {
    navigate(`/groups/${groupId}`);
  };

  return (
    <div className="groups">
      <div className="groups__header">
        <h1 className="groups__title">Your Groups</h1>
        <button 
          className="groups__add-button"
          onClick={() => setShowModal(true)}
        >
          <MdAdd /> Create Group
        </button>
      </div>

      {groups.length === 0 ? (
        <div className="groups__empty">
          <MdGroup className="groups__empty-icon" />
          <h2>No Groups Yet</h2>
          <p>Create a group to start tracking shared expenses</p>
          <button 
            className="groups__add-button"
            onClick={() => setShowModal(true)}
          >
            <MdAdd /> Create Your First Group
          </button>
        </div>
      ) : (
        <div className="groups__grid">
          {groups.map(group => {
            const Icon = groupIcons[group.type] || groupIcons.other;
            return (
              <div 
                key={group.id} 
                className="groups__card"
                onClick={() => handleGroupClick(group.id)}
              >
                <div className="groups__card-header">
                  <div className="groups__card-icon">
                    <Icon />
                  </div>
                  <div className="groups__card-info">
                    <h3 className="groups__card-title">{group.name}</h3>
                    <p className="groups__card-members">
                      {group.members.length} members
                    </p>
                  </div>
                </div>
                <p className="groups__card-description">{group.description}</p>
                <div className="groups__card-footer">
                  <span className="groups__card-expenses">
                    Total Expenses: RM {group.totalExpenses || 0}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="groups__modal-overlay" onClick={closeModal}>
          <div className="groups__modal" onClick={e => e.stopPropagation()}>
            <div className="groups__modal-header">
              <h2>Create New Group</h2>
              <button 
                className="groups__modal-close"
                onClick={closeModal}
                aria-label="Close modal"
              >
                <MdClose />
              </button>
            </div>
            <form onSubmit={handleCreateGroup}>
              {error && (
                <div className="groups__form-error">
                  {error}
                </div>
              )}
              <div className="groups__form-group">
                <label htmlFor="group-name">Group Name</label>
                <input
                  id="group-name"
                  type="text"
                  value={newGroup.name}
                  onChange={(e) => setNewGroup({...newGroup, name: e.target.value})}
                  placeholder="Enter group name"
                  required
                  maxLength={50}
                />
              </div>
              <div className="groups__form-group">
                <label htmlFor="group-description">Description</label>
                <textarea
                  id="group-description"
                  value={newGroup.description}
                  onChange={(e) => setNewGroup({...newGroup, description: e.target.value})}
                  placeholder="Enter group description"
                  rows="3"
                  maxLength={200}
                />
              </div>
              <div className="groups__form-group">
                <label htmlFor="group-type">Group Type</label>
                <select
                  id="group-type"
                  value={newGroup.type}
                  onChange={(e) => setNewGroup({...newGroup, type: e.target.value})}
                >
                  <option value="home">Home</option>
                  <option value="travel">Travel</option>
                  <option value="food">Food</option>
                  <option value="friends">Friends</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="groups__form-group">
                <label htmlFor="group-friends">Add Friends</label>
                <div className="groups__friends-input">
                  <input
                    id="group-friends"
                    type="email"
                    placeholder="Enter friend's email"
                    className="groups__friends-field"
                  />
                  <button 
                    type="button"
                    className="groups__friends-add"
                    aria-label="Add friend"
                  >
                    <MdPersonAdd />
                  </button>
                </div>
                <div className="groups__friends-list">
                  {/* Friend list will go here */}
                </div>
              </div>
              <div className="groups__form-actions">
                <button 
                  type="button" 
                  className="groups__button--secondary"
                  onClick={closeModal}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="groups__button--primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Creating...' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Groups;