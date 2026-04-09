import React, { useState, useEffect } from 'react';
import { departmentsAPI } from '../services/api';
import { useAsync } from '../hooks/useAsync';
import LoadingButton from '../components/ui/LoadingButton';
import { toast } from 'react-toastify';

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'create' | dept object
  const [form, setForm] = useState({ name: '', code: '', description: '' });
  const { run, loading: saving } = useAsync();

  const load = () => {
    setLoading(true);
    departmentsAPI.list()
      .then(r => setDepartments(r.data))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setForm({ name: '', code: '', description: '' });
    setModal('create');
  };

  const openEdit = (dept) => {
    setForm({ name: dept.name, code: dept.code, description: dept.description || '' });
    setModal(dept);
  };

  const save = () => run(async () => {
    try {
      if (modal === 'create') {
        await departmentsAPI.create(form);
        toast.success('Department created');
      } else {
        await departmentsAPI.update(modal.id, { name: form.name, description: form.description });
        toast.success('Department updated');
      }
      load(); setModal(null);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to save');
    }
  });

  const del = async (id) => {
    if (!window.confirm('Delete this department?')) return;
    try {
      await departmentsAPI.delete(id);
      toast.success('Deleted');
      load();
    } catch { toast.error('Cannot delete — has linked employees or roles'); }
  };

  const ICONS = { IT: '💻', HR: '👥', FIN: '💰', SAL: '📈', MKT: '📣', OPS: '⚙️', ADM: '🏛' };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Departments</h1>
          <p className="page-subtitle">Manage organizational departments</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Add Department</button>
      </div>

      {loading ? (
        <div className="loading-overlay"><div className="spinner" /></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px,1fr))', gap: 16 }}>
          {departments.map(dept => (
            <div key={dept.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{
                background: `linear-gradient(135deg, var(--primary), var(--primary-light))`,
                padding: '20px 24px 16px',
                color: '#fff',
              }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>
                  {ICONS[dept.code] || '🏢'}
                </div>
                <div style={{ fontWeight: 800, fontSize: 16 }}>{dept.name}</div>
                <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>Code: {dept.code}</div>
              </div>
              <div style={{ padding: '16px 24px' }}>
                {dept.description && (
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.5 }}>
                    {dept.description}
                  </p>
                )}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className={`badge ${dept.is_active ? 'badge-active' : 'badge-inactive'}`}>
                    {dept.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(dept)}>✏️ Edit</button>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => del(dept.id)}>🗑</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {departments.length === 0 && (
            <div className="empty-state" style={{ gridColumn: '1/-1' }}>
              <div className="empty-state-icon">🏢</div>
              <h3>No departments yet</h3>
              <p>Create your first department to get started</p>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{modal === 'create' ? 'Add Department' : 'Edit Department'}</span>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label required">Name</label>
                <input className="form-control" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              {modal === 'create' && (
                <div className="form-group">
                  <label className="form-label required">Code</label>
                  <input className="form-control" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="e.g. IT, HR, FIN" />
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-control" rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              <LoadingButton className="btn btn-primary" loading={saving} loadingText="Saving…" onClick={save} disabled={!form.name || (modal === 'create' && !form.code)}>Save</LoadingButton>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
