import React, { useState, useEffect, useRef } from 'react';
import { iamAPI, rolesAPI, employeesAPI } from '../services/api';
import { useButtonLoading } from '../hooks/useAsync';
import LoadingButton from '../components/ui/LoadingButton';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'react-toastify';
const EyeIcon = <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
const EyeOffIcon = <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>;
import { ConfirmDialog } from '../components/layout/Layout';

const ACCESS_LEVEL_COLORS = {
  read: 'badge-new', write: 'badge-pending',
  admin: 'badge-relieved', full: 'badge-relieved',
};
const SYSTEMS = ['Jira','GitHub','AWS','GCP','Azure','Confluence','Slack','Notion',
  'Zoho','Salesforce','HubSpot','ServiceNow','Figma','GitLab','Bitbucket','Jenkins','SonarQube'];
const ACCESS_LEVELS = ['read','write','admin','full'];

const ASSET_STATUS_STYLE = {
  allocated: { bg: 'var(--success-bg)', border: 'var(--success)', color: 'var(--success)', label: '✓ Allocated', icon: '✅' },
  collected: { bg: 'var(--danger-bg)', border: 'var(--danger)', color: 'var(--danger)', label: '↩ Collected', icon: '📤' },
  not_assigned: { bg: 'var(--bg)', border: 'var(--border)', color: 'var(--text-muted)', label: 'Not Assigned', icon: '○' },
};

export default function IAMPage() {
  const { user, can } = useAuth();
  const isAdmin = can('can_view_iam') && can('can_manage_employees');
  const isManage = can('can_manage_iam');
  const { run: btnRun, isLoading: btnLoading } = useButtonLoading();

  const defaultTab = isAdmin ? 'accounts' : 'myaccess';
  const [tab, setTab] = useState(defaultTab);
  const [accounts, setAccounts] = useState([]);
  const [systemAccesses, setSystemAccesses] = useState([]);
  const [myAccesses, setMyAccesses] = useState([]);
  const [myAssets, setMyAssets] = useState([]);
  const [roles, setRoles] = useState([]);
  const [assetTypes, setAssetTypes] = useState([]);
  const [upcomingRelieving, setUpcomingRelieving] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resetModal, setResetModal] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [saModal, setSaModal] = useState(false);
  const [saForm, setSaForm] = useState({ role_id: '', system_name: '', access_level: 'read' });
  const [assetModal, setAssetModal] = useState(null);
  const [selectedAssets, setSelectedAssets] = useState([]);
  const [filterRole, setFilterRole] = useState('');
  const [saDeleteTarget, setSaDeleteTarget] = useState(null);

  useEffect(() => {
    setLoading(true);
    const calls = [
      iamAPI.listSystemAccesses().then(r => setMyAccesses(r.data)).catch(() => {}),
      iamAPI.getAssetTypes().then(r => setAssetTypes(r.data)).catch(() => {}),
      iamAPI.getMyAssets().then(r => setMyAssets(r.data)).catch(() => {}),
    ];
    if (isAdmin) {
      calls.push(
        iamAPI.listAccounts().then(r => setAccounts(r.data)).catch(() => {}),
        rolesAPI.list().then(r => setRoles(r.data)).catch(() => {}),
        iamAPI.upcomingRelieving().then(r => setUpcomingRelieving(r.data)).catch(() => {}),
      );
    }
    Promise.all(calls).finally(() => setLoading(false));
  }, [isAdmin]);

  const loadSystemAccesses = (roleId = '') => {
    iamAPI.listSystemAccesses(roleId || undefined).then(r => setSystemAccesses(r.data)).catch(() => {});
  };
  useEffect(() => { if (isAdmin) loadSystemAccesses(filterRole); }, [isAdmin, filterRole]);

  const toggleAccount = async (id) => {
    try {
      const { data } = await iamAPI.toggleAccount(id);
      setAccounts(accounts.map(a => a.id === id ? { ...a, is_active: data.is_active } : a));
      toast.success(`Login access ${data.is_active ? 'restored' : 'blocked'}`);
    } catch { toast.error('Failed'); }
  };

  const handleReset = async () => {
    if (!newPassword || newPassword.length < 6) return toast.error('Min 6 chars');
    try {
      await iamAPI.resetPassword(resetModal, newPassword);
      toast.success('Password reset'); setResetModal(null); setNewPassword('');
    } catch { toast.error('Failed'); }
  };

  const addSA = async () => {
    try {
      await iamAPI.createSystemAccess(saForm);
      toast.success('Access rule created'); setSaModal(false); loadSystemAccesses(filterRole);
    } catch { toast.error('Failed'); }
  };

  const sendAssetEmail = () => btnRun('asset', async () => {
    if (!selectedAssets.length) return toast.error('Select at least one asset');
    try {
      if (assetModal.action === 'allocate') {
        await iamAPI.sendJoiningAssets(assetModal.employee.id || assetModal.employee.employee_id_uuid, selectedAssets);
        // Record in DB
        for (const a of selectedAssets) {
          await iamAPI.recordAsset(assetModal.employee.id || assetModal.employee.employee_id_uuid, a, 'allocate').catch(() => {});
        }
      } else {
        await iamAPI.sendRelievingAssets(assetModal.employee.id || assetModal.employee.employee_id_uuid, selectedAssets);
        for (const a of selectedAssets) {
          await iamAPI.recordAsset(assetModal.employee.id || assetModal.employee.employee_id_uuid, a, 'collect').catch(() => {});
        }
      }
      toast.success('Asset email sent to HR!');
      setAssetModal(null); setSelectedAssets([]);
      // Refresh my assets if it's current user
      iamAPI.getMyAssets().then(r => setMyAssets(r.data)).catch(() => {});
    } catch { toast.error('Failed to send email'); }
  });

  const TABS = [
    ...(isAdmin ? [
      { id: 'accounts', label: '👤 User Accounts' },
      { id: 'access', label: '🔗 System Access' },
      { id: 'assets', label: '📦 Asset Management' },
      { id: 'relieving', label: `⏰ Relieving (${upcomingRelieving.length})` },
    ] : []),
    { id: 'myaccess', label: '🔐 My System Access' },
    { id: 'myassets', label: '📦 My Assets' },
  ];

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <h1 className="page-title">Identity & Access Management</h1>
        <p className="page-subtitle">
          {isAdmin ? 'Manage accounts, access rules, and device allocation' : 'View your system access and assigned assets'}
        </p>
      </div>

      {isAdmin && (
        <div className="stat-grid" style={{ marginBottom: 24 }}>
          {[
            { label: 'Total Accounts', value: accounts.length, icon: '🔐', cls: 'blue' },
            { label: 'Active', value: accounts.filter(a => a.is_active).length, icon: '✅', cls: 'green' },
            { label: 'Login Blocked', value: accounts.filter(a => !a.is_active).length, icon: '🔒', cls: 'red' },
            { label: 'Upcoming Relieving', value: upcomingRelieving.length, icon: '⏰', cls: 'orange' },
          ].map(s => (
            <div className="stat-card" key={s.label}>
              <div className={`stat-icon ${s.cls}`}>{s.icon}</div>
              <div className="stat-info"><div className="stat-value">{s.value}</div><div className="stat-label">{s.label}</div></div>
            </div>
          ))}
        </div>
      )}

      <div className="tabs">
        {TABS.map(t => (
          <div key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</div>
        ))}
      </div>

      {loading ? <div className="loading-overlay"><div className="spinner" /></div> : (
        <>
          {/* ── User Accounts ── */}
          {tab === 'accounts' && (
            <div className="card">
              <div className="card-header"><span className="card-title">User Accounts ({accounts.length})</span></div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>User</th><th>Department</th><th>Role</th><th>Last Login</th><th>Status</th><th style={{ textAlign: "center" }}>Actions</th></tr></thead>
                  <tbody>
                    {accounts.map(acc => (
                      <tr key={acc.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div className="avatar avatar-sm">{acc.username.slice(0,2).toUpperCase()}</div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 14 }}>{acc.employee_name}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{acc.username}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontSize: 13 }}>{acc.department || '—'}</td>
                        <td style={{ fontSize: 13 }}>{acc.role || '—'}</td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{acc.last_login ? new Date(acc.last_login).toLocaleString() : 'Never'}</td>
                        <td><span className={`badge ${acc.is_active ? 'badge-active' : 'badge-relieved'}`}>{acc.is_active ? 'Login Active' : 'Login Blocked'}</span></td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className={`btn btn-sm ${acc.is_active ? 'btn-outline' : 'btn-accent'}`} onClick={() => toggleAccount(acc.id)}>
                              {acc.is_active ? '🔒 Block Login' : '🔓 Allow Login'}
                            </button>
                            {isManage && (
                              <button className="btn btn-ghost btn-sm" onClick={() => { setResetModal(acc.id); setNewPassword(''); setShowNewPassword(false); }}>🔑 Reset</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── System Access Rules ── */}
          {tab === 'access' && (
            <div className="card">
              <div className="card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span className="card-title">System Access Rules</span>
                  <select className="form-control" style={{ width: 200 }} value={filterRole} onChange={e => setFilterRole(e.target.value)}>
                    <option value="">All Roles</option>
                    {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
                {isManage && <button className="btn btn-primary btn-sm" onClick={() => { setSaForm({ role_id: '', system_name: '', access_level: 'read' }); setSaModal(true); }}>+ Add Rule</button>}
              </div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Role</th><th>System</th><th>Access Level</th><th>Status</th>{isManage && <th>Actions</th>}</tr></thead>
                  <tbody>
                    {systemAccesses.map(sa => (
                      <tr key={sa.id}>
                        <td style={{ fontWeight: 600 }}>{roles.find(r => r.id === sa.role_id)?.name || '—'}</td>
                        <td><span style={{ fontSize: 14 }}>💻 {sa.system_name}</span></td>
                        <td><span className={`badge ${ACCESS_LEVEL_COLORS[sa.access_level] || 'badge-new'}`}>{sa.access_level}</span></td>
                        <td><span className={`badge ${sa.is_active ? 'badge-active' : 'badge-inactive'}`}>{sa.is_active ? 'Active' : 'Inactive'}</span></td>
                        {isManage && <td><button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => setSaDeleteTarget(sa)}>🗑 Remove</button></td>}
                      </tr>
                    ))}
                    {systemAccesses.length === 0 && (
                      <tr><td colSpan={5}><div className="empty-state" style={{ padding: 24 }}><h3>No rules {filterRole ? 'for this role' : 'yet'}</h3></div></td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Asset Management (Admin) ── */}
          {tab === 'assets' && <AssetEmployeeList assetTypes={assetTypes} onAllocate={emp => { setAssetModal({ employee: emp, action: 'allocate' }); setSelectedAssets([]); }} onCollect={emp => { setAssetModal({ employee: emp, action: 'collect' }); setSelectedAssets([]); }} />}

          {/* ── Upcoming Relieving ── */}
          {tab === 'relieving' && (
            <div className="card">
              <div className="card-header"><span className="card-title">⏰ Employees Relieving in Next 7 Days</span></div>
              {upcomingRelieving.length === 0 ? (
                <div className="empty-state"><div className="empty-state-icon">✅</div><h3>No upcoming relieving</h3></div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Employee</th><th>Department</th><th>Role</th><th>Relieving Date</th><th>Days Left</th><th>Action</th></tr></thead>
                    <tbody>
                      {upcomingRelieving.map(emp => (
                        <tr key={emp.id}>
                          <td><div style={{ fontWeight: 600 }}>{emp.name}</div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{emp.employee_id}</div></td>
                          <td>{emp.department || '—'}</td><td>{emp.role || '—'}</td>
                          <td style={{ fontWeight: 600 }}>{emp.relieving_date}</td>
                          <td><span className={`badge ${emp.days_left <= 2 ? 'badge-relieved' : emp.days_left <= 4 ? 'badge-pending' : 'badge-new'}`}>{emp.days_left === 0 ? 'Today!' : `${emp.days_left}d`}</span></td>
                          <td><button className="btn btn-danger btn-sm" onClick={() => { setAssetModal({ employee: emp, action: 'collect' }); setSelectedAssets([]); }}>📦 Send Alert</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── My System Access ── */}
          {tab === 'myaccess' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: 16 }}>
              {myAccesses.length === 0 ? (
                <div className="card" style={{ gridColumn: '1/-1' }}>
                  <div className="empty-state">
                    <div className="empty-state-icon">🔐</div>
                    <h3>No system access assigned yet</h3>
                    <p>Contact HR to request system access for your role</p>
                  </div>
                </div>
              ) : myAccesses.map(sa => (
                <div key={sa.id} className="card" style={{ padding: '20px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--accent-pale)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>💻</div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{sa.system_name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>System Access</div>
                      </div>
                    </div>
                    <span className={`badge ${ACCESS_LEVEL_COLORS[sa.access_level] || 'badge-new'}`}>{sa.access_level}</span>
                  </div>
                  <div style={{ padding: '8px 12px', background: 'var(--success-bg)', borderRadius: 6, fontSize: 12, color: 'var(--success)', fontWeight: 600 }}>
                    ✅ Access Active
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── My Assets ── */}
          {tab === 'myassets' && (
            <div>
              <div style={{ marginBottom: 16, padding: '12px 18px', background: 'var(--accent-pale)', borderRadius: 10, fontSize: 14, color: 'var(--primary)' }}>
                📦 This shows assets allocated to you by HR. Contact HR to request or return any asset.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px,1fr))', gap: 14 }}>
                {myAssets.map(asset => {
                  const style = ASSET_STATUS_STYLE[asset.status];
                  return (
                    <div key={asset.id} style={{
                      background: style.bg, border: `2px solid ${style.border}`,
                      borderRadius: 12, padding: '20px 16px', textAlign: 'center',
                      transition: 'box-shadow 0.2s',
                    }}>
                      <div style={{ fontSize: 36, marginBottom: 8 }}>{asset.icon}</div>
                      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{asset.label}</div>
                      <div style={{ fontSize: 12, color: style.color, fontWeight: 600, marginBottom: 4 }}>
                        {style.icon} {style.label}
                      </div>
                      {asset.date && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{asset.date}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Asset Modal */}
      {assetModal && (
        <div className="modal-overlay" onClick={() => setAssetModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">
                {assetModal.action === 'allocate' ? '📦 Allocate Assets' : '📥 Collect Assets'} — {assetModal.employee.name || `${assetModal.employee.first_name} ${assetModal.employee.last_name}`}
              </span>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setAssetModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                Select assets to {assetModal.action === 'allocate' ? 'allocate to' : 'collect from'} this employee. An email will be sent to HR.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {assetTypes.map(asset => (
                  <label key={asset.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '12px',
                    borderRadius: 8, cursor: 'pointer',
                    border: `2px solid ${selectedAssets.includes(asset.id) ? 'var(--primary)' : 'var(--border)'}`,
                    background: selectedAssets.includes(asset.id) ? 'var(--accent-pale)' : 'var(--bg)',
                  }}>
                    <input type="checkbox" style={{ display: 'none' }} checked={selectedAssets.includes(asset.id)}
                      onChange={() => setSelectedAssets(p => p.includes(asset.id) ? p.filter(x => x !== asset.id) : [...p, asset.id])} />
                    <span style={{ fontSize: 22 }}>{asset.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{asset.label}</span>
                    {selectedAssets.includes(asset.id) && <span style={{ marginLeft: 'auto', color: 'var(--primary)', fontWeight: 700 }}>✓</span>}
                  </label>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setAssetModal(null)}>Cancel</button>
              <LoadingButton className="btn btn-primary" loading={btnLoading('asset')} loadingText="Sending…" onClick={sendAssetEmail} disabled={!selectedAssets.length}>
                📧 Send Email to HR ({selectedAssets.length} selected)
              </LoadingButton>
            </div>
          </div>
        </div>
      )}

      {/* Reset Modal */}
      {resetModal && (
        <div className="modal-overlay" onClick={() => setResetModal(null)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Reset Password</span>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setResetModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label required">New Password</label>
                <div style={{ position: 'relative' }}>
                  <input type={showNewPassword ? 'text' : 'password'} className="form-control" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min 6 characters" style={{ paddingRight: 42 }} />
                  <button type="button" onClick={() => setShowNewPassword(v => !v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#9ca3af', padding: 0, lineHeight: 1 }} tabIndex={-1}>{showNewPassword ? EyeOffIcon : EyeIcon}</button>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setResetModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleReset}>Reset Password</button>
            </div>
          </div>
        </div>
      )}

      {/* Add System Access Modal */}
      {saModal && (
        <div className="modal-overlay" onClick={() => setSaModal(false)}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Add System Access Rule</span>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setSaModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label required">Role</label>
                <select className="form-control" value={saForm.role_id} onChange={e => setSaForm(f => ({ ...f, role_id: e.target.value }))}>
                  <option value="">Select Role</option>
                  {roles.map(r => <option key={r.id} value={r.id}>{r.name} ({r.department?.name})</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label required">System</label>
                <select className="form-control" value={saForm.system_name} onChange={e => setSaForm(f => ({ ...f, system_name: e.target.value }))}>
                  <option value="">Select</option>
                  {SYSTEMS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label required">Access Level</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {ACCESS_LEVELS.map(l => (
                    <label key={l} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8, cursor: 'pointer', border: `2px solid ${saForm.access_level === l ? 'var(--primary)' : 'var(--border)'}`, background: saForm.access_level === l ? 'var(--accent-pale)' : 'var(--bg)' }}>
                      <input type="radio" name="al" value={l} style={{ display: 'none' }} checked={saForm.access_level === l} onChange={() => setSaForm(f => ({ ...f, access_level: l }))} />
                      <span className={`badge ${ACCESS_LEVEL_COLORS[l]}`}>{l}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setSaModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={addSA} disabled={!saForm.role_id || !saForm.system_name}>Create Rule</button>
            </div>
          </div>
        </div>
      )}
      {saDeleteTarget && (
        <ConfirmDialog
          title="🗑 Remove System Access"
          message={`Remove "${saDeleteTarget.system_name}" access for this role? Employees with this role will lose access.`}
          confirmLabel="Yes, Remove"
          cancelLabel="Cancel"
          onConfirm={async () => {
            try {
              await iamAPI.deleteSystemAccess(saDeleteTarget.id);
              toast.success('Access rule deleted');
              loadSystemAccesses(filterRole);
            } catch { toast.error('Failed to delete'); }
            finally { setSaDeleteTarget(null); }
          }}
          onCancel={() => setSaDeleteTarget(null)}
          variant="danger"
        />
      )}
    </>
  );
}

function AssetEmployeeList({ assetTypes, onAllocate, onCollect }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    employeesAPI.list({ page: 1, size: 100, status: 'active' })
      .then(r => setEmployees(r.data.items)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtered = employees.filter(e => `${e.first_name} ${e.last_name} ${e.employee_id}`.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="loading-overlay"><div className="spinner" /></div>;

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Active Employees ({employees.length})</span>
        <input className="form-control" style={{ width: 220 }} placeholder="Search employee…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Employee</th><th>Department</th><th>Role</th><th>Joining Date</th><th>Allocate</th><th>Collect</th></tr></thead>
          <tbody>
            {filtered.map(emp => (
              <tr key={emp.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="avatar avatar-sm" style={{ background: `hsl(${emp.first_name.charCodeAt(0)*5},60%,45%)` }}>{emp.first_name[0]}{emp.last_name[0]}</div>
                    <div><div style={{ fontWeight: 600, fontSize: 13 }}>{emp.first_name} {emp.last_name}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{emp.employee_id}</div></div>
                  </div>
                </td>
                <td style={{ fontSize: 13 }}>{emp.department?.name || '—'}</td>
                <td style={{ fontSize: 13 }}>{emp.role?.name || '—'}</td>
                <td style={{ fontSize: 13 }}>{emp.joining_date || '—'}</td>
                <td><button className="btn btn-accent btn-sm" onClick={() => onAllocate(emp)}>📦 Allocate</button></td>
                <td><button className="btn btn-outline btn-sm" style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }} onClick={() => onCollect(emp)}>📥 Collect</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}