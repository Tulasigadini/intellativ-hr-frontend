import React, { useState, useEffect } from 'react';
import { rolesAPI, departmentsAPI } from '../services/api';
import { useAsync } from '../hooks/useAsync';
import LoadingButton from '../components/ui/LoadingButton';
import { ConfirmDialog } from '../components/layout/Layout';
import { toast } from 'react-toastify';

function RoleNode({ role, depth = 0, onEdit, onDelete }) {
  const [open, setOpen] = useState(true);
  const hasChildren = role.children && role.children.length > 0;
  const borderColors = ['#0d5c7a', '#29b6e0', '#7dd6f0', '#b0e0f7'];
  const borderColor = borderColors[Math.min(depth, borderColors.length - 1)];

  return (
    <div style={{ marginBottom: 8 }}>
      <div
        className="role-node-item"
        style={{ borderLeft: `4px solid ${borderColor}`, marginLeft: depth * 20 }}
      >
        {hasChildren && (
          <button
            className="btn btn-ghost btn-icon"
            style={{ padding: '4px 6px', fontSize: 12 }}
            onClick={() => setOpen(o => !o)}
          >
            {open ? '▾' : '▸'}
          </button>
        )}
        {!hasChildren && <span style={{ width: 28 }} />}

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{role.title}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
            {role.code}
          </div>
        </div>

        <span className="role-node-level">L{role.level}</span>

        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-outline btn-sm" onClick={() => onEdit(role)}>Edit</button>
          <button className="btn btn-danger btn-sm" onClick={() => onDelete(role)}>Delete</button>
        </div>
      </div>

      {open && hasChildren && (
        <div>
          {role.children.map(child => (
            <RoleNode key={child.id} role={child} depth={depth + 1} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function RolesPage() {
  const [hierarchy, setHierarchy] = useState([]);
  const [flatRoles, setFlatRoles] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [modal, setModal]         = useState(null); // null | 'create' | role object
  const [form, setForm]           = useState({ title: '', code: '', level: 1, parent_id: '' });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const { run, loading: saving }  = useAsync();

  const load = () => {
    setLoading(true);
    Promise.all([rolesAPI.getHierarchy(), rolesAPI.list()])
      .then(([h, f]) => {
        setHierarchy(h.data || []);
        setFlatRoles(f.data || []);
      })
      .catch(() => toast.error('Failed to load roles'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setForm({ title: '', code: '', level: 1, parent_id: '' });
    setModal('create');
  };

  const openEdit = (role) => {
    setForm({ title: role.title, code: role.code, level: role.level, parent_id: role.parent_id || '' });
    setModal(role);
  };

  const handleSave = () => {
    if (!form.title.trim() || !form.code.trim()) {
      toast.error('Title and code are required');
      return;
    }
    run(async () => {
      const payload = {
        title: form.title.trim(),
        code: form.code.trim().toUpperCase(),
        level: Number(form.level),
        parent_id: form.parent_id || null,
      };
      try {
        if (modal === 'create') {
          await rolesAPI.create(payload);
          toast.success('Role created');
        } else {
          await rolesAPI.update(modal.id, payload);
          toast.success('Role updated');
        }
        setModal(null);
        load();
      } catch (e) {
        toast.error(e?.response?.data?.detail || 'Save failed');
      }
    });
  };

  const handleDelete = () => {
    run(async () => {
      try {
        await rolesAPI.delete(deleteTarget.id);
        toast.success('Role deleted');
        setDeleteTarget(null);
        load();
      } catch (e) {
        toast.error(e?.response?.data?.detail || 'Delete failed');
      }
    });
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Roles & Structure</h1>
          <p className="page-subtitle">Manage organizational role hierarchy</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Add Role</button>
      </div>

      {loading ? (
        <div className="loading-overlay"><div className="spinner" /></div>
      ) : hierarchy.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">🏗</div>
            <h3>No roles defined yet</h3>
            <p>Create your first role to build the hierarchy.</p>
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={openCreate}>
              Create Role
            </button>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Role Hierarchy</span>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{flatRoles.length} roles total</span>
          </div>
          <div>
            {hierarchy.map(role => (
              <RoleNode
                key={role.id}
                role={role}
                onEdit={openEdit}
                onDelete={(r) => setDeleteTarget(r)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {modal !== null && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{modal === 'create' ? 'Create Role' : 'Edit Role'}</span>
              <button className="btn btn-ghost btn-icon" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label required">Role Title</label>
                  <input
                    className="form-control"
                    value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. Senior Engineer"
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label className="form-label required">Role Code</label>
                  <input
                    className="form-control"
                    value={form.code}
                    onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. SE-001"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label required">Level</label>
                  <input
                    className="form-control"
                    type="number"
                    min="1" max="10"
                    value={form.level}
                    onChange={e => setForm({ ...form, level: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Reports To (Parent)</label>
                  <select
                    className="form-control"
                    value={form.parent_id}
                    onChange={e => setForm({ ...form, parent_id: e.target.value })}
                  >
                    <option value="">— None (Top Level) —</option>
                    {flatRoles
                      .filter(r => modal === 'create' || r.id !== modal?.id)
                      .map(r => (
                        <option key={r.id} value={r.id}>{r.title} ({r.code})</option>
                      ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              <LoadingButton className="btn btn-primary" loading={saving} onClick={handleSave}>
                {modal === 'create' ? 'Create Role' : 'Save Changes'}
              </LoadingButton>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <ConfirmDialog
          title="Delete Role"
          message={`Are you sure you want to delete "${deleteTarget.title}"? This cannot be undone.`}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          variant="danger"
        />
      )}
    </>
  );
}
