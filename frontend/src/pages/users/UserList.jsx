import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { Can } from '../../components/auth/Can';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import {
  UserPlus,
  Search,
  Edit2,
  Trash2,
  Shield,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';

export const UserList = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    is_active: true,
    role_ids: [],
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersRes, rolesRes] = await Promise.all([
        api.get(`/users${search ? `?search=${encodeURIComponent(search)}` : ''}`),
        api.get('/roles'),
      ]);
      setUsers(usersRes.data);
      setRoles(rolesRes.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search]);

  const handleOpenCreate = () => {
    setFormData({
      email: '',
      password: '',
      first_name: '',
      last_name: '',
      is_active: true,
      role_ids: [],
    });
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (user) => {
    setSelectedUser(user);
    setFormData({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      is_active: user.is_active,
      password: '',
      role_ids: user.roles ? user.roles.map((r) => r.id) : [],
    });
    setIsEditOpen(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/users', formData);
      setIsCreateOpen(false);
      loadData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Error creating user');
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        is_active: formData.is_active,
        role_ids: formData.role_ids,
      };
      if (formData.password) {
        payload.password = formData.password;
      }
      await api.put(`/users/${selectedUser.id}`, payload);
      setIsEditOpen(false);
      loadData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Error updating user');
    }
  };

  const handleDelete = async (userId, email) => {
    if (!window.confirm(`Are you sure you want to delete user '${email}'?`)) return;
    try {
      await api.delete(`/users/${userId}`);
      loadData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete user');
    }
  };

  const toggleRoleSelection = (roleId) => {
    setFormData((prev) => {
      const exists = prev.role_ids.includes(roleId);
      return {
        ...prev,
        role_ids: exists
          ? prev.role_ids.filter((id) => id !== roleId)
          : [...prev.role_ids, roleId],
      };
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">User Management</h2>
          <p className="text-sm text-slate-500">
            Create user accounts, assign roles, and manage active status.
          </p>
        </div>
        <Can I="user:create">
          <Button onClick={handleOpenCreate} className="flex items-center gap-2">
            <UserPlus className="w-4 h-4" /> Add User
          </Button>
        </Can>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">User</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Provider</th>
                <th className="py-3.5 px-4">Assigned Roles</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-slate-400">
                    Loading users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-slate-400">
                    No users found matching search.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/75 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-900">{u.first_name || u.last_name ? `${u.first_name || ''} ${u.last_name || ''}`.trim() : '—'}</div>
                      <div className="text-xs text-slate-500">{u.email}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      {u.is_active ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                          <XCircle className="w-3 h-3" /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant={u.auth_provider === 'google' ? 'warning' : 'neutral'}>
                        {u.auth_provider}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1">
                        {u.is_superuser && (
                          <Badge variant="purple">Super Admin</Badge>
                        )}
                        {u.roles?.map((r) => (
                          <Badge key={r.id} variant="primary">
                            {r.name}
                          </Badge>
                        ))}
                        {(!u.roles || u.roles.length === 0) && !u.is_superuser && (
                          <span className="text-xs text-slate-400 italic">No roles</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Can I="user:update">
                          <button
                            onClick={() => handleOpenEdit(u)}
                            className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-slate-100 rounded-md transition-colors"
                            title="Edit User & Roles"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </Can>
                        <Can I="user:delete">
                          {currentUser?.id !== u.id && (
                            <button
                              onClick={() => handleDelete(u.id, u.email)}
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                              title="Delete User"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </Can>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create New User">
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">First Name</label>
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name</label>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Password *</label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">Assign Roles</label>
            <div className="space-y-2 border border-slate-200 rounded-lg p-3 max-h-40 overflow-y-auto bg-slate-50">
              {roles.map((role) => (
                <label key={role.id} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.role_ids.includes(role.id)}
                    onChange={() => toggleRoleSelection(role.id)}
                    className="rounded text-sky-600 focus:ring-sky-500"
                  />
                  <span className="font-medium">{role.name}</span>
                  <span className="text-xs text-slate-400">({role.description || 'No description'})</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="is_active_create"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="rounded text-sky-600 focus:ring-sky-500"
            />
            <label htmlFor="is_active_create" className="text-sm text-slate-700 font-medium cursor-pointer">
              Account Active
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create User</Button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title={`Edit User: ${selectedUser?.email}`}>
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">First Name</label>
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name</label>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reset Password (leave empty to keep current)
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">Assign Roles</label>
            <div className="space-y-2 border border-slate-200 rounded-lg p-3 max-h-40 overflow-y-auto bg-slate-50">
              {roles.map((role) => (
                <label key={role.id} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.role_ids.includes(role.id)}
                    onChange={() => toggleRoleSelection(role.id)}
                    className="rounded text-sky-600 focus:ring-sky-500"
                  />
                  <span className="font-medium">{role.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="is_active_edit"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="rounded text-sky-600 focus:ring-sky-500"
            />
            <label htmlFor="is_active_edit" className="text-sm text-slate-700 font-medium cursor-pointer">
              Account Active
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
