import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';
import { ROLES } from './utils/roles';

import MainLayout from './layouts/MainLayout';
import LoginPage from './pages/LoginPage';
import DeoDashboardPage from './pages/DeoDashboardPage';
import BulkWizardPage from './pages/BulkWizardPage';
import VerificationWorkspacePage from './pages/VerificationWorkspacePage';
import RecordDetailPage from './pages/RecordDetailPage';
import RecordsListPage from './pages/RecordsListPage';
import GisMapViewPage from './pages/GisMapViewPage';
import AnalyticsDashboardPage from './pages/AnalyticsDashboardPage';
import AdminConsolePage from './pages/AdminConsolePage';
import CitizenLookupPage from './pages/CitizenLookupPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Navigate to="/login" replace />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="citizen-lookup" element={<CitizenLookupPage />} />

            <Route element={<ProtectedRoute allowedRoles={[ROLES.DEO, ROLES.SUPER_ADMIN]} />}>
              <Route path="deo-dashboard" element={<DeoDashboardPage />} />
            </Route>

            <Route
              element={
                <ProtectedRoute
                  allowedRoles={[ROLES.DEO, ROLES.DISTRICT_OFFICER, ROLES.SUPER_ADMIN]}
                />
              }
            >
              <Route path="bulk-upload" element={<BulkWizardPage />} />
            </Route>

            <Route
              element={
                <ProtectedRoute
                  allowedRoles={[
                    ROLES.VERIFIER,
                    ROLES.DISTRICT_OFFICER,
                    ROLES.STATE_ADMIN,
                    ROLES.SUPER_ADMIN,
                  ]}
                />
              }
            >
              <Route path="verification-workspace" element={<VerificationWorkspacePage />} />
            </Route>

            <Route element={<ProtectedRoute />}>
              <Route path="records" element={<RecordsListPage />} />
              <Route path="records/:id" element={<RecordDetailPage />} />
              <Route path="gis-map" element={<GisMapViewPage />} />
              <Route path="analytics" element={<AnalyticsDashboardPage />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.STATE_ADMIN]} />}>
              <Route path="admin" element={<AdminConsolePage />} />
            </Route>

            <Route
              path="*"
              element={
                <div style={{ padding: '2rem' }}>
                  <h3>404 - Page Not Found</h3>
                </div>
              }
            />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
