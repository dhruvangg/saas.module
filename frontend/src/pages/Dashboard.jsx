import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Can } from '../components/auth/Can';
import { Badge } from '../components/common/Badge';
import api from '../api/axios';
import {
  Users,
  ShieldCheck,
  Key,
  Boxes,
  Activity,
  ArrowRight,
  ShieldAlert,
  Server
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    usersCount: 0,
    rolesCount: 0,
    privilegesCount: 0,
    ordersCount: 2,
    loading: true,
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [usersRes, rolesRes, privsRes] = await Promise.allSettled([
          api.get('/users?limit=1'),
          api.get('/roles'),
          api.get('/privileges'),
        ]);

        setStats({
          usersCount: usersRes.status === 'fulfilled' ? usersRes.value.data.length : '—',
          rolesCount: rolesRes.status === 'fulfilled' ? rolesRes.value.data.length : '—',
          privilegesCount: privsRes.status === 'fulfilled' ? privsRes.value.data.length : '—',
          ordersCount: 2,
          loading: false,
        });
      } catch (err) {
        setStats((prev) => ({ ...prev, loading: false }));
      }
    };

    loadStats();
  }, []);

  const kpis = [
    {
      title: 'Active Users',
      value: stats.usersCount,
      icon: Users,
      color: 'bg-sky-50 text-sky-600 border-sky-100',
      to: '/users',
      perm: 'user:read',
    },
    {
      title: 'Defined Roles',
      value: stats.rolesCount,
      icon: ShieldCheck,
      color: 'bg-purple-50 text-purple-600 border-purple-100',
      to: '/roles',
      perm: 'role:read',
    },
    {
      title: 'Registered Privileges',
      value: stats.privilegesCount,
      icon: Key,
      color: 'bg-amber-50 text-amber-600 border-amber-100',
      to: '/privileges',
      perm: 'privilege:read',
    },
    {
      title: 'Active Work Orders',
      value: stats.ordersCount,
      icon: Boxes,
      color: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      to: '/mes/work-orders',
      perm: 'mes:order:read',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">
            Welcome back, {user?.full_name || user?.email}!
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Manufacturing Execution System with Role-Based Access Control and Decoupled Microservices.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            IAM Service: Healthy
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-50 border border-sky-200 text-sky-700 text-xs font-semibold">
            <Server className="w-3.5 h-3.5" />
            FastAPI Microservice
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between"
            >
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  {kpi.title}
                </span>
                <span className="text-2xl font-bold text-slate-800 mt-1 block">
                  {stats.loading ? '...' : kpi.value}
                </span>
                <Can I={kpi.perm}>
                  <Link
                    to={kpi.to}
                    className="inline-flex items-center gap-1 text-xs font-medium text-sky-600 hover:text-sky-700 mt-2"
                  >
                    Manage <ArrowRight className="w-3 h-3" />
                  </Link>
                </Can>
              </div>
              <div className={`p-3 rounded-xl border ${kpi.color}`}>
                <Icon className="w-6 h-6" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Security Profile & Active Permissions Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm lg:col-span-1">
          <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-sky-600" />
            Your Access Profile
          </h3>
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-slate-400 text-xs block">Email</span>
              <span className="font-medium text-slate-700">{user?.email}</span>
            </div>
            <div>
              <span className="text-slate-400 text-xs block">Authentication Provider</span>
              <Badge variant="neutral">{user?.auth_provider || 'local'}</Badge>
            </div>
            <div>
              <span className="text-slate-400 text-xs block mb-1">Assigned Roles</span>
              <div className="flex flex-wrap gap-1.5">
                {user?.roles?.map((r) => (
                  <Badge key={r} variant="primary">
                    {r}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <span className="text-slate-400 text-xs block">Administrative Status</span>
              {user?.is_superuser ? (
                <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                  Super Administrator (All Access)
                </span>
              ) : (
                <span className="text-xs text-slate-600">Standard Role-Gated Access</span>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <Key className="w-5 h-5 text-amber-500" />
              Effective Privileges in Current Session
            </h3>
            <span className="text-xs font-medium text-slate-400">
              {user?.permissions?.length || 0} permissions granted
            </span>
          </div>

          <div className="max-h-56 overflow-y-auto border border-slate-100 rounded-lg p-3 bg-slate-50">
            {user?.is_superuser ? (
              <div className="p-3 bg-purple-50 rounded-lg border border-purple-200 text-purple-800 text-xs font-mono">
                Wildcard Privilege: * (Full Access to every module, endpoint, and UI view)
              </div>
            ) : user?.permissions && user.permissions.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {user.permissions.map((p) => (
                  <span
                    key={p}
                    className="font-mono text-xs px-2 py-1 rounded bg-white border border-slate-200 text-slate-700 shadow-2xs"
                  >
                    {p}
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400 text-xs">
                No granular privileges assigned to your roles yet.
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Sidebar items and API buttons adapt dynamically based on these privileges.
            </p>
            <Can I="role:create">
              <Link
                to="/roles"
                className="text-xs font-semibold text-sky-600 hover:text-sky-700"
              >
                Configure Roles & Privileges &rarr;
              </Link>
            </Can>
          </div>
        </div>
      </div>
    </div>
  );
};
