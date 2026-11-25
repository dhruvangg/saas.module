import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogOut, User as UserIcon, Shield } from 'lucide-react';
import { Badge } from '../common/Badge';

export const Navbar = () => {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <h1 className="text-base font-semibold text-slate-800">Shopfloor Control & Identity</h1>
      </div>

      <div className="flex items-center gap-4">
        {/* User Roles Badges */}
        <div className="hidden sm:flex items-center gap-1.5">
          {user?.is_superuser && (
            <Badge variant="purple" className="flex items-center gap-1">
              <Shield className="w-3 h-3" /> Super Admin
            </Badge>
          )}
          {user?.roles?.map((role) => (
            <Badge key={role} variant="primary">
              {role}
            </Badge>
          ))}
        </div>

        {/* User Info & Avatar */}
        <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
          <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-600 font-semibold text-sm">
            {user?.first_name ? user.first_name[0].toUpperCase() : <UserIcon className="w-4 h-4" />}
          </div>
          <div className="hidden md:block text-left">
            <div className="text-sm font-semibold text-slate-800 leading-tight">{user?.full_name}</div>
            <div className="text-xs text-slate-500 leading-tight">{user?.email}</div>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={logout}
          title="Sign out"
          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};
