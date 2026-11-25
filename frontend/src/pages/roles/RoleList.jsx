import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { Can } from '../../components/auth/Can';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import {
  ShieldCheck,
  Plus,
  Edit2,
  Trash2,
  Key,
  Lock,
  AlertCircle
} from 'lucide-react';

export const RoleList = () => {
  const [roles, setRoles] = useState([]);
  const [groupedPrivileges, setGroupedPrivileges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    privilege_ids: [],
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [rolesRes, privsRes] = await Promise.all([
        api.get('/roles'),
        api.get('/privileges/grouped'),
      ]);
      setRoles(rolesRes.data);
      setGroupedPrivileges(privsRes.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load roles and privileges');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreate = () => {
    setEditingRole(null);
    setFormData({
      name: '',
      description: '',
      privilege_ids: [],
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (role) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      description: role.description || '',
      privilege_ids: role.privileges ? role.privileges.map((p) => p.id) : [],
    });
    setIsModalOpen(true);
  };

  const togglePrivilege = (privId) => {
    setFormData((prev) => {
      const exists = prev.privilege_ids.includes(privId);
      return {
        ...prev,
        privilege_ids: exists
          ? prev.privilege_ids.filter((id) => id !== privId)
          : [...prev.privilege_ids, privId],
      };
    });
  };

  const selectAllInGroup = (privilegesInGroup) => {
    const groupIds = privilegesInGroup.map((p) => p.id);
    setFormData((prev) => {
      const allSelected = groupIds.every((id) => prev.privilege_ids.includes(id));
      if (allSelected) {
        return {
          ...prev,
          privilege_ids: prev.privilege_ids.filter((id) => !groupIds.includes(id)),
        };
      } else {
        return {
          ...prev,
          privilege_ids: Array.from(new Set([...prev.privilege_ids, ...groupIds])),
        };
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingRole) {
        await api.put(`/roles/${editingRole.id}`, formData);
      } else {
        await api.post('/roles', formData);
      }
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to save role');
    }
  };

  const handleDelete = async (roleId, roleName) => {
    if (!window.confirm(`Are you sure you want to delete role '${roleName}'?`)) return;
    try {
      await api.delete(`/roles/${roleId}`);
      loadData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete role');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Role-Based Access Control (RBAC)</h2>
          <p className="text-sm text-slate-500">
            Define roles and configure permission matrices granted to each role.
          </p>
        </div>
        <Can I="role:create">
          <Button onClick={handleOpenCreate} className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> Create New Role
          </Button>
        </Can>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-400">Loading roles...</div>
        ) : (
          roles.map((role) => (
            <div
              key={role.id}
              className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between hover:border-slate-300 transition-colors"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-sky-600" />
                    <h3 className="font-semibold text-slate-800 text-base">{role.name}</h3>
                  </div>
                  {role.is_system && (
                    <Badge variant="purple" className="flex items-center gap-1">
                      <Lock className="w-3 h-3" /> System
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-2 line-clamp-2">
                  {role.description || 'No description specified.'}
                </p>

                {/* Assigned privileges tags */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-600">Assigned Privileges</span>
                    <span className="text-xs text-slate-400 font-mono">
                      {role.privileges?.length || 0}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
                    {role.privileges?.length > 0 ? (
                      role.privileges.map((p) => (
                        <span
                          key={p.id}
                          className="font-mono text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200"
                        >
                          {p.name}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400 italic">No privileges assigned</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <Can I="role:update">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleOpenEdit(role)}
                    className="flex items-center gap-1 text-xs"
                  >
                    <Edit2 className="w-3 h-3" /> Edit Privileges
                  </Button>
                </Can>
                <Can I="role:delete">
                  {!role.is_system && (
                    <button
                      onClick={() => handleDelete(role.id, role.name)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors"
                      title="Delete Role"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </Can>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create / Edit Role Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingRole ? `Edit Role: ${editingRole.name}` : 'Create New Role'}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Role Name *</label>
            <input
              type="text"
              required
              disabled={editingRole?.is_system}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Production Supervisor"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 disabled:bg-slate-100 disabled:text-slate-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Operational responsibilities and scope for this role..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Privilege Matrix (Grouped by Resource Module)
            </label>
            <div className="space-y-4 border border-slate-200 rounded-xl p-4 max-h-80 overflow-y-auto bg-slate-50">
              {groupedPrivileges.map((group) => {
                const groupIds = group.privileges.map((p) => p.id);
                const allSelected = groupIds.every((id) => formData.privilege_ids.includes(id));

                return (
                  <div key={group.resource} className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                      <span className="font-bold text-xs uppercase tracking-wide text-sky-700">
                        Module: {group.resource}
                      </span>
                      <button
                        type="button"
                        onClick={() => selectAllInGroup(group.privileges)}
                        className="text-xs text-sky-600 hover:text-sky-800 font-medium"
                      >
                        {allSelected ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {group.privileges.map((priv) => (
                        <label
                          key={priv.id}
                          className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer p-1 rounded hover:bg-slate-50"
                        >
                          <input
                            type="checkbox"
                            checked={formData.privilege_ids.includes(priv.id)}
                            onChange={() => togglePrivilege(priv.id)}
                            className="mt-0.5 rounded text-sky-600 focus:ring-sky-500"
                          />
                          <div>
                            <span className="font-mono font-medium block text-slate-900">{priv.name}</span>
                            <span className="text-[11px] text-slate-400">{priv.description}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {editingRole ? 'Update Role' : 'Create Role'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
