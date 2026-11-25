import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert } from 'lucide-react';

export const ProtectedRoute = ({ children, permission, anyPermissions }) => {
  const { user, loading, hasPermission, hasAnyPermission } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-slate-500">Authenticating session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (permission && !hasPermission(permission)) {
    return (
      <div className="p-8 max-w-lg mx-auto mt-16 bg-white rounded-xl shadow-sm border border-slate-200 text-center">
        <ShieldAlert className="w-16 h-16 text-amber-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">Access Denied</h2>
        <p className="text-slate-600 mb-4">
          You lack the required privilege <code className="bg-slate-100 text-sky-700 px-2 py-0.5 rounded font-mono text-sm">{permission}</code> to access this view.
        </p>
        <p className="text-xs text-slate-400">Contact your system administrator to update your assigned roles.</p>
      </div>
    );
  }

  if (anyPermissions && !hasAnyPermission(anyPermissions)) {
    return (
      <div className="p-8 max-w-lg mx-auto mt-16 bg-white rounded-xl shadow-sm border border-slate-200 text-center">
        <ShieldAlert className="w-16 h-16 text-amber-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">Access Denied</h2>
        <p className="text-slate-600 mb-4">You do not have permission to view this resource.</p>
      </div>
    );
  }

  return children;
};
