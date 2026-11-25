import React from 'react';
import { useAuth } from '../../context/AuthContext';

/**
 * Declarative component for permission-based conditional rendering.
 * Usage:
 *   <Can I="user:create">
 *     <Button>Create User</Button>
 *   </Can>
 */
export const Can = ({ I, anyOf, fallback = null, children }) => {
  const { hasPermission, hasAnyPermission } = useAuth();

  if (I && hasPermission(I)) {
    return <>{children}</>;
  }

  if (anyOf && hasAnyPermission(anyOf)) {
    return <>{children}</>;
  }

  return fallback;
};
