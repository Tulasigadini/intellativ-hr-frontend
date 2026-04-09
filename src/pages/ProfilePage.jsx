import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { authAPI, employeesAPI, onboardingAPI } from '../services/api';
import { useButtonLoading } from '../hooks/useAsync';
import LoadingButton from '../components/ui/LoadingButton';
import { toast } from 'react-toastify';

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', marginBottom: 12, gap: 12, alignItems: 'flex-start' }}>
      <div style={{ width: 160, fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', flexShrink: 0, paddingTop: 2 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 500, color: value ? 'var(--text)' : 'var(--text-muted)', fontStyle: value ? 'normal' : 'italic' }}>
        {value || '—'}
      </div>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-muted)', margin: '20px 0 12px', textTransform: 'uppercase', letterSpacing: 1 }}>
      {children}
    </div>
  );
}

function calcDuration(start, end) {
  if (!start) return null;
  const s = new Date(start);
  const e = end ? new Date(end) : new Date();
  let months = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
  if (months < 0) return null;
  const yrs = Math.floor(months / 12);
  const mos = months % 12;
  if (yrs === 0) return `${mos} mo${mos !== 1 ? 's' : ''}`;
  if (mos === 0) return `${yrs} yr${yrs !== 1 ? 's' : ''}`;
  return `${yrs} yr${yrs !== 1 ? 's' : ''} ${mos} mo${mos !== 1 ? 's' : ''}`;
}

function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : null;
}

function DocViewer({ doc, employeeId }) {
  const [url, setUrl] = useState(null);
  const [type, setType] = useState(null);
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const ext = doc.document_name.split('.').pop().toLowerCase();
    setType(ext);
    fetch(`http://localhost:8000/api/v1/employees/${employeeId}/documents/${doc.id}/download`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.blob()).then(blob => setUrl(URL.createObjectURL(blob)));
  }, [doc.id, employeeId]);

  if (!url) return <div className="spinner" />;
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(type))
    return <img src={url} alt={doc.document_name} style={{ maxWidth: '100%', maxHeight: 600, borderRadius: 8 }} />;
  if (type === 'pdf')
    return <iframe src={url} title={doc.document_name} style={{ width: '100%', height: 560, border: 'none', borderRadius: 8 }} />;
  return (
    <div style={{ textAlign: 'center', padding: 40 }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>📄</div>
      <p style={{ color: 'var(--text-secondary)' }}>Preview not available for .{type} files</p>
    </div>
  );
}

function DocumentSection({ title, types, docs, uploadDoc, onView, labelMap }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h4 style={{ marginBottom: 14, fontSize: 15.5, fontWeight: 600 }}>{title}</h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
        {types.map(dt => {
          const existing = docs.find(d => d.document_type.toLowerCase() === dt.toLowerCase());
          const displayName = (labelMap && labelMap[dt]) || dt.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          const isVerified = existing?.is_verified;
          return (
            <div key={dt} style={{
              border: `2px solid ${existing ? (isVerified ? '#16a34a' : '#f59e0b') : '#cbd5e1'}`,
              borderRadius: 12, padding: '14px 14px 12px',
              background: existing ? (isVerified ? '#f0fdf4' : '#fffbeb') : '#f8fafc',
              display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span style={{ fontSize: 26, lineHeight: 1 }}>{existing ? (isVerified ? '✅' : '⏳') : '📎'}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, lineHeight: 1.3 }}>{displayName}</div>
                  {existing
                    ? <div style={{ fontSize: 11, marginTop: 3, fontWeight: 600, color: isVerified ? '#16a34a' : '#d97706' }}>{isVerified ? '✓ Verified' : '⏳ Pending verification'}</div>
                    : <div style={{ fontSize: 11, marginTop: 3, color: '#94a3b8' }}>Not uploaded</div>}
                </div>
              </div>
              {existing && <div style={{ fontSize: 11, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📄 {existing.document_name}</div>}
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 2 }}>
                {existing && (
                  <button className="btn btn-outline btn-sm" style={{ fontSize: 11, padding: '3px 10px' }} onClick={() => onView(existing)}>👁 View</button>
                )}
                <label style={{ cursor: 'pointer' }}>
                  <input type="file" style={{ display: 'none' }} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={e => { if (e.target.files[0]) uploadDoc(dt, e.target.files[0]); }} />
                  <span className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: '3px 10px' }}>{existing ? '🔄 Replace' : '⬆ Upload'}</span>
                </label>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WorkHistoryTab({ employeeId, workHistory, onRefresh }) {
  const BLANK = { company_name: '', designation: '', department: '', from_date: '', to_date: '', is_current: false, reason_for_leaving: '', last_ctc: '' };
  const [showForm, setShowForm] = useState(false);
  const [editingWH, setEditingWH] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);

  const intellativRecords = workHistory.filter(w => w.is_intellativ).sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
  const externalRecords = workHistory.filter(w => !w.is_intellativ).sort((a, b) => {
    if (!a.end_date) return -1; if (!b.end_date) return 1;
    return new Date(b.end_date) - new Date(a.end_date);
  });

  const openAdd = () => { setEditingWH(null); setForm(BLANK); setShowForm(true); };
  const openEdit = (wh) => {
    setEditingWH(wh);
    setForm({ company_name: wh.company_name || '', designation: wh.designation || '', department: wh.department || '', from_date: wh.start_date || '', to_date: wh.end_date || '', is_current: !!(wh.is_current && !wh.is_intellativ), reason_for_leaving: wh.reason_for_leaving || '', last_ctc: wh.salary || '' });
    setShowForm(true);
  };
  const handleSave = async () => {
    if (!form.company_name || !form.from_date) return toast.error('Company name and start date are required');
    setSaving(true);
    try {
      const payload = { ...form };
      if (payload.is_current) payload.to_date = null;
      if (editingWH) { await onboardingAPI.updateWorkHistory(editingWH.id, payload); toast.success('Updated'); }
      else { await onboardingAPI.addWorkHistory(employeeId, payload); toast.success('Added'); }
      setShowForm(false); onRefresh();
    } catch (err) { toast.error(err?.response?.data?.detail || 'Failed'); }
    finally { setSaving(false); }
  };
  const handleDelete = async (whId) => {
    if (!window.confirm('Remove this entry?')) return;
    try { await onboardingAPI.deleteWorkHistory(whId); toast.success('Removed'); onRefresh(); }
    catch (err) { toast.error(err?.response?.data?.detail || 'Failed'); }
  };

  const WHCard = ({ wh, canEdit }) => (
    <div style={{ padding: '14px 16px', background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--border-light)', marginBottom: 10, display: 'flex', gap: 14 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>{wh.company_name}</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>{wh.designation}{wh.department ? ` · ${wh.department}` : ''}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span>📅 {fmtDate(wh.start_date)} → {wh.is_current ? 'Present' : (fmtDate(wh.end_date) || '—')}</span>
          {calcDuration(wh.start_date, wh.end_date) && (
            <span style={{ background: 'var(--bg)', border: '1px solid var(--border-light)', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>
              {calcDuration(wh.start_date, wh.end_date)}
            </span>
          )}
        </div>
        {wh.reason_for_leaving && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Left: {wh.reason_for_leaving}</div>}
        {wh.salary && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Last CTC: ₹{wh.salary}</div>}
      </div>
      {canEdit && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(wh)}>✏️</button>
          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(wh.id)}>🗑</button>
        </div>
      )}
    </div>
  );

  return (
    <div className="card">
      <div className="card-header" style={{ marginBottom: 20 }}>
        <span className="card-title">🏢 Work History</span>
        {!showForm && <button className="btn btn-outline btn-sm" onClick={openAdd}>+ Add Previous Experience</button>}
      </div>
      {showForm && (
        <div style={{ background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--border-light)', padding: 20, marginBottom: 24 }}>
          <SectionLabel>{editingWH ? '✏️ Edit Entry' : '➕ Add Previous Experience'}</SectionLabel>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Company Name *</label><input className="form-control" value={form.company_name} onChange={e => setForm(p => ({ ...p, company_name: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Designation *</label><input className="form-control" value={form.designation} onChange={e => setForm(p => ({ ...p, designation: e.target.value }))} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Department</label><input className="form-control" value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Last CTC (₹)</label><input className="form-control" type="number" value={form.last_ctc} onChange={e => setForm(p => ({ ...p, last_ctc: e.target.value }))} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">From Date *</label><input className="form-control" type="date" value={form.from_date} onChange={e => setForm(p => ({ ...p, from_date: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">To Date</label><input className="form-control" type="date" value={form.to_date} disabled={form.is_current} onChange={e => setForm(p => ({ ...p, to_date: e.target.value }))} /></div>
          </div>
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
              <input type="checkbox" checked={form.is_current} onChange={e => setForm(p => ({ ...p, is_current: e.target.checked, to_date: '' }))} />
              Currently working here
            </label>
          </div>
          <div className="form-group"><label className="form-label">Reason for Leaving</label><input className="form-control" value={form.reason_for_leaving} onChange={e => setForm(p => ({ ...p, reason_for_leaving: e.target.value }))} /></div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
            <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : '💾 Save'}</button>
          </div>
        </div>
      )}
      {intellativRecords.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <SectionLabel>🏢 Current Company — {intellativRecords.length} role{intellativRecords.length > 1 ? 's / promotions' : ''}</SectionLabel>
          {intellativRecords.map(wh => <WHCard key={wh.id} wh={wh} canEdit={false} />)}
        </div>
      )}
      {externalRecords.length > 0 && (
        <div>
          <SectionLabel>📋 Previous Experience</SectionLabel>
          {externalRecords.map(wh => <WHCard key={wh.id} wh={wh} canEdit={true} />)}
        </div>
      )}
      {workHistory.length === 0 && !showForm && (
        <div className="empty-state" style={{ padding: '60px 20px' }}>
          <div style={{ fontSize: 48 }}>📋</div>
          <h3>No work history yet</h3>
          <p>Add your previous work experience using the button above.</p>
        </div>
      )}
    </div>
  );
}

export default function ProfilePage() {
  const { user } = useAuth();
  const { run: btnRun, isLoading: btnLoading } = useButtonLoading();
  const [emp, setEmp] = useState(null);
  const [docs, setDocs] = useState([]);
  const [workHistory, setWorkHistory] = useState([]);
  const [insurance, setInsurance] = useState(null);
  const [tab, setTab] = useState('personal');
  const [loading, setLoading] = useState(true);
  const [viewDoc, setViewDoc] = useState(null);
  const [pwForm, setPwForm] = useState({ old_password: '', new_password: '', confirm: '' });

  const employeeId = user?.id;

  const load = () => {
    if (!employeeId) return;
    setLoading(true);
    Promise.all([
      employeesAPI.get(employeeId),
      employeesAPI.listDocuments(employeeId),
      onboardingAPI.getWorkHistory(employeeId),
      onboardingAPI.getInsurance(employeeId).catch(() => ({ data: null })),
    ]).then(([eRes, dRes, wRes, iRes]) => {
      setEmp(eRes.data);
      setDocs(dRes.data);
      setWorkHistory(Array.isArray(wRes.data) ? wRes.data : []);
      setInsurance(iRes.data || null);
    }).catch(() => toast.error('Failed to load profile'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [employeeId]);

  const uploadDoc = async (type, file) => {
    try {
      const norm = type.toLowerCase().replace(/ /g, '_').replace(/-/g, '_').replace(/\//g, '_');
      await employeesAPI.uploadDocument(employeeId, norm, file);
      toast.success('Document uploaded');
      const res = await employeesAPI.listDocuments(employeeId);
      setDocs(Array.isArray(res.data) ? res.data : []);
    } catch (err) { toast.error(err?.response?.data?.detail || 'Upload failed'); }
  };

  const downloadDoc = (doc) => {
    const token = localStorage.getItem('access_token');
    fetch(`http://localhost:8000/api/v1/employees/${employeeId}/documents/${doc.id}/download`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.blob()).then(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = doc.document_name; a.click();
    });
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pwForm.new_password !== pwForm.confirm) return toast.error('Passwords do not match');
    if (pwForm.new_password.length < 6) return toast.error('Minimum 6 characters');
    if (!pwForm.old_password) return toast.error('Enter current password');
    btnRun('changepw', async () => {
      try {
        await authAPI.changePassword(pwForm.old_password, pwForm.new_password);
        toast.success('Password changed successfully!');
        setPwForm({ old_password: '', new_password: '', confirm: '' });
      } catch (err) { toast.error(err?.response?.data?.detail || 'Failed to change password'); }
    });
  };

  if (loading) return <div className="loading-overlay"><div className="spinner" /></div>;

  const statusColors = { active: 'var(--success)', pending: 'var(--warning)', relieved: 'var(--danger)', inactive: 'var(--text-muted)' };

  const TABS = [
    { key: 'personal',     label: '👤 Personal Info' },
    { key: 'job',          label: '💼 Job Details' },
    { key: 'documents',    label: `📄 Documents (${docs.length})` },
    { key: 'work_history', label: `🏢 Work History (${workHistory.length})` },
    { key: 'insurance',    label: '🏥 Insurance' },
    { key: 'security',     label: '🔐 Security' },
  ];

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 className="page-title">My Profile</h1>
        <p className="page-subtitle">View your personal information and manage your documents</p>
      </div>

      {/* Profile Header */}
      <div className="card" style={{ padding: 0, marginBottom: 20, overflow: 'hidden' }}>
        <div className="profile-header">
          <div className="avatar avatar-xl" style={{ background: `hsl(${user?.first_name?.charCodeAt(0) * 5},60%,55%)`, fontSize: 28, fontWeight: 800 }}>
            {user?.first_name?.[0]}{user?.last_name?.[0]}
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>{user?.first_name} {user?.last_name}</h2>
            <div style={{ opacity: 0.85, fontSize: 14, marginBottom: 6 }}>{user?.email}</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ background: 'rgba(255,255,255,0.15)', padding: '3px 10px', borderRadius: 20, fontSize: 12 }}>🆔 {user?.employee_id || emp?.employee_id}</span>
              {(user?.department || emp?.department?.name) && (
                <span style={{ background: 'rgba(255,255,255,0.15)', padding: '3px 10px', borderRadius: 20, fontSize: 12 }}>🏢 {user?.department || emp?.department?.name}</span>
              )}
              {(user?.role || emp?.role?.name) && (
                <span style={{ background: 'rgba(255,255,255,0.15)', padding: '3px 10px', borderRadius: 20, fontSize: 12 }}>💼 {user?.role || emp?.role?.name}</span>
              )}
              {emp?.status && (
                <span style={{ background: statusColors[emp.status] || 'rgba(255,255,255,0.15)', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                  {emp.status.toUpperCase()}
                </span>
              )}
              {user?.is_superadmin && (
                <span style={{ background: '#f59e0b', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>⭐ Super Admin</span>
              )}
            </div>
          </div>
          {/* No edit button — profile page is read-only for self */}
          <div style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 8, padding: '6px 14px', fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>
            👁 View Only — contact HR to update details
          </div>
        </div>
        <div style={{ padding: '0 24px' }}>
          <div className="tabs" style={{ marginBottom: 0 }}>
            {TABS.map(t => (
              <div key={t.key} className={`tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>{t.label}</div>
            ))}
          </div>
        </div>
      </div>

      {/* TAB: Personal Info */}
      {tab === 'personal' && emp && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div className="card">
            <div className="card-header" style={{ marginBottom: 16 }}><span className="card-title">👤 Personal Information</span></div>
            {[
              ['First Name',     emp.first_name],
              ['Last Name',      emp.last_name],
              ['Company Email',  emp.email],
              ['Personal Email', emp.personal_email],
              ['Phone',          emp.phone],
              ['Gender',         emp.gender ? emp.gender.charAt(0).toUpperCase() + emp.gender.slice(1) : null],
              ['Date of Birth',  emp.date_of_birth],
            ].map(([l, v]) => <InfoRow key={l} label={l} value={v} />)}
          </div>
          <div className="card">
            <div className="card-header" style={{ marginBottom: 16 }}><span className="card-title">🏠 Address & Emergency Contact</span></div>
            {[
              ['Address',         emp.address],
              ['City',            emp.city],
              ['State',           emp.state],
              ['Pincode',         emp.pincode],
              ['Emergency Name',  emp.emergency_contact_name],
              ['Emergency Phone', emp.emergency_contact_phone],
            ].map(([l, v]) => <InfoRow key={l} label={l} value={v} />)}
          </div>
        </div>
      )}

      {/* TAB: Job Details */}
      {tab === 'job' && emp && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div className="card">
            <div className="card-header" style={{ marginBottom: 16 }}><span className="card-title">💼 Employment Details</span></div>
            {[
              ['Employee ID',    emp.employee_id],
              ['Employee Type',  emp.employee_type ? emp.employee_type.charAt(0).toUpperCase() + emp.employee_type.slice(1) : null],
              ['Status',         emp.status?.toUpperCase()],
              ['Department',     emp.department?.name],
              ['Role',           emp.role?.name],
              ['Joining Date',   emp.joining_date],
              ['Relieving Date', emp.relieving_date],
            ].map(([l, v]) => <InfoRow key={l} label={l} value={v} />)}
          </div>
          {emp.employee_type === 'rejoining' && (
            <div className="card">
              <div className="card-header" style={{ marginBottom: 16 }}><span className="card-title">🔄 Rejoining Details</span></div>
              {[
                ['Prev Employee ID',    emp.previous_employee_id],
                ['Prev Joining Date',   emp.previous_joining_date],
                ['Prev Relieving Date', emp.previous_relieving_date],
              ].map(([l, v]) => <InfoRow key={l} label={l} value={v} />)}
            </div>
          )}
        </div>
      )}

      {/* TAB: Documents */}
      {tab === 'documents' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">📄 My Documents</span>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{docs.filter(d => d.is_verified).length} / {docs.length} verified</div>
          </div>
          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>Max 10MB each • PDF, JPG, PNG, DOC accepted</p>
          <div style={{ marginBottom: 40 }}>
            <DocumentSection title="🪪 Identity Documents" types={['aadhar','pan','passport_photo','voter_id','driving_license','passport']} docs={docs} uploadDoc={uploadDoc} onView={setViewDoc} labelMap={{ aadhar:'Aadhar Card', pan:'PAN Card', passport_photo:'Passport Size Photo', voter_id:'Voter ID', driving_license:'Driving License', passport:'Passport' }} />
            <DocumentSection title="🏠 Address Proof (any one)" types={['utility_bill','rental_agreement','bank_statement_address']} docs={docs} uploadDoc={uploadDoc} onView={setViewDoc} labelMap={{ utility_bill:'Utility Bill', rental_agreement:'Rental Agreement', bank_statement_address:'Bank Statement (Address)' }} />
            <DocumentSection title="🎓 Educational Documents" types={['marks_10th','marks_12th','graduation_certificate','postgraduation_certificate','consolidated_marks','degree']} docs={docs} uploadDoc={uploadDoc} onView={setViewDoc} labelMap={{ marks_10th:'10th Marks Sheet', marks_12th:'12th Marks Sheet', graduation_certificate:'Graduation Certificate', postgraduation_certificate:'Post-Graduation Certificate', consolidated_marks:'Consolidated Marks', degree:'Degree Certificate' }} />
            <DocumentSection title="💼 Employment / Experience Documents" types={['relieving_letter','experience_certificate','experience_letter','payslips','form_16','pf_service_history','bank_statement_salary']} docs={docs} uploadDoc={uploadDoc} onView={setViewDoc} labelMap={{ relieving_letter:'Relieving Letter', experience_certificate:'Experience Certificate', experience_letter:'Experience Letter', payslips:'Last 3 Months Payslips', form_16:'Form 16 / ITR', pf_service_history:'PF Service History', bank_statement_salary:'Salary Bank Statement' }} />
            <DocumentSection title="📎 Other Documents" types={['offer_letter','joining_letter','other']} docs={docs} uploadDoc={uploadDoc} onView={setViewDoc} labelMap={{ offer_letter:'Offer Letter', joining_letter:'Joining Letter', other:'Other Document' }} />
          </div>
          {docs.length > 0 ? (
            <div>
              <h3 style={{ margin: '0 0 16px 0', fontSize: 17, fontWeight: 600 }}>All Uploaded Documents ({docs.length})</h3>
              <table className="table">
                <thead><tr><th>Document Name</th><th>Type</th><th>Uploaded</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {docs.sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at)).map(doc => (
                    <tr key={doc.id}>
                      <td style={{ fontWeight: 500 }}>{doc.document_name}</td>
                      <td><span className="badge" style={{ background: '#dbeafe', color: '#1e40af', padding: '4px 12px', borderRadius: 9999, fontSize: 12.5 }}>{doc.document_type.replace(/_/g, ' ').toUpperCase()}</span></td>
                      <td style={{ color: '#64748b', fontSize: 13.5 }}>{new Date(doc.uploaded_at).toLocaleDateString('en-IN')}</td>
                      <td>{doc.is_verified ? <span className="badge badge-success">✅ Verified</span> : <span className="badge badge-warning">⏳ Pending</span>}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="btn btn-outline btn-sm" onClick={() => setViewDoc(doc)}>👁 View</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => downloadDoc(doc)}>⬇ Download</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '80px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 64 }}>📂</div>
              <h3>No documents uploaded yet</h3>
              <p>Upload your documents using the sections above.</p>
            </div>
          )}
        </div>
      )}

      {/* TAB: Work History */}
      {tab === 'work_history' && (
        <WorkHistoryTab
          employeeId={employeeId}
          workHistory={workHistory}
          onRefresh={() => onboardingAPI.getWorkHistory(employeeId).then(r => setWorkHistory(Array.isArray(r.data) ? r.data : []))}
        />
      )}

      {/* TAB: Insurance */}
      {tab === 'insurance' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div className="card">
            <div className="card-header" style={{ marginBottom: 16 }}><span className="card-title">🏥 Insurance Details</span></div>
            {insurance?.submitted && (
              <div style={{ padding: '8px 14px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, marginBottom: 16, fontSize: 13, color: '#15803d', fontWeight: 600 }}>
                ✅ Insurance submitted to insurance team
              </div>
            )}
            {!insurance && (
              <div style={{ padding: '8px 14px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, marginBottom: 16, fontSize: 13, color: '#c2410c' }}>
                ⚠ Insurance info not yet filled. Contact HR to update your details.
              </div>
            )}
            {[
              ['Smoking Status',          insurance?.smoking_status],
              ['Blood Group',             insurance?.blood_group],
              ['Pre-existing Conditions', insurance?.pre_existing_conditions],
            ].map(([l, v]) => <InfoRow key={l} label={l} value={v} />)}
          </div>
          <div className="card">
            <div className="card-header" style={{ marginBottom: 16 }}><span className="card-title">👤 Nominee Details</span></div>
            {[
              ['Nominee Name',  insurance?.nominee_name],
              ['Relation',      insurance?.nominee_relation],
              ['Nominee DOB',   insurance?.nominee_dob],
              ['Nominee Phone', insurance?.nominee_phone],
            ].map(([l, v]) => <InfoRow key={l} label={l} value={v} />)}
          </div>
          <div className="card">
            <div className="card-header" style={{ marginBottom: 16 }}><span className="card-title">💑 Spouse Details</span></div>
            {[
              ['Spouse Name',   insurance?.spouse_name],
              ['Spouse DOB',    insurance?.spouse_dob],
              ['Spouse Gender', insurance?.spouse_gender],
            ].map(([l, v]) => <InfoRow key={l} label={l} value={v} />)}
          </div>
          <div className="card">
            <div className="card-header" style={{ marginBottom: 16 }}><span className="card-title">👶 Children</span></div>
            {insurance?.children?.length > 0 ? insurance.children.map((c, i) => (
              <div key={i} style={{ padding: '10px 14px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border-light)', marginBottom: 10 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{c.name || `Child ${i + 1}`}</div>
                {c.dob && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>DOB: {c.dob}</div>}
                {c.gender && <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'capitalize' }}>Gender: {c.gender}</div>}
              </div>
            )) : <div style={{ fontSize: 14, color: 'var(--text-muted)', fontStyle: 'italic' }}>No children added</div>}
          </div>
        </div>
      )}

      {/* TAB: Security */}
      {tab === 'security' && (
        <div className="card" style={{ maxWidth: 480 }}>
          <div className="card-title" style={{ marginBottom: 24 }}>🔐 Change Password</div>
          <form onSubmit={handleChangePassword}>
            <div className="form-group">
              <label className="form-label required">Current Password</label>
              <input type="password" className="form-control" value={pwForm.old_password} onChange={e => setPwForm(f => ({ ...f, old_password: e.target.value }))} placeholder="Enter current password" required />
            </div>
            <div className="form-group">
              <label className="form-label required">New Password</label>
              <input type="password" className="form-control" value={pwForm.new_password} onChange={e => setPwForm(f => ({ ...f, new_password: e.target.value }))} placeholder="Min 6 characters" required />
            </div>
            <div className="form-group">
              <label className="form-label required">Confirm New Password</label>
              <input type="password" className="form-control" value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} placeholder="Re-enter new password" required />
            </div>
            {pwForm.new_password && pwForm.confirm && pwForm.new_password !== pwForm.confirm && (
              <p className="form-error">Passwords do not match</p>
            )}
            <LoadingButton type="submit" className="btn btn-primary" loading={btnLoading('changepw')} loadingText="Changing password…">
              🔐 Change Password
            </LoadingButton>
          </form>
        </div>
      )}

      {/* Doc viewer modal */}
      {viewDoc && (
        <div className="modal-overlay" onClick={() => setViewDoc(null)}>
          <div className="modal" style={{ maxWidth: 800, width: '90vw' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">📄 {viewDoc.document_name}</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => downloadDoc(viewDoc)}>⬇ Download</button>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setViewDoc(null)}>✕</button>
              </div>
            </div>
            <div className="modal-body">
              <DocViewer doc={viewDoc} employeeId={employeeId} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}