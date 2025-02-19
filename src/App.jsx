import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Groups from "./pages/Groups";
import Expenses from "./pages/Expenses";
import Analytics from "./pages/Analytics";
import PrivateRoute from "./components/PrivateRoute";
import Navigation from "./components/Navigation";
import GroupDetail from "./pages/GroupDetail";
import DashboardLayout from './components/DashboardLayout';
import Friends from './pages/Friends';
import FriendDetail from './pages/FriendDetail';
import ProtectedRoute from './components/ProtectedRoute';
import Notifications from './pages/Notifications';

function App() {
  return (
    <BrowserRouter>
      <Navigation />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        
        {/* Protected routes with DashboardLayout */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Dashboard />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/groups"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Groups />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/groups/:groupId"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <GroupDetail />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/friends"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Friends />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/friends/:friendId"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <FriendDetail />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Notifications />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        {/* Add other protected routes similarly */}
        
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
