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

/* ── SVG Icons (inline, no external deps) ── */
const IconDashboard = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
    <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
  </svg>
);
const IconTasks = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
  </svg>
);
const IconJoining = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);
const IconOnboard = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/>
  </svg>
);
const IconPending = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);
const IconEmployees = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const IconLock = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);
const IconUser = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);
const IconBuilding = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="1"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
  </svg>
);
const IconRoles = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
    <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
  </svg>
);
const IconLogout = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);
const IconMenu = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
);

export default function Layout({ children }) {
  const [collapsed, setCollapsed]     = useState(false);
  const [mobileOpen, setMobileOpen]   = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const { user, logout, can }         = useAuth();
  const { taskCount, pendingOnboardingCount } = useNotifications();
  const navigate                      = useNavigate();

  const handleLogout  = () => setLogoutConfirm(true);
  const confirmLogout = () => { logout(); navigate('/login'); };

  const initials  = user ? `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() : 'HR';
  const roleName  = user?.role || (user?.is_superadmin ? 'C-Level' : 'Employee');
  const fullName  = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : 'User';
  const canDashboard = can('can_view_dashboard');

  const NAV = [
    {
      section: 'Overview',
      items: [
        ...(canDashboard ? [{ to: '/dashboard',      label: 'Dashboard',     Icon: IconDashboard }] : []),
        { to: '/tasks',          label: 'My Tasks',       Icon: IconTasks,    badge: taskCount > 0 ? taskCount : null },
        { to: '/joining-details',label: 'Joining Details', Icon: IconJoining, always: true },
      ],
    },
    {
      section: 'HR Management',
      items: [
        { to: '/onboarding',          label: 'New Onboarding',      Icon: IconOnboard,   perm: 'can_onboard_employees' },
        { to: '/pending-onboarding',  label: 'Pending Onboarding',  Icon: IconPending,   perm: 'can_onboard_employees', badge: pendingOnboardingCount > 0 ? pendingOnboardingCount : null },
        { to: '/employees',           label: 'Employees',           Icon: IconEmployees, always: true },
      ],
    },
    {
      section: 'Access & Security',
      items: [
        { to: '/iam',     label: 'My Access & Assets', Icon: IconLock, always: true },
        { to: '/profile', label: 'My Profile',         Icon: IconUser, always: true },
      ],
    },
    {
      section: 'Organization',
      items: [
        { to: '/departments', label: 'Departments',       Icon: IconBuilding, perm: 'can_manage_departments' },
        { to: '/roles',       label: 'Roles & Structure', Icon: IconRoles,    perm: 'can_manage_roles' },
      ],
    },
  ];

  return (
    <div className="app-shell">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="mobile-overlay" onClick={() => setMobileOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>

        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-mark">
            <span>I</span>
          </div>
          <span className="sidebar-logo-text">Intellativ</span>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          {NAV.map(group => {
            const visible = group.items.filter(item => item.always || !item.perm || can(item.perm));
            if (visible.length === 0) return null;
            return (
              <div key={group.section}>
                <div className="nav-section-label">{group.section}</div>
                {visible.map(({ to, label, Icon, badge }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                    title={collapsed ? label : undefined}
                    onClick={() => setMobileOpen(false)}
                  >
                    <span className="nav-icon"><Icon /></span>
                    <span className="nav-label">{label}</span>
                    {badge && (
                      <span className="nav-badge">{badge > 99 ? '99+' : badge}</span>
                    )}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>

        {/* Footer / Logout */}
        <div className="sidebar-footer">
          <button className="nav-item logout-btn" onClick={handleLogout}>
            <span className="nav-icon"><IconLogout /></span>
            <span className="nav-label">Logout</span>
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className={`main-content ${collapsed ? 'collapsed' : ''}`}>

        {/* Topbar */}
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
              <IconMenu />
            </button>
            <span className="topbar-brand">Intellativ HR</span>
          </div>

          <div className="topbar-right">
            {/* User chip — matches reference image top-right */}
            <div
              onClick={() => navigate('/profile')}
              className="user-chip"
            >
              <div
                className="avatar avatar-sm"
                style={{
                  background: 'linear-gradient(135deg, #29b6e0, #0d5c7a)',
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {initials}
              </div>
              <div className="user-chip-text">
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                  {fullName}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.2 }}>{roleName}</div>
              </div>
            </div>
          </div>
        </header>

        <main className="page-content">{children}</main>
      </div>

      {/* Logout confirm */}
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
