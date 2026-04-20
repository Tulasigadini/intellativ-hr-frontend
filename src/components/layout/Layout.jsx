import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../hooks/useNotifications';

export function ConfirmDialog({ title, message, onConfirm, onCancel, confirmLabel = 'Yes', cancelLabel = 'No', variant = 'danger' }) {
  return (
    <div className="modal-overlay" onClick={onCancel} style={{ zIndex: 2000 }}>
      <div className="modal confirm-dialog" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{title}</span>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{message}</p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onCancel}>{cancelLabel}</button>
          <button
            className={`btn ${variant === 'danger' ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
            autoFocus
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Layout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const { user, logout, can } = useAuth();
  const { taskCount, pendingOnboardingCount } = useNotifications();
  const navigate = useNavigate();

  const handleLogout = () => setLogoutConfirm(true);
  const confirmLogout = () => { logout(); navigate('/login'); };

  const initials = user
    ? `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase()
    : 'HR';

  const roleName = user?.role || (user?.is_superadmin ? 'Super Admin' : 'Employee');
  const canDashboard = can('can_view_dashboard');

  const NAV = [
    {
      section: 'Overview',
      items: [
        ...(canDashboard ? [{ to: '/dashboard', label: 'Dashboard', icon: '⊞' }] : []),
        { to: '/tasks', label: 'My Tasks', icon: '✅', badge: taskCount > 0 ? taskCount : null },
        { to: '/joining-details', label: 'Joining Details', icon: '🏢', always: true },
      ],
    },
    {
      section: 'HR Management',
      items: [
        { to: '/onboarding',         label: 'New Onboarding',     icon: '🚀', perm: 'can_onboard_employees' },
        { to: '/pending-onboarding', label: 'Pending Onboarding', icon: '⏳', perm: 'can_onboard_employees', badge: pendingOnboardingCount > 0 ? pendingOnboardingCount : null },
        { to: '/employees',          label: 'Employees',          icon: '👥', always: true },
      ],
    },
    {
      section: 'Access & Security',
      items: [
        { to: '/iam',     label: 'My Access & Assets', icon: '🔐', always: true },
        { to: '/profile', label: 'My Profile',         icon: '👤', always: true },
      ],
    },
    {
      section: 'Organization',
      items: [
        { to: '/departments', label: 'Departments',       icon: '🏢', perm: 'can_manage_departments' },
        { to: '/roles',       label: 'Roles & Structure', icon: '🏗',  perm: 'can_manage_roles' },
      ],
    },
  ];

  return (
    <div className="app-shell">
      {mobileOpen && (
        <div className="mobile-overlay" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-logo">
          <img
            src="https://www.intellativ.com/logo.png"
            alt="Intellativ HR"
            className="sidebar-logo-image"
            style={{ height: '100%', width: '100%', objectFit: 'contain' }}
          />
        </div>

        <nav className="sidebar-nav">
          {NAV.map(group => {
            const visibleItems = group.items.filter(item =>
              item.always || !item.perm || can(item.perm)
            );
            if (visibleItems.length === 0) return null;
            return (
              <div key={group.section}>
                <div className="nav-section-label">{group.section}</div>
                {visibleItems.map(item => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    title={collapsed ? item.label : undefined}
                    onClick={() => setMobileOpen(false)}
                  >
                    <span className="nav-icon" style={{ fontSize: 17 }}>{item.icon}</span>
                    <span className="nav-label">{item.label}</span>
                    {item.badge && (
                      <span className="nav-badge">{item.badge > 99 ? '99+' : item.badge}</span>
                    )}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button className="nav-item logout-btn" onClick={handleLogout}>
            <span className="nav-icon" style={{ fontSize: 17 }}>🚪</span>
            <span className="nav-label">Logout</span>
          </button>
        </div>
      </aside>

      <div className={`main-content ${collapsed ? 'collapsed' : ''}`}>
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="btn btn-ghost btn-icon"
              onClick={() => {
                if (window.innerWidth <= 768) {
                  setMobileOpen(o => !o);
                } else {
                  setCollapsed(c => !c);
                }
              }}
              aria-label="Toggle sidebar"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
            <span className="topbar-brand">Intellativ HR</span>
          </div>

          <div className="topbar-right">
            <div onClick={() => navigate('/profile')} className="user-chip">
              <div className="avatar avatar-sm" style={{ background: 'var(--primary)' }}>{initials}</div>
              <div className="user-chip-text">
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {user?.first_name} {user?.last_name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{roleName}</div>
              </div>
            </div>
          </div>
        </header>

        <main className="page-content">{children}</main>
      </div>

      {logoutConfirm && (
        <ConfirmDialog
          title="👋 Confirm Logout"
          message="Are you sure you want to log out of your account?"
          confirmLabel="Yes, Logout"
          cancelLabel="Cancel"
          onConfirm={confirmLogout}
          onCancel={() => setLogoutConfirm(false)}
          variant="danger"
        />
      )}
    </div>
  );
}
