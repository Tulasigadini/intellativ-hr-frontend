import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { dashboardAPI, employeesAPI } from '../services/api';
import { toast } from 'react-toastify';

export default function DashboardPage() {
  const { user, can } = useAuth();
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
      <div className="dashboard-welcome-grid">
        <div className="card welcome-card">
          <div className="welcome-content">
            <span className="badge badge-new" style={{ marginBottom: 12 }}>WELCOME</span>
            <h1 className="welcome-title">Welcome back, {user?.first_name} {user?.last_name || ''}!</h1>
            <p className="welcome-subtitle">Your workplace, your way.</p>
          </div>
          <div className="welcome-image">
            <img src="/dashboard_illustration_3d_team_1776839349363.png" alt="Welcome team" />
          </div>
        </div>
      </div>

      {!stats ? (
        <div className="loading-overlay"><div className="spinner" /></div>
      ) : (
        <>
          <div className="dashboard-main-grid-fixed">
            <div className="dashboard-content-col">
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
                                {emp.first_name?.[0]}{emp.last_name?.[0]}
                              </div>
                              <div style={{ fontWeight: 600 }}>{emp.first_name} {emp.last_name}</div>
                            </div>
                          </td>
                          <td><code style={{ fontSize: 12 }}>{emp.employee_id}</code></td>
                          <td>{emp.department?.name || '—'}</td>
                          <td>{statusBadge(emp.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}