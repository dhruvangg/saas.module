import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { FileText, Clock, User, AlertCircle } from 'lucide-react';
import { Badge } from '../../components/common/Badge';

export const AuditLogList = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/audit?limit=50');
      setLogs(data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load audit trail');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Security & Audit Trail</h2>
        <p className="text-sm text-slate-500">
          Traceability log tracking administrative actions, user creation, role modifications, and login events.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4">Action</th>
                <th className="py-3.5 px-4">Resource</th>
                <th className="py-3.5 px-4">Actor</th>
                <th className="py-3.5 px-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-slate-400">Loading audit trail...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-slate-400">No audit events recorded yet.</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/75 transition-colors">
                    <td className="py-3 px-4 text-xs text-slate-500 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs font-semibold text-slate-800">
                      <Badge variant={log.action.includes('DELETE') ? 'danger' : log.action.includes('CREATE') ? 'success' : 'primary'}>
                        {log.action}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-xs font-medium text-slate-600 uppercase">
                      {log.resource}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-700">
                      {log.user_email || 'System / Anonymous'}
                    </td>
                    <td className="py-3 px-4 text-xs font-mono text-slate-500 max-w-xs truncate">
                      {log.details ? JSON.stringify(log.details) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
