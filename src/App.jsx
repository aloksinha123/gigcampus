import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { NotificationProvider } from './context/NotificationContext';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ProjectMarketplace from './pages/ProjectMarketplace';
import ProjectDetail from './pages/ProjectDetail';
import MyProjects from './pages/MyProjects';
import MyBids from './pages/MyBids';
import Messages from './pages/Messages';
import Portfolio from './pages/Portfolio';
import Profile from './pages/Profile';
import StudentDashboard from './pages/StudentDashboard';
import FreelancerDashboard from './pages/FreelancerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AdminUsers from './pages/AdminUsers';
import AdminProjects from './pages/AdminProjects';
import AdminDisputes from './pages/AdminDisputes';

import './index.css';

// Protected Route Component
const ProtectedRoute = ({ children, roles }) => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (roles && !roles.includes(user?.role)) {
    return <Navigate to="/" />;
  }

  return children;
};

// Public Route (redirect if authenticated)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, user } = useAuth();

  if (isAuthenticated) {
    // Redirect to appropriate dashboard
    if (user?.role === 'admin') return <Navigate to="/admin" />;
    if (user?.role === 'freelancer') return <Navigate to="/freelancer/dashboard" />;
    return <Navigate to="/student/dashboard" />;
  }

  return children;
};

function AppRoutes() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

        {/* Marketplace (Public) */}
        <Route path="/projects" element={<ProjectMarketplace />} />
        <Route path="/projects/:id" element={<ProjectDetail />} />
        <Route path="/portfolio" element={<Portfolio />} />
        <Route path="/portfolio/:userId" element={<Portfolio />} />

        {/* Protected Routes */}
        <Route path="/my-projects" element={
          <ProtectedRoute roles={['student', 'freelancer', 'admin']}>
            <MyProjects />
          </ProtectedRoute>
        } />

        <Route path="/my-bids" element={
          <ProtectedRoute roles={['freelancer', 'admin']}>
            <MyBids />
          </ProtectedRoute>
        } />

        <Route path="/messages" element={
          <ProtectedRoute>
            <Messages />
          </ProtectedRoute>
        } />

        <Route path="/profile" element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        } />

        {/* Dashboards */}
        <Route path="/student/dashboard" element={
          <ProtectedRoute roles={['student', 'admin']}>
            <StudentDashboard />
          </ProtectedRoute>
        } />

        <Route path="/freelancer/dashboard" element={
          <ProtectedRoute roles={['freelancer', 'admin']}>
            <FreelancerDashboard />
          </ProtectedRoute>
        } />

        <Route path="/admin" element={
          <ProtectedRoute roles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        } />

        <Route path="/admin/users" element={
          <ProtectedRoute roles={['admin']}>
            <AdminUsers />
          </ProtectedRoute>
        } />

        <Route path="/admin/projects" element={
          <ProtectedRoute roles={['admin']}>
            <AdminProjects />
          </ProtectedRoute>
        } />

        <Route path="/admin/disputes" element={
          <ProtectedRoute roles={['admin']}>
            <AdminDisputes />
          </ProtectedRoute>
        } />

        {/* 404 */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <NotificationProvider>
          <AppRoutes />
        </NotificationProvider>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;