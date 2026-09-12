import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { roleHomePath } from '../utils/roles';

/**
 * Wraps a set of routes behind authentication, and optionally a role
 * allow-list. Mirrors the backend's `requireRole` guards so the UI never
 * offers a screen the API would reject — but the API remains the source
 * of truth for enforcement.
 */
export default function ProtectedRoute({ allowedRoles }) {
  const { user, isAuthenticated, isBootstrapping } = useAuth();
  const location = useLocation();

  if (isBootstrapping) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-ink-faint">
        Loading your session…
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={roleHomePath(user.role)} replace />;
  }

  return <Outlet />;
}
