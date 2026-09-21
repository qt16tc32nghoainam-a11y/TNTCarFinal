import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './lib/auth';
import Layout from './components/Layout';
import { Spinner } from './components/ui';

import Login from './pages/Login';
import Onboarding from './pages/Onboarding';
import LeadsList from './pages/LeadsList';
import LeadDetail from './pages/LeadDetail';
import Reminders from './pages/Reminders';
import Cars from './pages/Cars';
import CarDetail from './pages/CarDetail';
import TestDrives from './pages/TestDrives';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Slots from './pages/Slots';
import Settings from './pages/Settings';
import Content from './pages/Content';
import PublicSite from './pages/public/PublicSite';

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  // FR-10: Sales chưa onboard thì chuyển sang trang onboarding
  if (user.role === 'Sales' && !user.onboarded) return <Navigate to="/onboarding" replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  const { user, loading } = useAuth();

  return (
    <Routes>
      {/* Website công khai */}
      <Route path="/site/*" element={<PublicSite />} />

      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      <Route path="/onboarding" element={loading ? <Spinner /> : user ? <Onboarding /> : <Navigate to="/login" />} />

      <Route path="/" element={<Protected><Home /></Protected>} />
      <Route path="/leads" element={<Protected><LeadsList /></Protected>} />
      <Route path="/leads/:id" element={<Protected><LeadDetail /></Protected>} />
      <Route path="/reminders" element={<Protected><Reminders /></Protected>} />
      <Route path="/cars" element={<Protected><Cars /></Protected>} />
      <Route path="/cars/:id" element={<Protected><CarDetail /></Protected>} />
      <Route path="/test-drives" element={<Protected><TestDrives /></Protected>} />
      <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
      <Route path="/users" element={<Protected><Users /></Protected>} />
      <Route path="/slots" element={<Protected><Slots /></Protected>} />
      <Route path="/settings" element={<Protected><Settings /></Protected>} />
      <Route path="/content" element={<Protected><Content /></Protected>} />

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

function Home() {
  const { user } = useAuth();
  // Điều hướng mặc định theo vai trò
  if (user?.role === 'Sales') return <Navigate to="/leads" replace />;
  return <Navigate to="/dashboard" replace />;
}
