import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { dashboardAPI, employeesAPI } from '../services/api';
import { toast } from 'react-toastify';

export default function DashboardPage() {
  const { can } = useAuth();
  const [stats, setStats] = useState(null);

  // Redirect non-HR users away from dashboard
  React.useEffect(() => {
    if (!can('can_view_dashboard')) navigate('/tasks');
  }, []);
  const [recentEmployees, setRecentEmployees] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    dashboardAPI.getStats()
      .then((r) => setStats(r.data))
      .catch(() => toast.error('Failed to load stats'));

    employeesAPI.list({ page: 1, size: 5 })
      .then((r) => setRecentEmployees(r.data.items))
      .catch(() => {});
  }, []);

  const statCards = stats
    ? [
        { label: 'Total Employees', value: stats.total_employees, icon: '👥', cls: 'blue' },
        { label: 'Active Employees', value: stats.active_employees, icon: '✅', cls: 'green' },
        { label: 'Pending Onboarding', value: stats.pending_onboarding, icon: '⏳', cls: 'orange' },
        { label: 'Relieved This Month', value: stats.relieved_this_month, icon: '🚪', cls: 'red' },
        { label: 'New Joinings', value: stats.new_joinings_this_month, icon: '🚀', cls: 'teal' },
        { label: 'Departments', value: stats.departments_count, icon: '🏢', cls: 'purple' },
      ]
    : [];

  const statusBadge = (status) => {
    const map = {
      active: 'badge-active', pending: 'badge-pending',
      relieved: 'badge-relieved', inactive: 'badge-inactive',
    };
    return <span className={`badge ${map[status] || 'badge-inactive'}`}>{status}</span>;
  };

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Overview of HR & workforce metrics</p>
      </div>

      {!stats ? (
        <div className="loading-overlay"><div className="spinner" /></div>
      ) : (
        <>
          {/* Stat Cards */}
          <div className="stat-grid">
            {statCards.map((s) => (
              <div className="stat-card" key={s.label}>
                <div className={`stat-icon ${s.cls}`}>{s.icon}</div>
                <div className="stat-info">
                  <div className="stat-value">{s.value}</div>
                  <div className="stat-label">{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Recent Employees */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Recent Employees</span>
              <button className="btn btn-outline btn-sm" onClick={() => navigate('/employees')}>
                View All
              </button>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>ID</th>
                    <th>Department</th>
                    <th>Type</th>
                    <th>Joining Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentEmployees.map((emp) => (
                    <tr key={emp.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/employees/${emp.id}`)}
                    >
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="avatar avatar-sm">
                            {emp.first_name[0]}{emp.last_name[0]}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600 }}>{emp.first_name} {emp.last_name}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{emp.email}</div>
                          </div>
                        </div>
                      </td>
                      <td><code style={{ fontSize: 12 }}>{emp.employee_id}</code></td>
                      <td>{emp.department?.name || '—'}</td>
                      <td>
                        <span className={`badge badge-${emp.employee_type}`}>
                          {emp.employee_type}
                        </span>
                      </td>
                      <td>{emp.joining_date || '—'}</td>
                      <td>{statusBadge(emp.status)}</td>
                    </tr>
                  ))}
                  {recentEmployees.length === 0 && (
                    <tr><td colSpan={6}>
                      <div className="empty-state" style={{ padding: '30px 20px' }}>
                        <div>No employees yet</div>
                      </div>
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </>
  );
}