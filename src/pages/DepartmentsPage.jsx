import React, { useState, useEffect } from 'react';
import { departmentsAPI } from '../services/api';
import { useAsync } from '../hooks/useAsync';
import LoadingButton from '../components/ui/LoadingButton';
import { ConfirmDialog } from '../components/layout/Layout';
import { toast } from 'react-toastify';

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'create' | dept object
  const [form, setForm] = useState({ name: '', code: '', description: '' });
  const [deleteTarget, setDeleteTarget] = useState(null);
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
    setForm({ name: dept.name || '', code: dept.code || '', description: dept.description || '' });
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

  const confirmDelete = async () => {
    try {
      await departmentsAPI.delete(deleteTarget.id);
      toast.success('Department deleted');
      load();
    } catch { toast.error('Cannot delete — has linked employees or roles'); }
    finally { setDeleteTarget(null); }
  };

  const ICONS = { IT: '💻', HR: '👥', FIN: '💰', SAL: '📈', MKT: '📣', OPS: '⚙️', ADM: '🏛' };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Departments</h1>
          <p className="page-subtitle">Manage organizational departments</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Add Department</button>
      </div>

      {loading ? (
        <div className="loading-overlay"><div className="spinner" /></div>
      ) : (
        <div className="dept-grid">
          {departments.map(dept => (
            <div key={dept.id} className="card dept-card">
              <div className="dept-card-header">
                <div style={{ fontSize: 32, marginBottom: 8 }}>{ICONS[dept.code] || '🏢'}</div>
                <div style={{ fontWeight: 800, fontSize: 16 }}>{dept.name}</div>
                <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>Code: {dept.code}</div>
              </div>
              <div className="dept-card-body">
                {dept.description && (
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.5 }}>
                    {dept.description}
                  </p>
                )}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <span className={`badge ${dept.is_active ? 'badge-active' : 'badge-inactive'}`}>
                    {dept.is_active ? '● Active' : '● Inactive'}
                  </span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(dept)}>✏️ Edit</button>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => setDeleteTarget(dept)}>🗑</button>
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

      {/* Create / Edit Modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{modal === 'create' ? '➕ Add Department' : `✏️ Edit — ${modal.name}`}</span>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label required">Name</label>
                <input
                  className="form-control"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Information Technology"
                  autoFocus
                />
              </div>
              {modal === 'create' ? (
                <div className="form-group">
                  <label className="form-label required">Code</label>
                  <input
                    className="form-control"
                    value={form.code}
                    onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                    placeholder="e.g. IT, HR, FIN"
                    maxLength={10}
                  />
                  <div className="form-hint">Short uppercase code (cannot be changed later)</div>
                </div>
              ) : (
                <div className="form-group">
                  <label className="form-label">Code</label>
                  <input className="form-control" value={form.code} disabled />
                  <div className="form-hint">Code cannot be changed after creation</div>
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Brief description of this department..."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              <LoadingButton
                className="btn btn-primary"
                loading={saving}
                loadingText="Saving…"
                onClick={save}
                disabled={!form.name || (modal === 'create' && !form.code)}
              >
                {modal === 'create' ? 'Create Department' : 'Save Changes'}
              </LoadingButton>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <ConfirmDialog
          title="🗑 Delete Department"
          message={`Are you sure you want to delete "${deleteTarget.name}"? This action cannot be undone.`}
          confirmLabel="Yes, Delete"
          cancelLabel="Cancel"
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
          variant="danger"
        />
      )}
    </>
  );
}
