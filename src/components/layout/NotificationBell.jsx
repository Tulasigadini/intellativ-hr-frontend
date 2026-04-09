import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { onboardingAPI } from '../../services/api';

const TYPE_ICONS = {
  onboarding: '🚀', asset: '📦', relieving: '🚪',
  insurance: '🏥', email_setup: '📧', default: '🔔',
};

export default function NotificationBell() {
  const [count, setCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  const fetchCount = () => {
    onboardingAPI.getNotificationCount()
      .then(r => setCount(r.data.unread))
      .catch(() => {});
  };

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const openPanel = async () => {
    setOpen(o => !o);
    if (!open) {
      setLoading(true);
      try {
        const { data } = await onboardingAPI.getNotifications();
        setNotifications(data);
      } catch {} finally { setLoading(false); }
    }
  };

  const markRead = async (notif) => {
    if (!notif.is_read) {
      await onboardingAPI.markRead(notif.id).catch(() => {});
      setNotifications(n => n.map(x => x.id === notif.id ? { ...x, is_read: true } : x));
      setCount(c => Math.max(0, c - 1));
    }
    if (notif.action_url) { navigate(notif.action_url); setOpen(false); }
  };

  const markAllRead = async () => {
    await onboardingAPI.markAllRead().catch(() => {});
    setNotifications(n => n.map(x => ({ ...x, is_read: true })));
    setCount(0);
  };

  const timeAgo = (isoStr) => {
    const diff = (Date.now() - new Date(isoStr)) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
    return `${Math.floor(diff/86400)}d ago`;
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        className="btn btn-ghost btn-icon"
        onClick={openPanel}
        style={{ position: 'relative' }}
        title="Notifications"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {count > 0 && (
          <span style={{
            position: 'absolute', top: 4, right: 4,
            background: 'var(--danger)', color: '#fff',
            fontSize: 10, fontWeight: 800,
            width: 16, height: 16, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{count > 9 ? '9+' : count}</span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0,
          width: 360, maxHeight: 480, overflowY: 'auto',
          background: 'var(--bg-card)', borderRadius: 12,
          boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border-light)',
          zIndex: 1000, marginTop: 8,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid var(--border-light)' }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>🔔 Notifications {count > 0 && <span style={{ color: 'var(--danger)' }}>({count})</span>}</span>
            {count > 0 && <button className="btn btn-ghost btn-sm" style={{ fontSize: 12 }} onClick={markAllRead}>Mark all read</button>}
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
              <div className="spinner" />
            </div>
          ) : notifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🔔</div>
              <div style={{ fontSize: 13 }}>No notifications yet</div>
            </div>
          ) : notifications.map(n => (
            <div
              key={n.id}
              onClick={() => markRead(n)}
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid var(--border-light)',
                cursor: n.action_url ? 'pointer' : 'default',
                background: n.is_read ? 'transparent' : 'var(--accent-pale)',
                transition: 'background 0.15s',
              }}
            >
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{TYPE_ICONS[n.type] || TYPE_ICONS.default}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: n.is_read ? 500 : 700, fontSize: 13, marginBottom: 2 }}>{n.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{n.message}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{timeAgo(n.created_at)}</div>
                </div>
                {!n.is_read && (
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)', flexShrink: 0, marginTop: 4 }} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
