import React, { useState, useEffect, useCallback } from 'react';
import { tasksAPI, employeesAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useButtonLoading } from '../hooks/useAsync';
import { useNotifications } from '../hooks/useNotifications';
import LoadingButton from '../components/ui/LoadingButton';
import { toast } from 'react-toastify';
import { ConfirmDialog } from '../components/layout/Layout';

const STATUSES = ['pending', 'in_progress', 'completed', 'cancelled'];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const TASK_TYPES = ['general', 'onboarding', 'relieving', 'asset', 'document', 'insurance'];

const STATUS_META = {
  pending:     { label: 'Pending',     color: '#f59e0b', bg: '#fffbeb', icon: '⏳' },
  in_progress: { label: 'In Progress', color: '#3b82f6', bg: '#eff6ff', icon: '🔄' },
  completed:   { label: 'Completed',   color: '#22c55e', bg: '#f0fdf4', icon: '✅' },
  cancelled:   { label: 'Cancelled',   color: '#9ca3af', bg: '#f9fafb', icon: '✕'  },
};

const PRIORITY_META = {
  low:    { label: 'Low',    color: '#6b7280', dot: '#d1d5db' },
  medium: { label: 'Medium', color: '#3b82f6', dot: '#3b82f6' },
  high:   { label: 'High',   color: '#f59e0b', dot: '#f59e0b' },
  urgent: { label: 'Urgent', color: '#ef4444', dot: '#ef4444' },
};

const TYPE_META = {
  general:   { icon: '📋', label: 'General'   },
  onboarding:{ icon: '🚀', label: 'Onboarding'},
  relieving: { icon: '🚪', label: 'Relieving' },
  asset:     { icon: '📦', label: 'Asset'     },
  document:  { icon: '📄', label: 'Document'  },
  insurance: { icon: '🏥', label: 'Insurance' },
};

const TEAM_META = {
  hr:        { bg: '#f0fdf4', border: '#86efac', text: '#15803d', label: 'HR',        icon: '👥' },
  it:        { bg: '#eff6ff', border: '#93c5fd', text: '#1d4ed8', label: 'IT',        icon: '💻' },
  insurance: { bg: '#fff7ed', border: '#fed7aa', text: '#c2410c', label: 'Insurance', icon: '🏥' },
  admin:     { bg: '#fdf4ff', border: '#d8b4fe', text: '#7e22ce', label: 'Admin',     icon: '🏢' },
  finance:   { bg: '#fefce8', border: '#fde68a', text: '#92400e', label: 'Finance',   icon: '💰' },
};

/* ─── Helpers ───────────────────────────────────────────────────────────────── */
const isOverdue = (due, status) => {
  if (!due || status === 'completed' || status === 'cancelled') return false;
  return new Date(due) < new Date();
};
const isDueSoon = (due, status) => {
  if (!due || status === 'completed' || status === 'cancelled') return false;
  const diff = (new Date(due) - new Date()) / 86_400_000;
  return diff >= 0 && diff <= 3;
};
const fmtDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const fmtDateTime = (d) => d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

/* ─── Sub-components ────────────────────────────────────────────────────────── */
const Pill = ({ children, color, bg, border, style = {} }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
    color, background: bg, border: `1px solid ${border || color + '40'}`,
    whiteSpace: 'nowrap', ...style,
  }}>
    {children}
  </span>
);

const StatusPill = ({ status }) => {
  const m = STATUS_META[status] || STATUS_META.pending;
  return <Pill color={m.color} bg={m.bg}>{m.icon} {m.label}</Pill>;
};

const PriorityDot = ({ priority }) => {
  const m = PRIORITY_META[priority] || PRIORITY_META.medium;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: m.color, fontWeight: 600 }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: m.dot, display: 'inline-block', flexShrink: 0 }} />
      {m.label}
    </span>
  );
};

const TeamBadge = ({ team }) => {
  const c = TEAM_META[team];
  if (!c) return null;
  return <Pill color={c.text} bg={c.bg} border={c.border}>{c.icon} {c.label}</Pill>;
};

const AssigneeBadge = ({ task, currentUserId }) => {
  if (!task.is_team_task) return null;
  if (!task.assigned_to_name) {
    return (
      <Pill color="#6b7280" bg="#f3f4f6" border="#e5e7eb">
        👤 Unassigned
      </Pill>
    );
  }
  const isMe = task.assigned_to === currentUserId;
  return (
    <Pill
      color={isMe ? '#1d4ed8' : '#15803d'}
      bg={isMe ? '#eff6ff' : '#f0fdf4'}
      border={isMe ? '#93c5fd' : '#86efac'}
    >
      🔄 {isMe ? 'You' : task.assigned_to_name}
    </Pill>
  );
};

/* ─── Stat Card ─────────────────────────────────────────────────────────────── */
const StatCard = ({ icon, label, value, accent }) => (
  <div style={{
    background: '#fff', borderRadius: 14, padding: '16px 20px',
    border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 14,
    boxShadow: '0 1px 4px rgba(0,0,0,.04)',
  }}>
    <div style={{
      width: 44, height: 44, borderRadius: 12, background: accent + '15',
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0,
    }}>
      {icon}
    </div>
    <div>
      <div style={{ fontSize: 22, fontWeight: 800, color: '#111827', lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2, fontWeight: 500 }}>{label}</div>
    </div>
  </div>
);

/* ─── Task Card ─────────────────────────────────────────────────────────────── */
const TaskCard = ({ task, user, isHR, btnLoading, onEdit, onView, onClaim, onUnclaim, onStatus, onDelete }) => {
  const overdue = isOverdue(task.due_date, task.status);
  const soon = isDueSoon(task.due_date, task.status);
  const isMyTask = task.assigned_to === user?.id || task.assigned_to === user?.employee_id;
  const isClaimable = task.is_team_task && !task.assigned_to && task.status === 'pending';
  const isUnclaimable = isMyTask && task.is_team_task && task.status !== 'completed' && task.status !== 'cancelled';

  return (
    <div style={{
      background: '#fff', border: `1px solid ${overdue ? '#fca5a5' : '#e5e7eb'}`,
      borderRadius: 14, padding: '18px 20px',
      borderLeft: `4px solid ${overdue ? '#ef4444' : soon ? '#f59e0b' : (PRIORITY_META[task.priority]?.dot || '#e5e7eb')}`,
      transition: 'box-shadow .15s, transform .1s',
      boxShadow: '0 1px 3px rgba(0,0,0,.05)',
    }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,.09)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,.05)'; e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, minWidth: 0, flex: 1 }}>
          <span style={{ fontSize: 24, lineHeight: 1, flexShrink: 0, marginTop: 2 }}>
            {TYPE_META[task.task_type]?.icon || '📋'}
          </span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#111827', lineHeight: 1.4, wordBreak: 'break-word' }}>
                {task.title}
              </div>
              {task.related_employee_name && (
                <span style={{ 
                  padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, 
                  background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca',
                  display: 'inline-flex', alignItems: 'center', gap: 4
                }}>
                  🎯 Target: {task.related_employee_name}
                </span>
              )}
            </div>
            {task.description && (
              <p style={{ fontSize: 12, color: '#6b7280', margin: 0, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {task.description}
              </p>
            )}
          </div>
        </div>
        {/* Quick actions */}
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <button onClick={() => onView(task)} style={ghostBtn}>
            View
          </button>
          {(isHR || isMyTask) && (
            <button onClick={() => onEdit(task)} style={ghostBtn}>
              Edit
            </button>
          )}
          {isHR && (
            <button onClick={() => onDelete(task.id)} style={{ ...ghostBtn, color: '#ef4444' }}>
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Badges row */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
        <StatusPill status={task.status} />
        <PriorityDot priority={task.priority} />
        {task.is_team_task && <TeamBadge team={task.team} />}
        {task.is_team_task && <AssigneeBadge task={task} currentUserId={user?.employee_id || user?.id} />}
      </div>

      {/* Meta row */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, color: '#9ca3af', alignItems: 'center' }}>
        {task.related_employee_name && (
          <span style={{ color: '#6b7280' }}>👤 <strong style={{ color: '#374151' }}>{task.related_employee_name}</strong></span>
        )}
        {task.assigned_by_name && (
          <span>↗ {task.assigned_by_name}</span>
        )}
        {task.due_date && (
          <span style={{
            color: overdue ? '#ef4444' : soon ? '#f59e0b' : '#9ca3af',
            fontWeight: (overdue || soon) ? 600 : 400,
          }}>
            {overdue ? '🔴' : soon ? '⚠️' : '📅'} {fmtDate(task.due_date)}{overdue ? ' · Overdue' : soon ? ' · Soon' : ''}
          </span>
        )}
        {task.completed_at && (
          <span style={{ color: '#22c55e', fontWeight: 600 }}>✅ {fmtDate(task.completed_at)}</span>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#d1d5db' }}>
          {TYPE_META[task.task_type]?.label}
        </span>
      </div>

      {/* Action buttons */}
      {(isClaimable || isUnclaimable || task.status === 'pending' || task.status === 'in_progress') && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f3f4f6', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {isClaimable && (
            <LoadingButton
              loading={btnLoading(`claim_${task.id}`)} loadingText="Claiming…"
              onClick={() => onClaim(task.id)}
              style={actionBtn('#3b82f6', '#eff6ff')}
            >
              ✋ Claim Task
            </LoadingButton>
          )}
          {isUnclaimable && (
            <LoadingButton
              loading={btnLoading(`unclaim_${task.id}`)} loadingText="…"
              onClick={() => onUnclaim(task.id)}
              style={actionBtn('#6b7280', '#f9fafb')}
            >
              ↩ Unclaim
            </LoadingButton>
          )}
          {task.status === 'pending' && (isMyTask || task.is_team_task) && (
            <LoadingButton
              loading={btnLoading(`status_${task.id}`)} loadingText="Starting…"
              onClick={() => onStatus(task.id, 'in_progress')}
              style={actionBtn('#f59e0b', '#fffbeb')}
            >
              ▶ Start
            </LoadingButton>
          )}
          {task.status === 'in_progress' && (isMyTask || isHR) && (
            <LoadingButton
              loading={btnLoading(`status_${task.id}`)} loadingText="Completing…"
              onClick={() => onStatus(task.id, 'completed')}
              style={actionBtn('#22c55e', '#f0fdf4')}
            >
              ✓ Mark Complete
            </LoadingButton>
          )}
        </div>
      )}
    </div>
  );
};

const ghostBtn = {
  background: 'transparent', border: '1px solid #e5e7eb', borderRadius: 8,
  padding: '4px 10px', fontSize: 12, fontWeight: 600, color: '#374151',
  cursor: 'pointer', whiteSpace: 'nowrap',
};
const actionBtn = (color, bg) => ({
  background: bg, border: `1px solid ${color}30`, borderRadius: 8,
  padding: '5px 14px', fontSize: 12, fontWeight: 700, color, cursor: 'pointer',
});

/* ─── Form Field ─────────────────────────────────────────────────────────────── */
const Field = ({ label, required, children, half }) => (
  <div style={{ flex: half ? '1 1 200px' : '1 1 100%', minWidth: 0 }}>
    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
      {label}{required && <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>}
    </label>
    {children}
  </div>
);
const inputStyle = {
  width: '100%', padding: '9px 13px', borderRadius: 10, border: '1.5px solid #e5e7eb',
  fontSize: 13, color: '#111827', background: '#fff', boxSizing: 'border-box',
  outline: 'none', transition: 'border .15s',
};

/* ─── Modal Shell ────────────────────────────────────────────────────────────── */
const Modal = ({ onClose, children, maxWidth = 580 }) => (
  <div
    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20, backdropFilter: 'blur(2px)' }}
    onClick={e => { if (e.target === e.currentTarget) onClose(); }}
  >
    <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(0,0,0,.18)' }}>
      {children}
    </div>
  </div>
);

/* ════════════════════════════════════════════════════════════════════════════ */
export default function TasksPage() {
  const { user, can } = useAuth();
  const isHR = can('can_view_dashboard');
  const currentUserId = user?.employee_id || user?.id;
  const { run: btnRun, isLoading: btnLoading } = useButtonLoading();
  const { refresh: refreshNotifs } = useNotifications();

  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState(null);
  const [statsLoaded, setStatsLoaded] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteTaskTarget, setDeleteTaskTarget] = useState(null);
  const [activeTab, setActiveTab] = useState('my'); // 'my' | 'team' | 'all'
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [modal, setModal] = useState(null); // null | 'create' | task-obj
  const [viewTask, setViewTask] = useState(null);
  const [form, setForm] = useState({
    title: '', description: '', task_type: 'general', priority: 'medium',
    assigned_to: '', related_employee_id: '', due_date: '', notes: '', status: 'pending',
  });

  /* ── Stats — load once on mount and after mutations ── */
  const loadStats = useCallback(async () => {
    try {
      const sRes = await tasksAPI.stats();
      setStats(sRes.data);
    } catch { /* silent */ }
    finally { setStatsLoaded(true); }
  }, []);

  /* ── Task list — depends on tab + filters ── */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      if (filterType) params.task_type = filterType;

      // FIX: correct params per tab
      if (activeTab === 'my') {
        params.assigned_to_me = true;
        // Don't include team tasks in "My Tasks"
        params.include_team = false;
      } else if (activeTab === 'team') {
        params.include_team = true;
        params.assigned_to_me = false;
      }
      // 'all' → no special params (HR only)

      const tRes = await tasksAPI.list(params);
      setTasks(tRes.data);
    } catch {
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterType, activeTab]);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (isHR)
      employeesAPI.list({ page: 1, size: 100, status: 'active' })
        .then(r => setEmployees(r.data.items)).catch(() => {});
  }, [isHR]);

  /* ── Tab counts — always use stats (loaded independently) ── */
  const getTabCount = (tabKey) => {
    if (!stats) return null;
    if (tabKey === 'my') return stats.my_tasks ?? null;
    // team_total counts all pending+in_progress team tasks — matches what the team tab shows
    if (tabKey === 'team') return (stats.team_total ?? null);
    if (tabKey === 'all') return stats.total ?? null;
    return null;
  };

  /* ── Modals ── */
  const openCreate = () => {
    setForm({ title: '', description: '', task_type: 'general', priority: 'medium', assigned_to: '', related_employee_id: '', due_date: '', notes: '', status: 'pending' });
    setModal('create');
  };
  const openEdit = (task) => {
    setForm({
      title: task.title, description: task.description || '',
      task_type: task.task_type, priority: task.priority,
      assigned_to: task.assigned_to || '', related_employee_id: task.related_employee_id || '',
      due_date: task.due_date || '', notes: task.notes?.replace(/\[team:\w+\]\s?/g, '') || '',
      status: task.status,
    });
    setModal(task);
  };

  /* ── CRUD ── */
  const save = () => btnRun('save', async () => {
    if (!form.title.trim()) return toast.error('Title is required');
    const payload = { ...form };
    Object.keys(payload).forEach(k => { if (payload[k] === '') payload[k] = null; });
    if (modal === 'create') {
      await tasksAPI.create(payload);
      toast.success('Task created successfully');
    } else {
      await tasksAPI.update(modal.id, payload);
      toast.success('Task updated');
    }
    setModal(null);
    load();
    loadStats();
    refreshNotifs();
  });

  const updateStatus = (id, status) => btnRun(`status_${id}`, async () => {
    await tasksAPI.update(id, { status });
    load();
    loadStats();
    refreshNotifs();
  });

  const claimTask = (id) => btnRun(`claim_${id}`, async () => {
    await tasksAPI.claim(id);
    toast.success('Task claimed — you are now working on it');
    load();
    loadStats();
    refreshNotifs();
  });

  const unclaimTask = (id) => btnRun(`unclaim_${id}`, async () => {
    await tasksAPI.unclaim(id);
    toast.info('Task returned to team pool');
    load();
    loadStats();
    refreshNotifs();
  });

  const del = (id) => {
    setDeleteTaskTarget(id);
  };

  const confirmDelete = async () => {
    try {
      await tasksAPI.delete(deleteTaskTarget);
      toast.success('Task deleted');
      load();
      loadStats();
      refreshNotifs();
    } catch {
      toast.error('Failed to delete task');
    } finally {
      setDeleteTaskTarget(null);
    }
  };

  /* ── Tabs ── */
  const tabs = [
    { key: 'my',   label: 'My Tasks',   icon: '👤' },
    { key: 'team', label: 'Team Tasks',  icon: '👥' },
    ...(isHR ? [{ key: 'all', label: 'All Tasks', icon: '📋' }] : []),
  ];

  /* ── Render ── */
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>

      {/* ── Page header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>
            Task Management
          </h1>
          <p style={{ fontSize: 13, color: '#9ca3af', margin: '4px 0 0', fontWeight: 500 }}>
            Track, assign, and manage HR tasks across your team
          </p>
        </div>
        {isHR && (
          <button
            onClick={openCreate}
            style={{ background: '#111827', color: '#fff', border: 'none', borderRadius: 12, padding: '10px 22px', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 8px rgba(0,0,0,.15)' }}
          >
            + New Task
          </button>
        )}
      </div>

      {/* ── Stats ── */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: 12, marginBottom: 28 }}>
          <StatCard icon="📋" label="Total Tasks"  value={stats.total}       accent="#3b82f6" />
          <StatCard icon="⏳" label="Pending"      value={stats.pending}     accent="#f59e0b" />
          <StatCard icon="🔄" label="In Progress"  value={stats.in_progress} accent="#6366f1" />
          <StatCard icon="✅" label="Completed"    value={stats.completed}   accent="#22c55e" />
          {stats.urgent > 0 && <StatCard icon="🚨" label="Urgent" value={stats.urgent} accent="#ef4444" />}
          {stats.team_unassigned > 0 && <StatCard icon="👥" label="Unassigned" value={stats.team_unassigned} accent="#f97316" />}
        </div>
      )}

      {/* ── Tabs + Filters Row ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, background: '#f3f4f6', padding: 4, borderRadius: 12, border: '1px solid #e5e7eb' }}>
          {tabs.map(tab => {
            const count = getTabCount(tab.key);
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: '7px 16px', borderRadius: 9, border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6,
                  background: active ? '#fff' : 'transparent',
                  color: active ? '#111827' : '#6b7280',
                  boxShadow: active ? '0 1px 4px rgba(0,0,0,.08)' : 'none',
                  transition: 'all .15s',
                }}
              >
                <span>{tab.icon}</span>
                {tab.label}
                {count != null && count > 0 && (
                  <span style={{
                    padding: '1px 7px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                    background: active ? '#111827' : '#e5e7eb',
                    color: active ? '#fff' : '#374151',
                    minWidth: 20, textAlign: 'center',
                  }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Filters */}
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          style={{ ...inputStyle, width: 150, padding: '7px 12px' }}
        >
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{STATUS_META[s]?.icon} {STATUS_META[s]?.label}</option>)}
        </select>

        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          style={{ ...inputStyle, width: 150, padding: '7px 12px' }}
        >
          <option value="">All Types</option>
          {TASK_TYPES.map(t => <option key={t} value={t}>{TYPE_META[t]?.icon} {TYPE_META[t]?.label}</option>)}
        </select>

        {(filterStatus || filterType) && (
          <button
            onClick={() => { setFilterStatus(''); setFilterType(''); }}
            style={{ ...ghostBtn, color: '#ef4444', borderColor: '#fca5a5' }}
          >
            ✕ Clear
          </button>
        )}
      </div>

      {/* ── Team info banner ── */}
      {activeTab === 'team' && (
        <div style={{ padding: '12px 16px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, marginBottom: 16, fontSize: 13, color: '#1d4ed8', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>💡</span>
          <span>
            <strong>Team Tasks</strong> are visible to all team members. Click <strong>✋ Claim</strong> to take ownership, or <strong>↩ Unclaim</strong> to return it to the pool.
          </span>
        </div>
      )}

      {/* ── Task count ── */}
      <div style={{ fontSize: 13, color: '#9ca3af', fontWeight: 500, marginBottom: 14 }}>
        {loading ? 'Loading…' : `${tasks.length} task${tasks.length !== 1 ? 's' : ''}`}
        {(filterStatus || filterType) && ' (filtered)'}
      </div>

      {/* ── Task List ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9ca3af' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
          <p style={{ fontWeight: 600 }}>Loading tasks…</p>
        </div>
      ) : tasks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>
            {activeTab === 'my' ? '🎉' : '📭'}
          </div>
          <p style={{ fontWeight: 700, color: '#111827', fontSize: 16, margin: 0 }}>
            {activeTab === 'my' ? 'No tasks assigned to you' : 'No tasks found'}
          </p>
          <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 6 }}>
            {activeTab === 'team' ? 'No team tasks available right now.' : 'Try adjusting the filters above.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {tasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              user={user}
              isHR={isHR}
              btnLoading={btnLoading}
              onEdit={openEdit}
              onView={setViewTask}
              onClaim={claimTask}
              onUnclaim={unclaimTask}
              onStatus={updateStatus}
              onDelete={del}
            />
          ))}
        </div>
      )}

      {/* ════ Create / Edit Modal ════ */}
      {modal && (
        <Modal onClose={() => setModal(null)}>
          <div style={{ padding: '28px 28px 24px' }}>
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#111827', margin: 0 }}>
                {modal === 'create' ? '+ New Task' : '✏️ Edit Task'}
              </h2>
              {modal !== 'create' && (
                <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
                  ID: {modal.id}
                </p>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Field label="Title" required>
                <input
                  style={inputStyle}
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="What needs to be done?"
                  onFocus={e => e.target.style.borderColor = '#111827'}
                  onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                />
              </Field>

              <Field label="Description">
                <textarea
                  style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }}
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Describe the task in detail…"
                  onFocus={e => e.target.style.borderColor = '#111827'}
                  onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                />
              </Field>

              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                <Field label="Type" half>
                  <select
                    style={inputStyle}
                    value={form.task_type}
                    onChange={e => setForm(f => ({ ...f, task_type: e.target.value }))}
                  >
                    {TASK_TYPES.map(t => <option key={t} value={t}>{TYPE_META[t]?.icon} {TYPE_META[t]?.label}</option>)}
                  </select>
                </Field>
                <Field label="Priority" half>
                  <select
                    style={inputStyle}
                    value={form.priority}
                    onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                  >
                    {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                  </select>
                </Field>
              </div>

              {modal !== 'create' && (
                <Field label="Status">
                  <select
                    style={inputStyle}
                    value={form.status || 'pending'}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  >
                    {STATUSES.map(s => <option key={s} value={s}>{STATUS_META[s]?.icon} {STATUS_META[s]?.label}</option>)}
                  </select>
                </Field>
              )}

              {isHR && (
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                  <Field label="Assign To" half>
                    <select
                      style={inputStyle}
                      value={form.assigned_to || ''}
                      onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))}
                    >
                      <option value="">— Team task (unassigned) —</option>
                      {employees.map(e => (
                        <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Related Employee" half>
                    <select
                      style={inputStyle}
                      value={form.related_employee_id || ''}
                      onChange={e => setForm(f => ({ ...f, related_employee_id: e.target.value }))}
                    >
                      <option value="">None</option>
                      {employees.map(e => (
                        <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>
                      ))}
                    </select>
                  </Field>
                </div>
              )}

              <Field label="Due Date" half>
                <input
                  type="date"
                  style={inputStyle}
                  value={form.due_date || ''}
                  onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                  onFocus={e => e.target.style.borderColor = '#111827'}
                  onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                />
              </Field>

              <Field label="Notes">
                <textarea
                  style={{ ...inputStyle, resize: 'vertical', minHeight: 60 }}
                  value={form.notes || ''}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Any additional notes…"
                  onFocus={e => e.target.style.borderColor = '#111827'}
                  onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                />
              </Field>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24, paddingTop: 20, borderTop: '1px solid #f3f4f6' }}>
              <button
                onClick={() => setModal(null)}
                style={{ background: '#f3f4f6', border: 'none', borderRadius: 10, padding: '9px 20px', fontSize: 13, fontWeight: 600, color: '#374151', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <LoadingButton
                loading={btnLoading('save')}
                loadingText="Saving…"
                onClick={save}
                style={{ background: '#111827', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 22px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
              >
                {modal === 'create' ? 'Create Task' : 'Save Changes'}
              </LoadingButton>
            </div>
          </div>
        </Modal>
      )}

      {/* ════ Delete Confirm Dialog ════ */}
      {deleteTaskTarget && (
        <ConfirmDialog
          title="Delete Task"
          message="Are you sure you want to delete this task? This action cannot be undone."
          confirmLabel="Delete"
          variant="danger"
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTaskTarget(null)}
        />
      )}

      {/* ════ View Task Modal ════ */}
      {viewTask && (
        <Modal onClose={() => setViewTask(null)}>
          <div style={{ padding: '28px 28px 24px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 28, lineHeight: 1, flexShrink: 0 }}>
                  {TYPE_META[viewTask.task_type]?.icon || '📋'}
                </span>
                <h2 style={{ fontSize: 17, fontWeight: 800, margin: 0, color: '#111827', lineHeight: 1.4 }}>
                  {viewTask.title}
                </h2>
              </div>
              <button onClick={() => setViewTask(null)} style={{ ...ghostBtn, padding: '4px 8px' }}>✕</button>
            </div>

            {/* Badges */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
              <StatusPill status={viewTask.status} />
              <PriorityDot priority={viewTask.priority} />
              {viewTask.is_team_task && <TeamBadge team={viewTask.team} />}
              {viewTask.is_team_task && <AssigneeBadge task={viewTask} currentUserId={currentUserId} />}
            </div>

            {/* Description */}
            {viewTask.description && (
              <div style={{ background: '#f9fafb', borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
                <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 }}>
                  {viewTask.description}
                </p>
              </div>
            )}

            {/* Details grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 28px', fontSize: 13, marginBottom: 20 }}>
              {[
                ['Type',        TYPE_META[viewTask.task_type]?.label || viewTask.task_type],
                ['Due Date',    fmtDate(viewTask.due_date)],
                ['Assigned To', viewTask.assigned_to_name || (viewTask.is_team_task ? 'Team (unassigned)' : '—')],
                ['Assigned By', viewTask.assigned_by_name || '—'],
                ['For Employee', viewTask.related_employee_name || '—'],
                ['Completed',   viewTask.completed_at ? fmtDateTime(viewTask.completed_at) : '—'],
                ['Created',     fmtDate(viewTask.created_at)],
                ['Last Updated', viewTask.updated_at ? fmtDate(viewTask.updated_at) : '—'],
              ].map(([label, val]) => (
                <div key={label}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>
                    {label}
                  </div>
                  <div style={{ fontWeight: 600, color: '#111827' }}>{val}</div>
                </div>
              ))}
            </div>

            {/* Notes */}
            {viewTask.notes && !viewTask.notes.replace(/\[team:\w+\]\s?/g, '').trim() === false && (
              (() => {
                const cleanNotes = viewTask.notes.replace(/\[team:\w+\]\s?/g, '').trim();
                return cleanNotes ? (
                  <div style={{ background: '#f9fafb', borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Notes</div>
                    <p style={{ fontSize: 13, margin: 0, color: '#374151' }}>{cleanNotes}</p>
                  </div>
                ) : null;
              })()
            )}

            {/* Action footer */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap', paddingTop: 16, borderTop: '1px solid #f3f4f6' }}>
              {viewTask.is_team_task && !viewTask.assigned_to && viewTask.status === 'pending' && (
                <LoadingButton
                  loading={btnLoading(`claim_${viewTask.id}`)} loadingText="Claiming…"
                  onClick={async () => { await claimTask(viewTask.id); setViewTask(null); }}
                  style={actionBtn('#3b82f6', '#eff6ff')}
                >
                  ✋ Claim This Task
                </LoadingButton>
              )}
              {viewTask.status === 'pending' && (
                <LoadingButton
                  loading={btnLoading(`status_${viewTask.id}`)} loadingText="Starting…"
                  onClick={async () => { await updateStatus(viewTask.id, 'in_progress'); setViewTask(t => ({ ...t, status: 'in_progress' })); }}
                  style={actionBtn('#f59e0b', '#fffbeb')}
                >
                  ▶ Start Task
                </LoadingButton>
              )}
              {viewTask.status === 'in_progress' && (
                <LoadingButton
                  loading={btnLoading(`status_${viewTask.id}`)} loadingText="Completing…"
                  onClick={async () => { await updateStatus(viewTask.id, 'completed'); setViewTask(t => ({ ...t, status: 'completed' })); }}
                  style={actionBtn('#22c55e', '#f0fdf4')}
                >
                  ✓ Mark Complete
                </LoadingButton>
              )}
              <button
                onClick={() => { openEdit(viewTask); setViewTask(null); }}
                style={{ background: '#f3f4f6', border: 'none', borderRadius: 10, padding: '8px 18px', fontSize: 13, fontWeight: 600, color: '#374151', cursor: 'pointer' }}
              >
                ✏️ Edit
              </button>
              <button
                onClick={() => setViewTask(null)}
                style={{ background: 'transparent', border: '1px solid #e5e7eb', borderRadius: 10, padding: '8px 18px', fontSize: 13, fontWeight: 600, color: '#6b7280', cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}