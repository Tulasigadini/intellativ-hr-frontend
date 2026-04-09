import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './assets/styles/global.css';

import { AuthProvider, useAuth } from './hooks/useAuth';
import { NotificationProvider } from './hooks/useNotifications';
import Layout from './components/layout/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import OnboardingPage from './pages/OnboardingPage';
import EmployeesPage from './pages/EmployeesPage';
import EmployeeDetailPage from './pages/EmployeeDetailPage';
import DepartmentsPage from './pages/DepartmentsPage';
import RolesPage from './pages/RolesPage';
import IAMPage from './pages/IAMPage';
import ProfilePage from './pages/ProfilePage';
import TasksPage from './pages/TasksPage';
import OnboardingTasksPage from './pages/OnboardingTasksPage';
import PendingOnboardingPage from './pages/PendingOnboardingPage';
import JoiningDetailsPage from './pages/JoiningDetailsPage';

const queryClient = new QueryClient();

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div className="spinner" style={{ width: 48, height: 48 }} />
    </div>
  );
  return user ? <Layout>{children}</Layout> : <Navigate to="/login" replace />;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <NotificationProvider user={user}>
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <LoginPage />} />
      <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
      <Route path="/onboarding" element={<PrivateRoute><OnboardingPage /></PrivateRoute>} />
      <Route path="/employees" element={<PrivateRoute><EmployeesPage /></PrivateRoute>} />
      <Route path="/employees/:id" element={<PrivateRoute><EmployeeDetailPage /></PrivateRoute>} />
      <Route path="/departments" element={<PrivateRoute><DepartmentsPage /></PrivateRoute>} />
      <Route path="/roles" element={<PrivateRoute><RolesPage /></PrivateRoute>} />
      <Route path="/iam" element={<PrivateRoute><IAMPage /></PrivateRoute>} />
      <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
      <Route path="/tasks" element={<PrivateRoute><TasksPage /></PrivateRoute>} />
      <Route path="/onboarding-tasks" element={<PrivateRoute><OnboardingTasksPage /></PrivateRoute>} />
      <Route path="/pending-onboarding" element={<PrivateRoute><PendingOnboardingPage /></PrivateRoute>} />
      <Route path="/joining-details" element={<PrivateRoute><JoiningDetailsPage /></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
    </NotificationProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
          <ToastContainer
            position="top-right"
            autoClose={3500}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            pauseOnHover
            toastStyle={{ borderRadius: 10, fontFamily: 'Outfit, sans-serif', fontSize: 14 }}
          />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}