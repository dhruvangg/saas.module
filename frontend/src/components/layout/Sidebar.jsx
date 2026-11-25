import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  Key,
  FileText,
  Boxes,
  Factory,
  CheckCircle2
} from 'lucide-react';

export const Sidebar = () => {
  const { hasPermission, user } = useAuth();

  const navigationSections = [
    {
      title: 'Overview',
      items: [
        {
          name: 'Dashboard',
          to: '/dashboard',
          icon: LayoutDashboard,
          show: true,
        },
      ],
    },
    {
      title: 'Access Control (IAM)',
      items: [
        {
          name: 'Users',
          to: '/users',
          icon: Users,
          show: hasPermission('user:read'),
        },
        {
          name: 'Roles',
          to: '/roles',
          icon: ShieldCheck,
          show: hasPermission('role:read'),
        },
        {
          name: 'Privileges',
          to: '/privileges',
          icon: Key,
          show: hasPermission('privilege:read'),
        },
        {
          name: 'Audit Trail',
          to: '/audit',
          icon: FileText,
          show: hasPermission('audit:read') || user?.is_superuser,
        },
      ],
    },
    {
      title: 'MES Operations',
      items: [
        {
          name: 'Work Orders',
          to: '/mes/work-orders',
          icon: Boxes,
          show: hasPermission('mes:order:read'),
        },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col flex-shrink-0 min-h-screen border-r border-slate-800">
      {/* Brand Header */}
      <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800">
        <div className="w-9 h-9 rounded-lg bg-sky-600 flex items-center justify-center text-white shadow-md shadow-sky-600/30">
          <Factory className="w-5 h-5" />
        </div>
        <div>
          <span className="font-bold text-white text-base tracking-wide block leading-none">MES Core</span>
          <span className="text-[11px] text-sky-400 font-medium">Enterprise Boilerplate</span>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 py-6 px-3 space-y-6 overflow-y-auto">
        {navigationSections.map((section, idx) => {
          const visibleItems = section.items.filter((item) => item.show);
          if (visibleItems.length === 0) return null;

          return (
            <div key={idx}>
              <h4 className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                {section.title}
              </h4>
              <nav className="space-y-1">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-sky-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                        }`
                      }
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span>{item.name}</span>
                    </NavLink>
                  );
                })}
              </nav>
            </div>
          );
        })}
      </div>

      {/* Active User Footer Card */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/50">
        <div className="text-xs text-slate-400 mb-1">Effective Permissions</div>
        <div className="text-xs font-mono font-medium text-sky-400 truncate">
          {user?.is_superuser ? 'Superuser (*)' : `${user?.permissions?.length || 0} Privileges Active`}
        </div>
      </div>
    </aside>
  );
};
