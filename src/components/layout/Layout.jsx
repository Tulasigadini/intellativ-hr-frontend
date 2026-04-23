import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
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
      section: 'My Employee Hub',
      items: [
        ...(canDashboard ? [{ to: '/dashboard', label: 'Dashboard', icon: '🏠' }] : []),
        { to: '/tasks', label: 'Tasks', icon: '📝', badge: taskCount > 0 ? taskCount : null },
        { to: '/profile', label: 'Profile', icon: '👤', always: true },
        { to: '/joining-details', label: 'Joining Details', icon: '📝', always: true },
      ],
    },
    {
      section: 'HR Operations',
      items: [
        { to: '/onboarding',         label: 'New Onboarding',     icon: '🚀', perm: 'can_onboard_employees' },
        { to: '/pending-onboarding', label: 'Pending List',        icon: '⏳', perm: 'can_onboard_employees', badge: pendingOnboardingCount > 0 ? pendingOnboardingCount : null },
        { to: '/employees',          label: 'Employees',          icon: '👥', always: true },
      ],
    },
    {
      section: 'Organization Hub',
      items: [
        { to: '/departments', label: 'Departments',       icon: '🏢', perm: 'can_manage_departments' },
        { to: '/roles',       label: 'Roles & Structure', icon: '🏗',  perm: 'can_manage_roles' },
      ],
    },
    {
      section: 'System',
      items: [
        { to: '/iam', label: 'Access & Security', icon: '🔐', always: true },
      ],
    },
  ];
  const location = useLocation();
  const activeItem = NAV.flatMap(g => g.items).find(i => i.to === location.pathname);
  const pageTitle = activeItem?.label || 'Dashboard';

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
            className="sidebar-logo-image highlighted-logo"
          />
        </div>



        <nav className="sidebar-nav">
          {NAV.map(group => {
            const visibleItems = group.items.filter(item =>
              item.always || !item.perm || can(item.perm)
            );
            if (visibleItems.length === 0) return null;
            return (
              <div key={group.section} className="sidebar-nav-group">
                <div className="nav-section-label">
                  <span>{group.section}</span>
                  <span className="nav-section-chevron">▼</span>
                </div>
                {visibleItems.map(item => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    title={collapsed ? item.label : undefined}
                    onClick={() => setMobileOpen(false)}
                  >
                    <span className="nav-icon">{item.icon}</span>
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
          <div className="sidebar-user-chip" onClick={() => navigate('/profile')}>
            <div className="avatar" style={{ background: 'var(--primary-light)' }}>{initials}</div>
            <div className="user-info">
              <div className="user-name">{user?.first_name} {user?.last_name || ''}</div>
            </div>
            <button className="logout-mini-btn" onClick={(e) => { e.stopPropagation(); handleLogout(); }} title="Logout">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
            </button>
          </div>
        </div>
      </aside>

      <div className={`main-content ${collapsed ? 'collapsed' : ''}`}>
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="btn btn-ghost btn-icon menu-toggle"
              onClick={() => {
                if (window.innerWidth <= 768) {
                  setMobileOpen(o => !o);
                } else {
                  setCollapsed(c => !c);
                }
              }}
              aria-label="Toggle sidebar"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="6" x2="15" y2="6"/>
                <line x1="3" y1="18" x2="18" y2="18"/>
              </svg>
            </button>
            <div className="topbar-breadcrumb">
              <img src="https://www.intellativ.com/logo.png" alt="" style={{ height: 28, width: 'auto', objectFit: 'contain' }} />
              <span className="breadcrumb-separator">/</span>
              <span className="breadcrumb-current">{pageTitle}</span>
            </div>
          </div>

          <div className="topbar-center">
          </div>

          <div className="topbar-right">
            <div className="topbar-user" onClick={() => navigate('/profile')}>
              <div className="avatar avatar-sm">{initials}</div>
              <div className="user-meta">
                <div className="user-name">{user?.first_name} {user?.last_name || ''}</div>
                <div className="user-role">{roleName}</div>
              </div>
              <span className="chevron-down">▼</span>
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
