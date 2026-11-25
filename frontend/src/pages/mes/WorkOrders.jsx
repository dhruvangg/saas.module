import React, { useState } from 'react';
import { Can } from '../../components/auth/Can';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Boxes, Plus, CheckCircle, Clock, PlayCircle } from 'lucide-react';

export const WorkOrders = () => {
  const [orders, setOrders] = useState([
    {
      id: 1,
      order_number: 'WO-2026-001',
      product_code: 'MOTOR-ASSEMBLY-V2',
      target_quantity: 500,
      completed_quantity: 340,
      line_id: 'LINE-01',
      status: 'IN_PROGRESS',
      created_by: 'admin@boilerplate.com',
    },
    {
      id: 2,
      order_number: 'WO-2026-002',
      product_code: 'CIRCUIT-BOARD-PCB7',
      target_quantity: 1200,
      completed_quantity: 0,
      line_id: 'LINE-03',
      status: 'SCHEDULED',
      created_by: 'admin@boilerplate.com',
    },
    {
      id: 3,
      order_number: 'WO-2026-003',
      product_code: 'SENSOR-OPTICAL-X4',
      target_quantity: 800,
      completed_quantity: 800,
      line_id: 'LINE-02',
      status: 'COMPLETED',
      created_by: 'admin@boilerplate.com',
    },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    order_number: '',
    product_code: '',
    target_quantity: '',
    line_id: 'LINE-01',
  });

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    const newOrder = {
      id: orders.length + 1,
      order_number: formData.order_number,
      product_code: formData.product_code,
      target_quantity: parseInt(formData.target_quantity, 10),
      completed_quantity: 0,
      line_id: formData.line_id,
      status: 'SCHEDULED',
      created_by: 'current-user@boilerplate.com',
    };
    setOrders([newOrder, ...orders]);
    setIsModalOpen(false);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge variant="success" className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Completed</Badge>;
      case 'IN_PROGRESS':
        return <Badge variant="primary" className="flex items-center gap-1"><PlayCircle className="w-3 h-3" /> In Progress</Badge>;
      default:
        return <Badge variant="neutral" className="flex items-center gap-1"><Clock className="w-3 h-3" /> Scheduled</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">MES Work Orders</h2>
          <p className="text-sm text-slate-500">
            Shopfloor production jobs and manufacturing tracking.
          </p>
        </div>
        <Can I="mes:order:create">
          <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> Schedule Work Order
          </Button>
        </Can>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {orders.map((order) => {
          const progressPct = Math.round((order.completed_quantity / order.target_quantity) * 100);
          return (
            <div
              key={order.id}
              className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:border-slate-300 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-xs font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-100">
                  {order.order_number}
                </span>
                {getStatusBadge(order.status)}
              </div>

              <h4 className="font-semibold text-slate-900 text-sm">{order.product_code}</h4>
              <div className="text-xs text-slate-400 mt-0.5">Assigned to: {order.line_id}</div>

              {/* Production Progress Bar */}
              <div className="mt-4">
                <div className="flex justify-between text-xs font-medium text-slate-600 mb-1">
                  <span>Progress ({order.completed_quantity} / {order.target_quantity} units)</span>
                  <span>{progressPct}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${
                      progressPct >= 100 ? 'bg-emerald-500' : 'bg-sky-600'
                    }`}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Schedule Work Order Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Schedule New Work Order">
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Work Order # *</label>
            <input
              type="text"
              required
              placeholder="e.g. WO-2026-004"
              value={formData.order_number}
              onChange={(e) => setFormData({ ...formData, order_number: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Product Code *</label>
            <input
              type="text"
              required
              placeholder="e.g. PCB-CONTROLLER-REV3"
              value={formData.product_code}
              onChange={(e) => setFormData({ ...formData, product_code: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Target Quantity *</label>
              <input
                type="number"
                required
                min="1"
                placeholder="1000"
                value={formData.target_quantity}
                onChange={(e) => setFormData({ ...formData, target_quantity: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Production Line *</label>
              <select
                value={formData.line_id}
                onChange={(e) => setFormData({ ...formData, line_id: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 bg-white"
              >
                <option value="LINE-01">LINE-01 (SMT Surface Mount)</option>
                <option value="LINE-02">LINE-02 (Final Assembly)</option>
                <option value="LINE-03">LINE-03 (Packaging & Box)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Work Order</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
