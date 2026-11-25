import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { UserList } from './pages/users/UserList';
import { RoleList } from './pages/roles/RoleList';
import { PrivilegeList } from './pages/privileges/PrivilegeList';
import { AuditLogList } from './pages/audit/AuditLogList';
import { WorkOrders } from './pages/mes/WorkOrders';
import { NotFound } from './pages/NotFound';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Auth Route */}
          <Route path="/login" element={<Login />} />

          {/* Protected Dashboard Shell */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />

            {/* Permission Gated RBAC Modules */}
            <Route
              path="users"
              element={
                <ProtectedRoute permission="user:read">
                  <UserList />
                </ProtectedRoute>
              }
            />
            <Route
              path="roles"
              element={
                <ProtectedRoute permission="role:read">
                  <RoleList />
                </ProtectedRoute>
              }
            />
            <Route
              path="privileges"
              element={
                <ProtectedRoute permission="privilege:read">
                  <PrivilegeList />
                </ProtectedRoute>
              }
            />
            <Route
              path="audit"
              element={
                <ProtectedRoute anyPermissions={['audit:read']}>
                  <AuditLogList />
                </ProtectedRoute>
              }
            />

            {/* MES Modules */}
            <Route
              path="mes/work-orders"
              element={
                <ProtectedRoute permission="mes:order:read">
                  <WorkOrders />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
