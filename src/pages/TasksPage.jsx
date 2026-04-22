import React, { useState, useEffect, useCallback } from 'react';
import { tasksAPI } from '../services/api';
import { useNotifications } from '../hooks/useNotifications';
import { useButtonLoading } from '../hooks/useAsync';
import LoadingButton from '../components/ui/LoadingButton';
import { toast } from 'react-toastify';

const PRIORITY_COLORS = {
  high:   { bg: '#fef2f2', color: '#dc2626', border: '#fca5a5' },
  medium: { bg: '#fffbeb', color: '#d97706', border: '#fcd34d' },
  low:    { bg: '#f0fdf4', color: '#16a34a', border: '#86efac' },
};

const STATUS_LABELS = {
  pending:     { label: 'Pending',     cls: 'badge-pending'  },
  in_progress: { label: 'In Progress', cls: 'badge-new'      },
  completed:   { label: 'Completed',   cls: 'badge-active'   },
  skipped:     { label: 'Skipped',     cls: 'badge-inactive' },
};

export default function TasksPage() {
  const { refresh: refreshNotifs } = useNotifications();
  const [tasks, setTasks]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState('pending');
  const [selected, setSelected]   = useState(null);
  const [note, setNote]           = useState('');
  const { run: btnRun, isLoading } = useButtonLoading();

  const load = useCallback(() => {
    setLoading(true);
    tasksAPI.list({ status: filter === 'all' ? undefined : filter })
      .then(r => setTasks(r.data?.items || r.data || []))
      .catch(() => toast.error('Failed to load tasks'))
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const handleComplete = (task, skip = false) => {
    const key = `${task.id}-${skip ? 'skip' : 'done'}`;
    btnRun(key, async () => {
      try {
        await tasksAPI.complete(task.id, { note, skipped: skip });
        toast.success(skip ? 'Task skipped' : 'Task completed!');
        setSelected(null);
        setNote('');
        load();
        refreshNotifs?.();
      } catch (e) {
        toast.error(e?.response?.data?.detail || 'Failed to update task');
      }
    });
  };

  const TABS = [
    { key: 'pending',     label: 'Pending'     },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'completed',   label: 'Completed'   },
    { key: 'all',         label: 'All'         },
  ];

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <h1 className="page-title">My Tasks</h1>
        <p className="page-subtitle">Onboarding and HR tasks assigned to you</p>
      </div>

      <div className="tabs" style={{ marginBottom: 20 }}>
        {TABS.map(t => (
          <button
            key={t.key}
            className={`tab${filter === t.key ? ' active' : ''}`}
            onClick={() => setFilter(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-overlay"><div className="spinner" /></div>
      ) : tasks.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">✅</div>
            <h3>No tasks here</h3>
            <p>You're all caught up!</p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {tasks.map(task => {
            const pColors = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium;
            const sInfo   = STATUS_LABELS[task.status]     || STATUS_LABELS.pending;
            const isActionable = task.status === 'pending' || task.status === 'in_progress';
            return (
              <div
                key={task.id}
                className="card"
                style={{ padding: '16px 20px', cursor: 'pointer', borderLeft: `4px solid ${pColors.border}` }}
                onClick={() => { setSelected(task); setNote(''); }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 15 }}>{task.title}</span>
                      <span className="badge" style={{ background: pColors.bg, color: pColors.color, border: `1px solid ${pColors.border}` }}>
                        {task.priority}
                      </span>
                      <span className={`badge ${sInfo.cls}`}>{sInfo.label}</span>
                    </div>
                    {task.description && (
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                        {task.description}
                      </p>
                    )}
                    {task.due_date && (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                        📅 Due: {task.due_date}
                      </div>
                    )}
                  </div>
                  {isActionable && (
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={e => { e.stopPropagation(); handleComplete(task); }}
                        disabled={isLoading(`${task.id}-done`)}
                      >
                        ✓ Done
                      </button>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={e => { e.stopPropagation(); handleComplete(task, true); }}
                        disabled={isLoading(`${task.id}-skip`)}
                      >
                        Skip
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Task detail modal */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{selected.title}</span>
              <button className="btn btn-ghost btn-icon" onClick={() => setSelected(null)}>✕</button>
            </div>
            <div className="modal-body">
              {selected.description && (
                <p style={{ marginBottom: 16, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {selected.description}
                </p>
              )}
              {selected.employee && (
                <div style={{ marginBottom: 16, padding: '10px 14px', background: 'var(--accent-pale)', borderRadius: 8, fontSize: 13, color: 'var(--primary)' }}>
                  👤 Assigned for: <strong>{selected.employee.first_name} {selected.employee.last_name}</strong>
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Add a note (optional)</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Describe what was done..."
                />
              </div>
            </div>
            {(selected.status === 'pending' || selected.status === 'in_progress') && (
              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={() => setSelected(null)}>Cancel</button>
                <button
                  className="btn btn-outline"
                  onClick={() => handleComplete(selected, true)}
                  disabled={isLoading(`${selected.id}-skip`)}
                >
                  Skip Task
                </button>
                <LoadingButton
                  className="btn btn-primary"
                  loading={isLoading(`${selected.id}-done`)}
                  onClick={() => handleComplete(selected)}
                >
                  Mark Complete
                </LoadingButton>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
