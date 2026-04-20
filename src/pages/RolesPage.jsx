import React, { useState, useEffect } from 'react';
import { rolesAPI, departmentsAPI } from '../services/api';
import { useAsync } from '../hooks/useAsync';
import LoadingButton from '../components/ui/LoadingButton';
import { ConfirmDialog } from '../components/layout/Layout';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'react-toastify';

function buildTree(roles, parentId = null) {
  return roles
    .filter(r => (r.parent_role_id || null) === parentId)
    .sort((a, b) => a.level - b.level)
    .map(r => ({ ...r, sub_roles: buildTree(roles, r.id) }));
}

function RoleNode({ node }) {
  const colors = ['#0d5c7a','#1a8cad','#29b6e0','#0ea5e9','#38bdf8','#7dd3fc','#bae6fd'];
  const color = colors[Math.min((node.level || 1) - 1, 6)];
  const hasChildren = node.sub_roles && node.sub_roles.length > 0;
  return (
    <div className="role-node">
      <div className="role-card" style={{ borderLeftColor: color }}>
        <div className="role-info">
          <div className="role-title">{node.name}</div>
          <div className="role-code">{node.code}</div>
        </div>
        <div className="role-level">L{node.level}</div>
      </div>
      {hasChildren && (
        <div className="role-children">
          <div className="vertical-connector" />
          <div className="children-container">
            {node.sub_roles.map(child => <RoleNode key={child.id} node={child} />)}
          </div>
        </div>
      )}
    </div>
  );
}

export default function RolesPage() {
  const { can } = useAuth();
  const [allRoles, setAllRoles] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [tab, setTab] = useState('tree');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState({ name: '', code: '', department_id: '', parent_role_id: '', level: 1, description: '' });
  const { run, loading: saving } = useAsync();
  const [filterDept, setFilterDept] = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([rolesAPI.tree(), departmentsAPI.list()])
      .then(([rRes, dRes]) => {
        setAllRoles(rRes.data || []);
        setDepartments(dRes.data || []);
      })
      .catch(() => toast.error('Failed to load data'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setForm({ name: '', code: '', department_id: '', parent_role_id: '', level: 1, description: '' });
    setModal(true);
  };

  const save = () => run(async () => {
    try {
      const payload = { ...form, level: Number(form.level) };
      if (!payload.parent_role_id) delete payload.parent_role_id;
      await rolesAPI.create(payload);
      toast.success('Role created successfully');
      setModal(false);
      setForm({ name: '', code: '', department_id: '', parent_role_id: '', level: 1, description: '' });
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to create role');
    }
  });

  const confirmDelete = async () => {
    try {
      await rolesAPI.delete(deleteTarget.id);
      toast.success('Role deleted');
      load();
    } catch { toast.error('Cannot delete — linked to employees'); }
    finally { setDeleteTarget(null); }
  };

  const filteredRoles = filterDept ? allRoles.filter(r => r.department_id === filterDept) : allRoles;
  const treeByDept = departments
    .map(dept => {
      const deptRoles = allRoles.filter(r => r.department_id === dept.id);
      return { dept, tree: buildTree(deptRoles) };
    })
    .filter(x => x.tree.length > 0);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Roles & Structure</h1>
          <p className="page-subtitle">Role hierarchy across all departments</p>
        </div>
        {can('can_manage_roles') && (
          <button className="btn btn-primary" onClick={openCreate}>+ Add Role</button>
        )}
      </div>

      <div className="tabs">
        <div className={`tab ${tab === 'tree' ? 'active' : ''}`} onClick={() => setTab('tree')}>🌳 Role Tree</div>
        <div className={`tab ${tab === 'list' ? 'active' : ''}`} onClick={() => setTab('list')}>📋 All Roles</div>
      </div>

      {loading ? (
        <div className="loading-overlay"><div className="spinner" /></div>
      ) : tab === 'tree' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px,1fr))', gap: 20 }}>
          {treeByDept.map(({ dept, tree }) => (
            <div key={dept.id} className="card">
              <div className="card-header">
                <span className="card-title">🏢 {dept.name}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {tree.length} top-level role{tree.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="org-chart">
                {tree.map(node => <RoleNode key={node.id} node={node} />)}
              </div>
            </div>
          ))}
          {treeByDept.length === 0 && (
            <div className="empty-state" style={{ gridColumn: '1/-1' }}>
              <div className="empty-state-icon">🏗</div>
              <h3>No roles defined yet</h3>
              <p>Create your first role to build the hierarchy</p>
            </div>
          )}
        </div>
      ) : (
        <div className="card">
          <div className="card-header" style={{ flexWrap: 'wrap', gap: 12 }}>
            <span className="card-title">All Roles ({filteredRoles.length})</span>
            <select className="form-control" style={{ width: 'auto', minWidth: 180 }} value={filterDept} onChange={e => setFilterDept(e.target.value)}>
              <option value="">All Departments</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Role</th>
                  <th>Code</th>
                  <th>Department</th>
                  <th>Level</th>
                  <th>Parent Role</th>
                  <th>Status</th>
                  {can('can_manage_roles') && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredRoles.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600 }}>{r.name}</td>
                    <td><code style={{ fontSize: 12, background: 'var(--bg)', padding: '2px 6px', borderRadius: 4 }}>{r.code}</code></td>
                    <td>{r.department_name || '—'}</td>
                    <td><span className="badge badge-new">L{r.level}</span></td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      {r.parent_role_id ? allRoles.find(x => x.id === r.parent_role_id)?.name || '—' : '—'}
                    </td>
                    <td><span className={`badge ${r.is_active ? 'badge-active' : 'badge-inactive'}`}>{r.is_active ? 'Active' : 'Inactive'}</span></td>
                    {can('can_manage_roles') && (
                      <td>
                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => setDeleteTarget(r)}>🗑 Delete</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Role Modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">➕ Add New Role</span>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label required">Role Name</label>
                  <input className="form-control" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Senior Software Engineer" autoFocus />
                </div>
                <div className="form-group">
                  <label className="form-label required">Code</label>
                  <input className="form-control" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="IT-SSE" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label required">Department</label>
                  <select className="form-control" value={form.department_id} onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))}>
                    <option value="">Select Department</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Level</label>
                  <input type="number" min="1" max="10" className="form-control" value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Parent Role</label>
                <select className="form-control" value={form.parent_role_id} onChange={e => setForm(f => ({ ...f, parent_role_id: e.target.value }))}>
                  <option value="">None (Top Level)</option>
                  {allRoles
                    .filter(r => !form.department_id || r.department_id === form.department_id)
                    .map(r => <option key={r.id} value={r.id}>{r.name} (L{r.level})</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-control" rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Role description..." />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
              <LoadingButton className="btn btn-primary" loading={saving} onClick={save} disabled={!form.name || !form.code || !form.department_id}>
                Create Role
              </LoadingButton>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <ConfirmDialog
          title="🗑 Delete Role"
          message={`Are you sure you want to delete the role "${deleteTarget.name}"? This cannot be undone.`}
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
