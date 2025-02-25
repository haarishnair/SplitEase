import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { auth } from './firebase';
import Navbar from './components/TopBar';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Groups from './pages/Groups';
import GroupDetail from './pages/GroupDetail';
import Friends from './pages/Friends';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
function AppContent() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  const shouldShowNavbar = (pathname) => {
    const noNavbarRoutes = ['/', '/login', '/signup'];
    return !noNavbarRoutes.includes(pathname);
  };

  return (
    <div className="app">
      {shouldShowNavbar(location.pathname) && <Navbar />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route
          path="/dashboard"
          element={user ? <Dashboard /> : <Navigate to="/login" />}
        />
        <Route
          path="/groups"
          element={user ? <Groups /> : <Navigate to="/login" />}
        />
        <Route
          path="/groups/:groupId"
          element={user ? <GroupDetail /> : <Navigate to="/login" />}
        />
        <Route
          path="/friends"
          element={user ? <Friends /> : <Navigate to="/login" />}
        />
        <Route path="/profile" element={<Profile />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
