import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { NotificationProvider } from './context/NotificationContext';
import ErrorBoundary from './components/ErrorBoundary';
import { PageSkeleton } from './components/SkeletonLoader';

import './index.css';

// Lazy Loaded Page Components for Code Splitting & Performance Optimization
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ProjectMarketplace = lazy(() => import('./pages/ProjectMarketplace'));
const ProjectDetail = lazy(() => import('./pages/ProjectDetail'));
const MyProjects = lazy(() => import('./pages/MyProjects'));
const MyBids = lazy(() => import('./pages/MyBids'));
const Messages = lazy(() => import('./pages/Messages'));
const Portfolio = lazy(() => import('./pages/Portfolio'));
const Profile = lazy(() => import('./pages/Profile'));
const StudentDashboard = lazy(() => import('./pages/StudentDashboard'));
const FreelancerDashboard = lazy(() => import('./pages/FreelancerDashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminUsers = lazy(() => import('./pages/AdminUsers'));
const AdminProjects = lazy(() => import('./pages/AdminProjects'));
const AdminDisputes = lazy(() => import('./pages/AdminDisputes'));
const NotFound = lazy(() => import('./pages/NotFound'));

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
    if (user?.role === 'admin') return <Navigate to="/admin" />;
    if (user?.role === 'freelancer') return <Navigate to="/freelancer/dashboard" />;
    return <Navigate to="/student/dashboard" />;
  }

  return children;
};

function AppRoutes() {
  return (
    <Router>
      <Suspense fallback={<PageSkeleton />}>
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

          {/* Custom 404 Error Page */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <SocketProvider>
          <NotificationProvider>
            <AppRoutes />
          </NotificationProvider>
        </SocketProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;