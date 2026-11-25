import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Can } from '../../components/auth/Can';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Key, Plus, Trash2, Lock, AlertCircle } from 'lucide-react';

export const PrivilegeList = () => {
  const [privileges, setPrivileges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    resource: '',
    action: '',
    name: '',
    description: '',
  });

  const loadPrivileges = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/privileges');
      setPrivileges(data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load privileges');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPrivileges();
  }, []);

  const handleOpenCreate = () => {
    setFormData({ resource: '', action: '', name: '', description: '' });
    setIsModalOpen(true);
  };

  const handleResourceActionChange = (field, val) => {
    const updated = { ...formData, [field]: val };
    if (updated.resource && updated.action) {
      updated.name = `${updated.resource.toLowerCase().trim()}:${updated.action.toLowerCase().trim()}`;
    }
    setFormData(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/privileges', {
        resource: formData.resource,
        action: formData.action,
        name: formData.name,
        description: formData.description,
      });
      setIsModalOpen(false);
      loadPrivileges();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to register privilege');
    }
  };

  const handleDelete = async (privId, privName) => {
    if (!window.confirm(`Delete privilege '${privName}'?`)) return;
    try {
      await api.delete(`/privileges/${privId}`);
      loadPrivileges();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete privilege');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Privilege Registry</h2>
          <p className="text-sm text-slate-500">
            System and custom permissions following the <code className="text-xs bg-slate-100 px-1 py-0.5 rounded text-sky-700 font-mono">resource:action</code> convention.
          </p>
        </div>
        <Can I="privilege:create">
          <Button onClick={handleOpenCreate} className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> Register Custom Privilege
          </Button>
        </Can>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Privileges Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Privilege Name</th>
                <th className="py-3.5 px-4">Resource</th>
                <th className="py-3.5 px-4">Action</th>
                <th className="py-3.5 px-4">Description</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-400">Loading privileges...</td>
                </tr>
              ) : (
                privileges.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/75 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-sky-700">{p.name}</td>
                    <td className="py-3 px-4">
                      <Badge variant="neutral">{p.resource}</Badge>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-600">{p.action}</td>
                    <td className="py-3 px-4 text-slate-500 text-xs">{p.description || '—'}</td>
                    <td className="py-3 px-4">
                      {p.is_system ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                          <Lock className="w-2.5 h-2.5" /> Built-in
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                          Custom
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {!p.is_system && (
                        <Can I="privilege:delete">
                          <button
                            onClick={() => handleDelete(p.id, p.name)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50"
                            title="Delete Privilege"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </Can>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Privilege Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Register Custom Privilege">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Resource Module *</label>
              <input
                type="text"
                required
                placeholder="e.g. inventory"
                value={formData.resource}
                onChange={(e) => handleResourceActionChange('resource', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Action *</label>
              <input
                type="text"
                required
                placeholder="e.g. transfer"
                value={formData.action}
                onChange={(e) => handleResourceActionChange('action', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Generated Permission String</label>
            <input
              type="text"
              readOnly
              value={formData.name || '—'}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono text-sky-800"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
            <textarea
              rows={2}
              placeholder="What access does this permission grant?"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Register Privilege</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
