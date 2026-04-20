import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { employeesAPI, departmentsAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'react-toastify';
import { ConfirmDialog } from '../components/layout/Layout';

const STATUS_OPTIONS = ['active','pending','inactive','relieved','suspended'];

export default function EmployeesPage() {
  const navigate = useNavigate();
  const { can } = useAuth();

  const canOnboard = can('can_onboard_employees');
  const canEdit   = can('can_edit_employees');
  const canViewDetail = can('can_view_employee_detail') || can('is_superadmin');
  const currentUserId = null; // employees page uses canViewDetail for others

  const [employees, setEmployees] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deptId, setDeptId] = useState('');
  const [departments, setDepartments] = useState([]);
  const [activateTarget, setActivateTarget] = useState(null);

  useEffect(() => {
    departmentsAPI.list().then(r => setDepartments(r.data)).catch(() => {});
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    const params = { page, size: 20 };
    if (search) params.search = search;
    if (statusFilter) params.status = statusFilter;
    if (deptId) params.department_id = deptId;
    employeesAPI.list(params)
      .then(r => {
        setEmployees(r.data.items);
        setTotal(r.data.total);
        setPages(r.data.pages);
      })
      .catch(() => toast.error('Failed to load employees'))
      .finally(() => setLoading(false));
  }, [page, search, statusFilter, deptId]);

  useEffect(() => { load(); }, [load]);

  const statusBadge = (s) => {
    const map = {
      active:    { cls: 'flag-success',  label: 'Active' },
      pending:   { cls: 'flag-warning',  label: 'Pending' },
      relieved:  { cls: 'flag-danger', label: 'Relieved' },
      inactive:  { cls: 'flag-muted', label: 'Inactive' },
      suspended: { cls: 'flag-danger', label: 'Suspended' },
    };
    const m = map[s] || { cls: 'flag-muted', icon: '○', label: s };
    return <span className={`flag ${m.cls}`}>{m.icon} {m.label}</span>;
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Employees</h1>
          <p className="page-subtitle">{total} total employees</p>
        </div>
        {canOnboard && (
          <button className="btn btn-primary" onClick={() => navigate('/onboarding')}>
            + Onboard Employee
          </button>
        )}
      </div>

      {/* Search & Filters — visible to everyone */}
      <div className="filter-bar">
        <div className="search-input-wrap">
          <span className="search-icon">🔍</span>
          <input
            className="form-control"
            placeholder="Search name, email, ID…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select className="form-control" style={{ width: 160 }} value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All Status</option>
          {STATUS_OPTIONS.map(s => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
        <select className="form-control" style={{ width: 200 }} value={deptId}
          onChange={e => { setDeptId(e.target.value); setPage(1); }}>
          <option value="">All Departments</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading-overlay"><div className="spinner" /></div>
        ) : employees.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            <h3>No employees found</h3>
            <p>Try adjusting your filters</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>ID</th>
                  <th>Department</th>
                  <th>Role</th>
                  <th>Type</th>
                  <th>Joining</th>
                  <th>Status</th>
                  {/* Actions column header only for edit-permitted roles */}
                  {canEdit && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => (
                  <tr
                    key={emp.id}
                    style={{ cursor: canViewDetail ? 'pointer' : 'default' }}
                    onClick={() => canViewDetail && navigate(`/employees/${emp.id}`)}
                  >
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                          className="avatar avatar-sm"
                          style={{ background: `hsl(${emp.first_name.charCodeAt(0)*5},60%,45%)` }}
                        >
                          {emp.first_name[0]}{emp.last_name[0]}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>
                            {emp.first_name} {emp.last_name}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{emp.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <code style={{ fontSize: 12, background: 'var(--bg)', padding: '2px 6px', borderRadius: 4 }}>
                        {emp.employee_id}
                      </code>
                    </td>
                    <td style={{ fontSize: 13 }}>{emp.department?.name || '—'}</td>
                    <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{emp.role?.name || '—'}</td>
                    <td>
                      <span className={`badge ${emp.employee_type === 'new' ? 'badge-new' : 'badge-rejoining'}`}>
                        {emp.employee_type}
                      </span>
                    </td>
                    <td style={{ fontSize: 13 }}>{emp.joining_date || '—'}</td>
                    <td>{statusBadge(emp.status)}</td>

                    {/* Action buttons — HR, Operations, SuperAdmin only */}
                    {canEdit && (
                      <td onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => navigate(`/employees/${emp.id}`)}
                          >
                            ✏️ Edit
                          </button>
                          {canOnboard && emp.status === 'pending' && (
                            <button
                              className="btn btn-accent btn-sm"
                              onClick={() => setActivateTarget(emp)}
                            >
                              🚀 Activate
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pages > 1 && (
          <div className="pagination">
            <button className="page-btn" onClick={() => setPage(1)} disabled={page === 1}>«</button>
            <button className="page-btn" onClick={() => setPage(p => p-1)} disabled={page === 1}>‹</button>
            {Array.from({ length: Math.min(pages, 7) }, (_, i) => i+1).map(p => (
              <button key={p} className={`page-btn ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>
                {p}
              </button>
            ))}
            <button className="page-btn" onClick={() => setPage(p => p+1)} disabled={page === pages}>›</button>
            <button className="page-btn" onClick={() => setPage(pages)} disabled={page === pages}>»</button>
          </div>
        )}
      </div>
      {activateTarget && (
        <ConfirmDialog
          title="🚀 Activate Employee"
          message={`Activate ${activateTarget.first_name} ${activateTarget.last_name}? This grants them full system access.`}
          confirmLabel="Yes, Activate"
          cancelLabel="Cancel"
          onConfirm={async () => {
            try {
              await employeesAPI.activate(activateTarget.id);
              toast.success('Employee activated!');
              load();
            } catch { toast.error('Activation failed'); }
            finally { setActivateTarget(null); }
          }}
          onCancel={() => setActivateTarget(null)}
          variant="primary"
        />
      )}
    </>
  );
}
