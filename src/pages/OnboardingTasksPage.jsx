import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { tasksAPI, onboardingAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useButtonLoading } from '../hooks/useAsync';
import LoadingButton from '../components/ui/LoadingButton';
import { toast } from 'react-toastify';

// ── Constants ─────────────────────────────────────────────────────────────────

const TEAM_META = {
  hr:        { icon: '👥', label: 'HR',        bg: '#f0fdf4', border: '#22c55e', text: '#15803d' },
  it:        { icon: '💻', label: 'IT',        bg: '#eff6ff', border: '#3b82f6', text: '#1d4ed8' },
  insurance: { icon: '🏥', label: 'Insurance', bg: '#fff7ed', border: '#f97316', text: '#c2410c' },
  admin:     { icon: '🏢', label: 'Admin',     bg: '#fdf4ff', border: '#a855f7', text: '#7e22ce' },
  finance:   { icon: '💰', label: 'Finance',   bg: '#fefce8', border: '#eab308', text: '#92400e' },
};

const TYPE_ICONS = {
  general: '📋', onboarding: '🚀', relieving: '🚪',
  asset: '📦', document: '📄', insurance: '🏥',
};

const STATUS_META = {
  pending:     { label: 'Pending',     icon: '⏳', cls: 'badge-pending',  color: 'var(--warning)' },
  in_progress: { label: 'In Progress', icon: '🔄', cls: 'badge-new',      color: 'var(--info)'    },
  completed:   { label: 'Done',        icon: '✅', cls: 'badge-active',   color: 'var(--success)' },
  cancelled:   { label: 'Cancelled',   icon: '❌', cls: 'badge-inactive', color: 'var(--text-muted)' },
};

const PRIORITY_COLOR = {
  urgent: 'var(--danger)', high: 'var(--warning)',
  medium: 'var(--info)',   low: 'var(--text-muted)',
};

const TEAM_PREFIXES = {
  hr: ['HR-'], it: ['IT-'], insurance: ['INS-', 'FIN-'], admin: ['ADM-'], finance: ['FIN-'],
};

function getUserTeam(roleCode) {
  if (!roleCode) return null;
  for (const [team, prefixes] of Object.entries(TEAM_PREFIXES)) {
    if (prefixes.some(p => roleCode.startsWith(p))) return team;
  }
  return null;
}

function extractTeam(notes) {
  if (!notes) return null;
  const m = notes.match(/\[team:(\w+)\]/);
  return m ? m[1] : null;
}

function isOverdue(due, status) {
  if (!due || status === 'completed' || status === 'cancelled') return false;
  return new Date(due) < new Date();
}

// ── Sub-components ────────────────────────────────────────────────────────────

function TeamBadge({ team }) {
  const m = TEAM_META[team];
  if (!m) return null;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700,
      background: m.bg, border: `1px solid ${m.border}`, color: m.text,
    }}>
      {m.icon} {m.label}
    </span>
  );
}

function ProgressBar({ tasks }) {
  const total = tasks.length;
  if (total === 0) return null;
  const done = tasks.filter(t => t.status === 'completed').length;
  const inProg = tasks.filter(t => t.status === 'in_progress').length;
  const pct = Math.round((done / total) * 100);
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
        <span>{done}/{total} tasks completed</span>
        <span style={{ fontWeight: 600, color: pct === 100 ? 'var(--success)' : 'var(--text-primary)' }}>{pct}%</span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 3, transition: 'width .4s',
          background: pct === 100 ? 'var(--success)' : 'linear-gradient(90deg, var(--primary), var(--accent))',
          width: `${pct}%`,
        }} />
      </div>
      {inProg > 0 && (
        <div style={{ fontSize: 11, color: 'var(--info)', marginTop: 3 }}>
          🔄 {inProg} in progress
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function OnboardingTasksPage() {
  const navigate = useNavigate();
  const { user, can } = useAuth();
  const { run: btnRun, isLoading: btnLoading } = useButtonLoading();

  const isHR = can('can_view_dashboard');
  const isSuperadmin = user?.is_superadmin;
  const userRoleCode = user?.role_code || '';

  // Determine which team this user belongs to
  const myTeam = getUserTeam(userRoleCode);

  const [allTasks, setAllTasks]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [filterTeam, setFilterTeam]   = useState('');       // '' = all
  const [filterStatus, setFilterStatus] = useState('active'); // 'active' = pending+in_progress, '' = all
  const [expandedEmp, setExpandedEmp] = useState({});       // { empId: true/false }
  const [viewTask, setViewTask]       = useState(null);
  const [stats, setStats]             = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all onboarding tasks (HR sees all, others see their team)
      const params = { task_type: 'onboarding' };
      if (!isHR && !isSuperadmin) {
        // Non-HR sees their team + personally assigned tasks
        params.include_team = true;
      }
      // Also fetch asset/document/insurance tasks that are onboarding-related
      const [obRes, assetRes, docRes, insRes] = await Promise.all([
        tasksAPI.list({ task_type: 'onboarding',  include_team: true }),
        tasksAPI.list({ task_type: 'asset',       include_team: true }),
        tasksAPI.list({ task_type: 'document',    include_team: true }),
        tasksAPI.list({ task_type: 'insurance',   include_team: true }),
      ]);
      const combined = [
        ...(obRes.data  || []),
        ...(assetRes.data || []),
        ...(docRes.data || []),
        ...(insRes.data || []),
      ];
      // Deduplicate by id
      const seen = new Set();
      const deduped = combined.filter(t => {
        if (seen.has(t.id)) return false;
        seen.add(t.id);
        return true;
      });
      setAllTasks(deduped);

      // Compute stats
      const s = {
        total: deduped.length,
        pending: deduped.filter(t => t.status === 'pending').length,
        in_progress: deduped.filter(t => t.status === 'in_progress').length,
        completed: deduped.filter(t => t.status === 'completed').length,
        overdue: deduped.filter(t => isOverdue(t.due_date, t.status)).length,
      };
      setStats(s);

      // Auto-expand groups with active tasks
      const empGroups = groupByEmployee(deduped);
      const newExpanded = {};
      empGroups.forEach(g => {
        const hasActive = g.tasks.some(t => t.status === 'pending' || t.status === 'in_progress');
        newExpanded[g.empId] = hasActive;
      });
      setExpandedEmp(newExpanded);
    } catch {
      toast.error('Failed to load onboarding tasks');
    }
    setLoading(false);
  }, [isHR, isSuperadmin]);

  useEffect(() => { load(); }, [load]);

  // ── Group tasks by employee ────────────────────────────────────────────────
  function groupByEmployee(tasks) {
    const map = new Map();
    tasks.forEach(t => {
      const key = t.related_employee_id || '__unlinked__';
      if (!map.has(key)) {
        map.set(key, {
          empId: key,
          empName: t.related_employee_name || 'General Tasks',
          tasks: [],
        });
      }
      map.get(key).tasks.push(t);
    });
    // Sort: employees with active tasks first, then by name
    return Array.from(map.values()).sort((a, b) => {
      const aActive = a.tasks.some(t => t.status === 'pending' || t.status === 'in_progress');
      const bActive = b.tasks.some(t => t.status === 'pending' || t.status === 'in_progress');
      if (aActive && !bActive) return -1;
      if (!aActive && bActive) return 1;
      return a.empName.localeCompare(b.empName);
    });
  }

  // ── Filter tasks ──────────────────────────────────────────────────────────
  function applyFilters(tasks) {
    return tasks.filter(t => {
      const team = extractTeam(t.notes);
      if (filterTeam && team !== filterTeam) return false;
      if (filterStatus === 'active' && t.status !== 'pending' && t.status !== 'in_progress') return false;
      if (filterStatus && filterStatus !== 'active' && t.status !== filterStatus) return false;
      return true;
    });
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  const claimTask = async (taskId) => {
    await btnRun(`claim_${taskId}`, async () => {
      await tasksAPI.claim(taskId);
      toast.success('Task claimed — you\'re now working on it');
      load();
    });
  };

  const unclaimTask = async (taskId) => {
    await btnRun(`unclaim_${taskId}`, async () => {
      await tasksAPI.unclaim(taskId);
      toast.info('Task returned to team pool');
      load();
    });
  };

  const updateStatus = async (taskId, status) => {
    await btnRun(`status_${taskId}`, async () => {
      await tasksAPI.update(taskId, { status });
      if (viewTask?.id === taskId) setViewTask(v => ({ ...v, status }));
      load();
    });
  };

  // ── Task card ──────────────────────────────────────────────────────────────
  const TaskCard = ({ task }) => {
    const team     = extractTeam(task.notes);
    const sm       = STATUS_META[task.status] || STATUS_META.pending;
    const overdue  = isOverdue(task.due_date, task.status);
    const isMe     = task.assigned_to === user?.id;
    const isTeam   = !!team;
    const canClaim = isTeam && !task.assigned_to && task.status === 'pending';
    const canUnclaim = isMe && isTeam && task.status !== 'completed';
    const canStart = task.status === 'pending' && (isMe || isTeam);
    const canDone  = task.status === 'in_progress' && (isMe || isHR);

    return (
      <div
        onClick={() => setViewTask(task)}
        style={{
          padding: '12px 16px',
          borderRadius: 10,
          border: `1px solid ${overdue ? '#fca5a5' : 'var(--border-light)'}`,
          background: overdue ? '#fff8f8' : 'var(--bg-card)',
          cursor: 'pointer',
          transition: 'box-shadow .15s, transform .15s',
          marginBottom: 8,
        }}
        onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          {/* Icon */}
          <span style={{ fontSize: 20, lineHeight: 1, paddingTop: 2, flexShrink: 0 }}>
            {TYPE_ICONS[task.task_type] || '📋'}
          </span>

          {/* Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontWeight: 700, fontSize: 13 }}>{task.title}</span>
              <span className={`badge ${sm.cls}`} style={{ fontSize: 10 }}>{sm.icon} {sm.label}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: PRIORITY_COLOR[task.priority] }}>
                {task.priority?.toUpperCase()}
              </span>
              <TeamBadge team={team} />
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, fontSize: 11, color: 'var(--text-muted)' }}>
              {task.due_date && (
                <span style={{ color: overdue ? 'var(--danger)' : 'var(--text-muted)', fontWeight: overdue ? 700 : 400 }}>
                  {overdue ? '🔴' : '📅'} {task.due_date}{overdue ? ' — OVERDUE' : ''}
                </span>
              )}
              {task.assigned_to_name
                ? <span style={{ color: isMe ? 'var(--primary)' : 'var(--text-muted)', fontWeight: isMe ? 700 : 400 }}>
                    🔄 {isMe ? 'You' : task.assigned_to_name}
                  </span>
                : isTeam && <span style={{ color: 'var(--text-muted)' }}>👤 Unclaimed</span>
              }
            </div>
          </div>

          {/* Action buttons — stop propagation so card click doesn't fire */}
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
            {canClaim && (
              <LoadingButton className="btn btn-outline btn-sm" style={{ fontSize: 11, padding: '3px 10px' }}
                loading={btnLoading(`claim_${task.id}`)} loadingText="…" onClick={() => claimTask(task.id)}>
                ✋ Claim
              </LoadingButton>
            )}
            {canUnclaim && (
              <LoadingButton className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: '3px 10px' }}
                loading={btnLoading(`unclaim_${task.id}`)} loadingText="…" onClick={() => unclaimTask(task.id)}>
                ↩
              </LoadingButton>
            )}
            {canStart && !canClaim && (
              <LoadingButton className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: '3px 10px' }}
                loading={btnLoading(`status_${task.id}`)} loadingText="…" onClick={() => updateStatus(task.id, 'in_progress')}>
                ▶ Start
              </LoadingButton>
            )}
            {canDone && (
              <LoadingButton className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: '3px 10px', color: 'var(--success)' }}
                loading={btnLoading(`status_${task.id}`)} loadingText="…" onClick={() => updateStatus(task.id, 'completed')}>
                ✓ Done
              </LoadingButton>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ── Employee group card ────────────────────────────────────────────────────
  const EmployeeGroup = ({ group }) => {
    const filtered = applyFilters(group.tasks);
    if (filtered.length === 0) return null;

    const isExpanded = expandedEmp[group.empId] !== false;
    const allDone    = group.tasks.every(t => t.status === 'completed' || t.status === 'cancelled');
    const hasOverdue = filtered.some(t => isOverdue(t.due_date, t.status));
    const pending    = filtered.filter(t => t.status === 'pending').length;
    const inProg     = filtered.filter(t => t.status === 'in_progress').length;
    const teams      = [...new Set(filtered.map(t => extractTeam(t.notes)).filter(Boolean))];

    return (
      <div className="card" style={{
        marginBottom: 16, padding: 0, overflow: 'hidden',
        border: hasOverdue ? '1px solid #fca5a5' : allDone ? '1px solid #86efac' : '1px solid var(--border)',
      }}>
        {/* Group header */}
        <div
          onClick={() => setExpandedEmp(e => ({ ...e, [group.empId]: !isExpanded }))}
          style={{
            padding: '14px 20px',
            display: 'flex', alignItems: 'center', gap: 12,
            cursor: 'pointer',
            background: allDone ? '#f0fdf4' : hasOverdue ? '#fff5f5' : 'var(--bg-card)',
            borderBottom: isExpanded ? '1px solid var(--border-light)' : 'none',
            transition: 'background .15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = allDone ? '#dcfce7' : hasOverdue ? '#fee2e2' : 'var(--accent-pale)'}
          onMouseLeave={e => e.currentTarget.style.background = allDone ? '#f0fdf4' : hasOverdue ? '#fff5f5' : 'var(--bg-card)'}
        >
          {/* Avatar */}
          <div className="avatar avatar-sm" style={{
            background: allDone ? 'var(--success)' : `hsl(${(group.empName.charCodeAt(0) || 65) * 7}, 55%, 50%)`,
            fontSize: 13, fontWeight: 800, flexShrink: 0,
          }}>
            {allDone ? '✓' : group.empName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
          </div>

          {/* Name + meta */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>{group.empName}</span>
              {allDone && <span style={{ fontSize: 11, color: 'var(--success)', fontWeight: 700 }}>✅ All Complete</span>}
              {hasOverdue && <span style={{ fontSize: 11, color: 'var(--danger)', fontWeight: 700 }}>⚠️ Overdue</span>}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
              {pending > 0   && <span style={{ fontSize: 11, color: 'var(--warning)', fontWeight: 600 }}>⏳ {pending} pending</span>}
              {inProg > 0    && <span style={{ fontSize: 11, color: 'var(--info)',    fontWeight: 600 }}>🔄 {inProg} in progress</span>}
              {teams.map(t => <TeamBadge key={t} team={t} />)}
            </div>
          </div>

          {/* Progress + expand toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <div style={{ textAlign: 'right' }}>
              <ProgressBar tasks={group.tasks} />
            </div>
            {group.empId !== '__unlinked__' && (
              <button
                className="btn btn-ghost btn-sm"
                style={{ fontSize: 11, padding: '3px 10px' }}
                onClick={e => { e.stopPropagation(); navigate(`/employees/${group.empId}`); }}
              >
                👤 Profile
              </button>
            )}
            <span style={{ color: 'var(--text-muted)', fontSize: 16 }}>{isExpanded ? '▲' : '▼'}</span>
          </div>
        </div>

        {/* Tasks list */}
        {isExpanded && (
          <div style={{ padding: '12px 16px' }}>
            {/* Group by team within this employee */}
            {Object.entries(
              filtered.reduce((acc, t) => {
                const team = extractTeam(t.notes) || 'general';
                if (!acc[team]) acc[team] = [];
                acc[team].push(t);
                return acc;
              }, {})
            ).map(([team, tasks]) => {
              const tm = TEAM_META[team];
              return (
                <div key={team} style={{ marginBottom: 12 }}>
                  {tm && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      marginBottom: 6, paddingBottom: 6,
                      borderBottom: `2px solid ${tm.border}20`,
                    }}>
                      <span style={{ fontSize: 13 }}>{tm.icon}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: tm.text, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {tm.label} Team
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        — {tasks.filter(t => t.status === 'completed').length}/{tasks.length} done
                      </span>
                    </div>
                  )}
                  {tasks.map(t => <TaskCard key={t.id} task={t} />)}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  const allGroups  = groupByEmployee(allTasks);
  const visGroups  = allGroups.filter(g => applyFilters(g.tasks).length > 0);
  const availTeams = [...new Set(allTasks.map(t => extractTeam(t.notes)).filter(Boolean))].sort();

  return (
    <>
      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">🚀 Onboarding Tasks</h1>
          <p className="page-subtitle">Track and complete onboarding tasks for new employees across all teams</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load} title="Refresh">🔄 Refresh</button>
      </div>

      {/* How it works banner */}
      <div style={{
        padding: '12px 16px', borderRadius: 10, marginBottom: 20,
        background: '#eff6ff', border: '1px solid #3b82f6', fontSize: 13, color: '#1d4ed8',
        display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center',
      }}>
        <strong>How to action tasks:</strong>
        <span>⏳ <strong>Claim</strong> an unassigned team task to take ownership</span>
        <span>▶ <strong>Start</strong> it to mark in-progress</span>
        <span>✓ <strong>Mark Done</strong> once completed</span>
        <span style={{ color: '#3b82f6' }}>↩ <em>Release</em> to return to team pool</span>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        {[
          { label: 'Total Tasks',  value: stats.total,       icon: '📋', cls: 'blue'   },
          { label: 'Pending',      value: stats.pending,     icon: '⏳', cls: 'orange' },
          { label: 'In Progress',  value: stats.in_progress, icon: '🔄', cls: 'teal'   },
          { label: 'Completed',    value: stats.completed,   icon: '✅', cls: 'green'  },
          ...(stats.overdue > 0 ? [{ label: 'Overdue', value: stats.overdue, icon: '🔴', cls: 'red' }] : []),
          { label: 'Employees',    value: allGroups.filter(g => g.empId !== '__unlinked__').length, icon: '👤', cls: 'blue' },
        ].map(s => (
          <div className="stat-card" key={s.label}>
            <div className={`stat-icon ${s.cls}`}>{s.icon}</div>
            <div className="stat-info">
              <div className="stat-value">{s.value ?? '—'}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Team filter */}
        <select className="form-control" style={{ width: 160 }} value={filterTeam} onChange={e => setFilterTeam(e.target.value)}>
          <option value="">All Teams</option>
          {availTeams.map(t => (
            <option key={t} value={t}>{TEAM_META[t]?.icon} {TEAM_META[t]?.label || t}</option>
          ))}
        </select>

        {/* Status filter */}
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 3 }}>
          {[
            { key: 'active',      label: 'Active' },
            { key: 'pending',     label: 'Pending' },
            { key: 'in_progress', label: 'In Progress' },
            { key: 'completed',   label: 'Completed' },
            { key: '',            label: 'All' },
          ].map(opt => (
            <button key={opt.key}
              onClick={() => setFilterStatus(opt.key)}
              style={{
                padding: '5px 12px', borderRadius: 6, border: 'none', fontSize: 12, fontWeight: 600,
                cursor: 'pointer', transition: 'all .15s',
                background: filterStatus === opt.key ? 'var(--primary)' : 'transparent',
                color: filterStatus === opt.key ? '#fff' : 'var(--text-muted)',
              }}>
              {opt.label}
            </button>
          ))}
        </div>

        <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-muted)' }}>
          {loading ? 'Loading…' : `${visGroups.length} employee${visGroups.length !== 1 ? 's' : ''}`}
        </span>
      </div>

      {/* My Team highlight */}
      {myTeam && !filterTeam && (
        <div style={{
          padding: '10px 16px', borderRadius: 10, marginBottom: 16,
          background: TEAM_META[myTeam]?.bg,
          border: `1px solid ${TEAM_META[myTeam]?.border}`,
          fontSize: 13, color: TEAM_META[myTeam]?.text,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ fontWeight: 700 }}>{TEAM_META[myTeam]?.icon} Your team: {TEAM_META[myTeam]?.label}</span>
          <span>— Your team's tasks are highlighted. Claim unassigned tasks to work on them.</span>
          <button className="btn btn-sm" style={{ marginLeft: 'auto', fontSize: 11, padding: '3px 10px', background: TEAM_META[myTeam]?.border, color: '#fff', border: 'none' }}
            onClick={() => setFilterTeam(myTeam)}>
            Show only my team
          </button>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          <p>Loading onboarding tasks…</p>
        </div>
      ) : visGroups.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🎉</div>
          <h3>No onboarding tasks found</h3>
          <p style={{ marginTop: 8 }}>
            {filterStatus === 'active'
              ? 'All onboarding tasks are completed!'
              : 'No tasks match the current filters.'}
          </p>
          {(filterTeam || filterStatus) && (
            <button className="btn btn-ghost btn-sm" style={{ marginTop: 12 }}
              onClick={() => { setFilterTeam(''); setFilterStatus('active'); }}>
              Clear filters
            </button>
          )}
        </div>
      ) : (
        visGroups.map(group => <EmployeeGroup key={group.empId} group={group} />)
      )}

      {/* ── Task Detail Modal ── */}
      {viewTask && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}
          onClick={e => { if (e.target === e.currentTarget) setViewTask(null); }}
        >
          <div className="card" style={{ width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 24 }}>{TYPE_ICONS[viewTask.task_type] || '📋'}</span>
                <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{viewTask.title}</h2>
              </div>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setViewTask(null)}>✕</button>
            </div>

            {/* Badges */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              <span className={`badge ${STATUS_META[viewTask.status]?.cls}`}>
                {STATUS_META[viewTask.status]?.icon} {STATUS_META[viewTask.status]?.label}
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: PRIORITY_COLOR[viewTask.priority] }}>
                {viewTask.priority?.toUpperCase()} PRIORITY
              </span>
              <TeamBadge team={extractTeam(viewTask.notes)} />
              {isOverdue(viewTask.due_date, viewTask.status) && (
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--danger)' }}>🔴 OVERDUE</span>
              )}
            </div>

            {/* Description */}
            {viewTask.description && (
              <div style={{ background: 'var(--bg)', borderRadius: 8, padding: 14, marginBottom: 16 }}>
                <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 }}>
                  {viewTask.description}
                </p>
              </div>
            )}

            {/* Meta grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px', fontSize: 13, marginBottom: 16 }}>
              {[
                ['For Employee',  viewTask.related_employee_name || '—'],
                ['Due Date',      viewTask.due_date || '—'],
                ['Assigned To',   viewTask.assigned_to_name || (viewTask.is_team_task ? '(Team — unassigned)' : '—')],
                ['Assigned By',   viewTask.assigned_by_name || '—'],
                ['Created',       new Date(viewTask.created_at).toLocaleDateString('en-IN')],
                ['Completed',     viewTask.completed_at ? new Date(viewTask.completed_at).toLocaleString() : '—'],
              ].map(([label, value]) => (
                <div key={label}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
                  <div style={{ fontWeight: 600 }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              {viewTask.is_team_task && !viewTask.assigned_to && viewTask.status === 'pending' && (
                <LoadingButton className="btn btn-primary btn-sm"
                  loading={btnLoading(`claim_${viewTask.id}`)} loadingText="Claiming…"
                  onClick={async () => { await claimTask(viewTask.id); setViewTask(null); }}>
                  ✋ Claim This Task
                </LoadingButton>
              )}
              {viewTask.status === 'pending' && (
                <LoadingButton className="btn btn-ghost btn-sm"
                  loading={btnLoading(`status_${viewTask.id}`)} loadingText="…"
                  onClick={() => updateStatus(viewTask.id, 'in_progress')}>
                  ▶ Start
                </LoadingButton>
              )}
              {viewTask.status === 'in_progress' && (
                <LoadingButton className="btn btn-ghost btn-sm" style={{ color: 'var(--success)' }}
                  loading={btnLoading(`status_${viewTask.id}`)} loadingText="…"
                  onClick={() => updateStatus(viewTask.id, 'completed')}>
                  ✓ Mark Complete
                </LoadingButton>
              )}
              {viewTask.related_employee_id && viewTask.related_employee_id !== '__unlinked__' && (
                <button className="btn btn-outline btn-sm"
                  onClick={() => { navigate(`/employees/${viewTask.related_employee_id}`); setViewTask(null); }}>
                  👤 View Employee
                </button>
              )}
              <button className="btn btn-ghost btn-sm" onClick={() => setViewTask(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}