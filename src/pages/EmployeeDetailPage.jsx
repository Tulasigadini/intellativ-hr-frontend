import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { employeesAPI, departmentsAPI, rolesAPI, authAPI, iamAPI, onboardingAPI } from '../services/api';
import { useAsync, useButtonLoading } from '../hooks/useAsync';
import LoadingButton from '../components/ui/LoadingButton';
import { VALIDATORS, validateForm, useFormErrors } from '../hooks/useValidation';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'react-toastify';

const DOC_TYPES = [
  // Identity Documents
  'aadhar',
  'pan',
  'passport_photo',          // Passport Size Photo
  'voter_id',
  'driving_license',
  'passport',

  // Address Proof
  'utility_bill',
  'rental_agreement',
  'bank_statement_address',

  // Educational Documents
  'marks_10th',
  'marks_12th',
  'graduation_certificate',
  'postgraduation_certificate',
  'consolidated_marks',

  // Employment / Experience
  'relieving_letter',
  'experience_certificate',
  'payslips',                    // Last 3 Months Payslips
  'form_16',
  'pf_service_history',
  'bank_statement_salary',       // Last 6 Months Salary Bank Stmt

  // Additional common ones
  'degree',
  'experience_letter',
  'offer_letter',
  'joining_letter',
  'other'
];

const BLANK_WH = { company_name: '', designation: '', department: '', from_date: '', to_date: '', is_current: false, reason_for_leaving: '', last_ctc: '' };

function WorkHistoryTab({ employeeId, workHistory, canManage, currentUserId, onRefresh }) {
  const [showForm, setShowForm] = useState(false);
  const [editingWH, setEditingWH] = useState(null); // wh object being edited
  const [form, setForm] = useState(BLANK_WH);
  const [saving, setSaving] = useState(false);

  const isSelf = String(currentUserId) === String(employeeId);
  const isPrivileged = canManage; // HR/superadmin

  // Group: intellativ (current company) vs external (past companies)
  const intellativRecords = workHistory.filter(w => w.is_intellativ).sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
  const externalRecords = workHistory.filter(w => !w.is_intellativ).sort((a, b) => {
    if (!a.end_date) return -1;
    if (!b.end_date) return 1;
    return new Date(b.end_date) - new Date(a.end_date);
  });

  const canEdit = (wh) => {
    if (isPrivileged) return true;
    if (isSelf && !wh.is_intellativ) return true;
    return false;
  };

  const openAdd = () => { setEditingWH(null); setForm(BLANK_WH); setShowForm(true); };
  const openEdit = (wh) => {
    setEditingWH(wh);
    setForm({
      company_name: wh.company_name || '',
      designation: wh.designation || '',
      department: wh.department || '',
      from_date: wh.start_date || '',
      to_date: wh.end_date || '',
      is_current: wh.is_current && !wh.is_intellativ,
      reason_for_leaving: wh.reason_for_leaving || '',
      last_ctc: wh.salary || '',
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.company_name || !form.from_date) return toast.error('Company name and start date are required');
    setSaving(true);
    try {
      const payload = { ...form };
      if (payload.is_current) payload.to_date = null;
      if (editingWH) {
        await onboardingAPI.updateWorkHistory(editingWH.id, payload);
        toast.success('Work history updated');
      } else {
        await onboardingAPI.addWorkHistory(employeeId, payload);
        toast.success('Work history added');
      }
      setShowForm(false);
      onRefresh();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to save');
    }
    setSaving(false);
  };

  const handleDelete = async (wh) => {
    if (!window.confirm(`Delete "${wh.designation || wh.company_name}"?`)) return;
    try {
      await onboardingAPI.deleteWorkHistory(wh.id);
      toast.success('Deleted');
      onRefresh();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to delete');
    }
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : null;

  const calcDuration = (start, end) => {
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
  };

  const renderEntry = (wh, i, isLast) => (
    <div key={wh.id || i} style={{
      display: 'flex', gap: 16, padding: '14px 0',
      borderBottom: isLast ? 'none' : '1px solid var(--border-light)',
      position: 'relative',
    }}>
      {/* Timeline dot */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 4 }}>
        <div style={{
          width: 12, height: 12, borderRadius: '50%', flexShrink: 0,
          background: wh.is_current ? 'var(--primary)' : 'var(--border)',
          border: wh.is_current ? '2px solid var(--primary-light, #93c5fd)' : '2px solid var(--border)',
        }} />
        {!isLast && <div style={{ width: 2, flex: 1, background: 'var(--border-light)', marginTop: 4 }} />}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{wh.designation || '—'}</div>
            <div style={{ fontSize: 14, color: 'var(--primary)', fontWeight: 600, marginTop: 2 }}>{wh.company_name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <span>📅 {fmtDate(wh.start_date)} → {wh.is_current ? 'Present' : (fmtDate(wh.end_date) || '—')}
                {calcDuration(wh.start_date, wh.end_date) && (
                  <span style={{ marginLeft: 6, background: 'var(--bg)', border: '1px solid var(--border-light)', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {calcDuration(wh.start_date, wh.end_date)}
                  </span>
                )}
              </span>
              {wh.department && <span>🏢 {wh.department}</span>}
              {wh.salary && <span>💰 {wh.salary}</span>}
            </div>
            {wh.reason_for_leaving && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                Reason for leaving: {wh.reason_for_leaving}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
            {wh.is_current && <span className="badge badge-active" style={{ fontSize: 11 }}>Current</span>}
            {wh.is_intellativ && <span style={{ fontSize: 10, background: 'var(--primary-subtle, #eff6ff)', color: 'var(--primary)', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>🏢 Intellativ</span>}
            {canEdit(wh) && (
              <>
                <button className="btn btn-ghost btn-sm btn-icon" title="Edit" onClick={() => openEdit(wh)} style={{ fontSize: 13 }}>✏️</button>
                <button className="btn btn-ghost btn-sm btn-icon" title="Delete" onClick={() => handleDelete(wh)} style={{ fontSize: 13, color: 'var(--danger)' }}>🗑️</button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      {/* Current Company (Intellativ) Section */}
      {intellativRecords.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header" style={{ background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', borderBottom: '2px solid #3b82f6' }}>
            <span className="card-title" style={{ color: '#1d4ed8' }}>🏢 Intellativ — Current Company</span>
            <span style={{ fontSize: 12, color: '#3b82f6', background: '#dbeafe', padding: '2px 10px', borderRadius: 20, fontWeight: 600 }}>
              {intellativRecords.length} role{intellativRecords.length > 1 ? 's / promotions' : ''}
            </span>
          </div>
          <div style={{ padding: '0 20px' }}>
            {intellativRecords.map((wh, i) => renderEntry(wh, i, i === intellativRecords.length - 1))}
          </div>
          {isPrivileged && (
            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-light)' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => {
                setEditingWH(null);
                setForm({ ...BLANK_WH });
                setShowForm('intellativ');
              }}>+ Add Internal Role / Promotion</button>
            </div>
          )}
        </div>
      )}

      {/* Past Experience Section */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">💼 Past Work Experience</span>
          {(isPrivileged || isSelf) && (
            <button className="btn btn-primary btn-sm" onClick={openAdd}>+ Add Experience</button>
          )}
        </div>
        {externalRecords.length === 0 ? (
          <div className="empty-state" style={{ padding: '32px 0' }}>
            <div className="empty-state-icon">💼</div>
            <h3>No past work experience recorded</h3>
            <p>{isSelf ? 'Add your previous work experience below.' : 'Work history can be added during onboarding or updated here.'}</p>
            {(isPrivileged || isSelf) && (
              <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={openAdd}>+ Add Experience</button>
            )}
          </div>
        ) : (
          <div style={{ padding: '0 20px' }}>
            {externalRecords.map((wh, i) => renderEntry(wh, i, i === externalRecords.length - 1))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">
                {editingWH ? '✏️ Edit Work History' : showForm === 'intellativ' ? '🏢 Add Internal Role / Promotion' : '+ Add Work Experience'}
              </span>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div className="modal-body">
              {showForm === 'intellativ' && (
                <div style={{ padding: '8px 12px', background: '#eff6ff', borderRadius: 8, marginBottom: 16, fontSize: 13, color: '#1d4ed8' }}>
                  ℹ️ Adding an internal Intellativ role — e.g. a promotion or department change.
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label required">Company / Organisation</label>
                  <input className="form-control" value={form.company_name}
                    onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))}
                    placeholder={showForm === 'intellativ' ? 'Intellativ' : 'e.g. Infosys'}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Designation / Role</label>
                  <input className="form-control" value={form.designation}
                    onChange={e => setForm(f => ({ ...f, designation: e.target.value }))}
                    placeholder="e.g. Senior Engineer" />
                </div>
                <div className="form-group">
                  <label className="form-label">Department</label>
                  <input className="form-control" value={form.department}
                    onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                    placeholder="e.g. Technology" />
                </div>
                <div className="form-group">
                  <label className="form-label required">Start Date</label>
                  <input type="date" className="form-control" value={form.from_date}
                    onChange={e => setForm(f => ({ ...f, from_date: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">End Date</label>
                  <input type="date" className="form-control" value={form.to_date}
                    disabled={form.is_current}
                    onChange={e => setForm(f => ({ ...f, to_date: e.target.value }))} />
                </div>
                {showForm !== 'intellativ' && (
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                      <input type="checkbox" checked={form.is_current}
                        onChange={e => setForm(f => ({ ...f, is_current: e.target.checked, to_date: e.target.checked ? '' : f.to_date }))} />
                      Currently working here
                    </label>
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Last CTC / Salary</label>
                  <input className="form-control" value={form.last_ctc}
                    onChange={e => setForm(f => ({ ...f, last_ctc: e.target.value }))}
                    placeholder="e.g. 8 LPA" />
                </div>
                <div className="form-group">
                  <label className="form-label">Reason for Leaving</label>
                  <input className="form-control" value={form.reason_for_leaving}
                    onChange={e => setForm(f => ({ ...f, reason_for_leaving: e.target.value }))}
                    placeholder="e.g. Better opportunity" />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
              <LoadingButton className="btn btn-primary" loading={saving} loadingText="Saving…" onClick={handleSave}>
                {editingWH ? '💾 Update' : '✅ Add'}
              </LoadingButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EmployeeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can, user } = useAuth();
  const canManage = can('can_manage_employees');
  const currentUserId = user?.employee_id || user?.id;

  // Access guard: only self, HR/Operations, or superadmin can view another employee's detail page
  const isSelf = currentUserId && id && String(currentUserId) === String(id);
  const canViewDetail = isSelf || can('can_view_employee_detail') || can('is_superadmin');

  // Redirect unauthorized users back to dashboard immediately
  if (user && !canViewDetail) {
    navigate('/dashboard', { replace: true });
    return null;
  }

  const [emp, setEmp] = useState(null);
  const [docs, setDocs] = useState([]);
  const [workHistory, setWorkHistory] = useState([]);
  const [insurance, setInsurance] = useState(null);
  const [tab, setTab] = useState('personal');
  const { run: runAction, loading: actionLoading } = useAsync();
  const { run: btnRun, isLoading: btnLoading } = useButtonLoading();
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [editingInsurance, setEditingInsurance] = useState(false);
  const [insuranceForm, setInsuranceForm] = useState({});
  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);
  const [relievingDate, setRelievingDate] = useState('');
  const [showRelieve, setShowRelieve] = useState(false);
  const [showAdminPw, setShowAdminPw] = useState(false);
  const [adminNewPw, setAdminNewPw] = useState('');
  const [viewDoc, setViewDoc] = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      employeesAPI.get(id),
      employeesAPI.listDocuments(id),
      onboardingAPI.getWorkHistory(id),
      onboardingAPI.getInsurance(id).catch(() => ({ data: null })),
    ])
      .then(([eRes, dRes, wRes, iRes]) => {
        setEmp(eRes.data);
        setDocs(dRes.data);
        setWorkHistory(Array.isArray(wRes.data) ? wRes.data : []);
        setInsurance(iRes.data || null);
      })
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);
  useEffect(() => { departmentsAPI.list().then(r => setDepartments(r.data)); }, []);
  useEffect(() => {
    if (editForm.department_id)
      rolesAPI.list(editForm.department_id).then(r => setRoles(r.data));
  }, [editForm.department_id]);

  const startEdit = () => {
    setEditForm({
      first_name: emp.first_name || '', last_name: emp.last_name || '',
      personal_email: emp.personal_email || '',
      phone: emp.phone || '', gender: emp.gender || '',
      date_of_birth: emp.date_of_birth || '',
      address: emp.address || '', city: emp.city || '',
      state: emp.state || '', pincode: emp.pincode || '',
      emergency_contact_name: emp.emergency_contact_name || '',
      emergency_contact_phone: emp.emergency_contact_phone || '',
      department_id: emp.department_id || '', role_id: emp.role_id || '',
      joining_date: emp.joining_date || '',
      relieving_date: emp.relieving_date || '',
      employee_type: emp.employee_type || 'new',
      reporting_manager_id: emp.reporting_manager_id || '',
    });
    setEditing(true);
  };

  const saveEdit = () => btnRun('save', async () => {
    try {
      const payload = { ...editForm };
      Object.keys(payload).forEach(k => { if (payload[k] === '') payload[k] = null; });
      await employeesAPI.update(id, payload);
      toast.success('Updated successfully');
      setEditing(false); load();
    } catch { toast.error('Update failed'); }
  });

  const startEditInsurance = () => {
    setInsuranceForm({
      smoking_status: insurance?.smoking_status || '',
      nominee_name: insurance?.nominee_name || '',
      nominee_relation: insurance?.nominee_relation || '',
      nominee_dob: insurance?.nominee_dob || '',
      nominee_phone: insurance?.nominee_phone || '',
      blood_group: insurance?.blood_group || '',
      pre_existing_conditions: insurance?.pre_existing_conditions || '',
      spouse_name: insurance?.spouse_name || '',
      spouse_dob: insurance?.spouse_dob || '',
      spouse_gender: insurance?.spouse_gender || '',
      children: insurance?.children || [],
    });
    setEditingInsurance(true);
  };

  const saveInsurance = () => btnRun('insurance', async () => {
    try {
      const payload = { ...insuranceForm };
      Object.keys(payload).forEach(k => { if (payload[k] === '') payload[k] = null; });
      await onboardingAPI.saveInsurance(id, payload);
      toast.success('Insurance details saved!');
      setEditingInsurance(false); load();
    } catch { toast.error('Failed to save insurance'); }
  });

  const handleActivate = () => btnRun('activate', async () => {
    try { await employeesAPI.activate(id); toast.success('Employee activated!'); load(); }
    catch { toast.error('Activation failed'); }
  });

  const handleRelieve = () => btnRun('relieve', async () => {
    if (!relievingDate) return toast.error('Select relieving date');
    try {
      await employeesAPI.relieve(id, relievingDate);
      toast.success('Employee relieved');
      setShowRelieve(false); load();
    } catch { toast.error('Failed to relieve'); }
  });

  const uploadDoc = async (type, file) => {
  try {
    // Extra normalization on frontend too
    const normalizedType = type
      .toLowerCase()
      .replace(/ /g, '_')
      .replace(/-/g, '_')
      .replace(/\//g, '_');

    await employeesAPI.uploadDocument(id, normalizedType, file);
    
    toast.success('Document uploaded successfully');
    
    // Refresh documents
    const res = await employeesAPI.listDocuments(id);
    setDocs(Array.isArray(res.data) ? res.data : []);
  } catch (err) {
    console.error("Upload error:", err);
    toast.error(err?.response?.data?.detail || 'Failed to upload document');
  }
};


  const downloadDoc = (doc) => {
    const token = localStorage.getItem('access_token');
    fetch(`https://intellative-hr-backend.onrender.com/api/v1/employees/${id}/documents/${doc.id}/download`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(r => r.blob()).then(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = doc.document_name; a.click();
    });
  };

  const verifyDoc = async (docId, verified) => {
    try {
      await iamAPI.verifyDocument(docId, verified);
      toast.success(verified ? 'Document verified!' : 'Verification removed');
      employeesAPI.listDocuments(id).then(r => setDocs(r.data));
    } catch { toast.error('Failed to update verification'); }
  };

  const handleAdminChangePassword = () => btnRun('resetpw', async () => {
    if (!adminNewPw || adminNewPw.length < 6) return toast.error('Min 6 characters');
    try {
      await authAPI.adminChangePassword(id, adminNewPw);
      toast.success('Password changed successfully');
      setShowAdminPw(false); setAdminNewPw('');
    } catch { toast.error('Failed to change password'); }
  });

  if (loading) return <div className="loading-overlay"><div className="spinner" /></div>;
  if (!emp) return <div className="empty-state"><h3>Employee not found</h3></div>;

  const statusColors = {
    active: 'var(--success)', pending: 'var(--warning)',
    relieved: 'var(--danger)', inactive: 'var(--text-muted)',
  };

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/employees')}>← Back to Employees</button>
      </div>

      {/* Profile Header */}
      <div className="card" style={{ padding: 0, marginBottom: 20, overflow: 'hidden' }}>
        <div className="profile-header">
          <div className="avatar avatar-xl" style={{ background: `hsl(${emp.first_name.charCodeAt(0)*5},60%,55%)`, fontSize: 28, fontWeight: 800 }}>
            {emp.first_name[0]}{emp.last_name[0]}
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>{emp.first_name} {emp.last_name}</h2>
            <div style={{ opacity: 0.85, fontSize: 14, marginBottom: 6 }}>{emp.email}</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ background: 'rgba(255,255,255,0.15)', padding: '3px 10px', borderRadius: 20, fontSize: 12 }}>🆔 {emp.employee_id}</span>
              {emp.department && <span style={{ background: 'rgba(255,255,255,0.15)', padding: '3px 10px', borderRadius: 20, fontSize: 12 }}>🏢 {emp.department.name}</span>}
              {emp.role && <span style={{ background: 'rgba(255,255,255,0.15)', padding: '3px 10px', borderRadius: 20, fontSize: 12 }}>💼 {emp.role.name}</span>}
              <span style={{ background: statusColors[emp.status] || 'rgba(255,255,255,0.15)', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                {emp.status.toUpperCase()}
              </span>
            </div>
          </div>
          {canManage && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {emp.status === 'pending' && (
                <button className="btn btn-accent btn-sm" onClick={handleActivate}>🚀 Activate</button>
              )}
              {emp.status === 'active' && (
                <button className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }}
                  onClick={() => setShowRelieve(true)}>🚪 Relieve</button>
              )}
              <button className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }}
                onClick={startEdit}>✏️ Edit</button>
              <button className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }}
                onClick={() => setShowAdminPw(true)}>🔑 Reset Password</button>
            </div>
          )}
        </div>
        <div style={{ padding: '0 24px' }}>
          <div className="tabs" style={{ marginBottom: 0 }}>
            {[
              { key:'personal',     label:`👤 Personal Info` },
              { key:'job',          label:`💼 Job Details` },
              { key:'documents',    label:`📄 Documents (${docs.length})` },
              { key:'work_history', label:`🏢 Work History (${workHistory.length})` },
              { key:'insurance',    label:`🏥 Insurance` },
            ].map(t => (
              <div key={t.key} className={`tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
                {t.label}
              </div>
            ))}
          </div>
        </div>
      </div>


      {/* ── TAB: Personal Info ── */}
      {tab === 'personal' && !editing && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
          <div className="card">
            <div className="card-header" style={{ marginBottom:16 }}>
              <span className="card-title">👤 Personal Information</span>
              {canManage && <button className="btn btn-outline btn-sm" onClick={startEdit}>✏️ Edit</button>}
            </div>
            {[
              ['First Name',     emp.first_name],
              ['Last Name',      emp.last_name],
              ['Company Email',  emp.email],
              ['Personal Email', emp.personal_email],
              ['Phone',          emp.phone],
              ['Gender',         emp.gender ? emp.gender.charAt(0).toUpperCase()+emp.gender.slice(1) : null],
              ['Date of Birth',  emp.date_of_birth],
            ].map(([l,v]) => <InfoRow key={l} label={l} value={v} />)}
          </div>
          <div className="card">
            <div className="card-header" style={{ marginBottom:16 }}>
              <span className="card-title">🏠 Address & Emergency Contact</span>
            </div>
            {[
              ['Address',         emp.address],
              ['City',            emp.city],
              ['State',           emp.state],
              ['Pincode',         emp.pincode],
              ['Emergency Name',  emp.emergency_contact_name],
              ['Emergency Phone', emp.emergency_contact_phone],
            ].map(([l,v]) => <InfoRow key={l} label={l} value={v} />)}
          </div>
        </div>
      )}

      {tab === 'personal' && editing && (
        <div className="card">
          <div className="card-header" style={{ marginBottom:24 }}>
            <span className="card-title">✏️ Edit Personal Info</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>✕ Cancel</button>
          </div>
          <SectionLabel>👤 Personal Information</SectionLabel>
          <div className="form-row">
            <div className="form-group"><label className="form-label">First Name</label>
              <input className="form-control" value={editForm.first_name} onChange={e => setEditForm(p=>({...p,first_name:e.target.value}))} /></div>
            <div className="form-group"><label className="form-label">Last Name</label>
              <input className="form-control" value={editForm.last_name} onChange={e => setEditForm(p=>({...p,last_name:e.target.value}))} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Personal Email</label>
              <input className="form-control" type="email" value={editForm.personal_email} onChange={e => setEditForm(p=>({...p,personal_email:e.target.value}))} /></div>
            <div className="form-group"><label className="form-label">Phone</label>
              <input className="form-control" value={editForm.phone} onChange={e => setEditForm(p=>({...p,phone:e.target.value}))} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Gender</label>
              <select className="form-control" value={editForm.gender} onChange={e => setEditForm(p=>({...p,gender:e.target.value}))}>
                <option value="">Select</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
              </select></div>
            <div className="form-group"><label className="form-label">Date of Birth</label>
              <input className="form-control" type="date" value={editForm.date_of_birth} onChange={e => setEditForm(p=>({...p,date_of_birth:e.target.value}))} /></div>
          </div>
          <SectionLabel>🏠 Address</SectionLabel>
          <div className="form-group"><label className="form-label">Address</label>
            <textarea className="form-control" rows={2} value={editForm.address} onChange={e => setEditForm(p=>({...p,address:e.target.value}))} /></div>
          <div className="form-row-3">
            {['city','state','pincode'].map(f => (
              <div className="form-group" key={f}><label className="form-label">{f.charAt(0).toUpperCase()+f.slice(1)}</label>
                <input className="form-control" value={editForm[f]} onChange={e => setEditForm(p=>({...p,[f]:e.target.value}))} /></div>
            ))}
          </div>
          <SectionLabel>🚨 Emergency Contact</SectionLabel>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Contact Name</label>
              <input className="form-control" value={editForm.emergency_contact_name} onChange={e => setEditForm(p=>({...p,emergency_contact_name:e.target.value}))} /></div>
            <div className="form-group"><label className="form-label">Contact Phone</label>
              <input className="form-control" value={editForm.emergency_contact_phone} onChange={e => setEditForm(p=>({...p,emergency_contact_phone:e.target.value}))} /></div>
          </div>
          <FormActions onCancel={() => setEditing(false)} onSave={saveEdit} loading={btnLoading('save')} />
        </div>
      )}

      {/* ── TAB: Job Details ── */}
      {tab === 'job' && !editing && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
          <div className="card">
            <div className="card-header" style={{ marginBottom:16 }}>
              <span className="card-title">💼 Job Details</span>
              {canManage && <button className="btn btn-outline btn-sm" onClick={startEdit}>✏️ Edit</button>}
            </div>
            {[
              ['Employee ID',    emp.employee_id],
              ['Employee Type',  emp.employee_type ? emp.employee_type.charAt(0).toUpperCase()+emp.employee_type.slice(1) : null],
              ['Status',         emp.status?.toUpperCase()],
              ['Department',     emp.department?.name],
              ['Role',           emp.role?.name],
              ['Joining Date',   emp.joining_date],
              ['Relieving Date', emp.relieving_date],
            ].map(([l,v]) => <InfoRow key={l} label={l} value={v} />)}
          </div>
          {emp.employee_type === 'rejoining' && (
            <div className="card">
              <div className="card-header" style={{ marginBottom:16 }}>
                <span className="card-title">🔄 Rejoining Details</span>
              </div>
              {[
                ['Prev Employee ID',    emp.previous_employee_id],
                ['Prev Joining Date',   emp.previous_joining_date],
                ['Prev Relieving Date', emp.previous_relieving_date],
              ].map(([l,v]) => <InfoRow key={l} label={l} value={v} />)}
            </div>
          )}
        </div>
      )}

      {tab === 'job' && editing && (
        <div className="card">
          <div className="card-header" style={{ marginBottom:24 }}>
            <span className="card-title">✏️ Edit Job Details</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>✕ Cancel</button>
          </div>
          <SectionLabel>💼 Employment</SectionLabel>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Employee Type</label>
              <select className="form-control" value={editForm.employee_type} onChange={e => setEditForm(p=>({...p,employee_type:e.target.value}))}>
                <option value="new">New</option><option value="rejoining">Rejoining</option>
              </select></div>
            <div className="form-group"><label className="form-label">Joining Date</label>
              <input className="form-control" type="date" value={editForm.joining_date} onChange={e => setEditForm(p=>({...p,joining_date:e.target.value}))} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Department</label>
              <select className="form-control" value={editForm.department_id} onChange={e => setEditForm(p=>({...p,department_id:e.target.value,role_id:''}))}>
                <option value="">Select Department</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select></div>
            <div className="form-group"><label className="form-label">Role</label>
              <select className="form-control" value={editForm.role_id} onChange={e => setEditForm(p=>({...p,role_id:e.target.value}))} disabled={!editForm.department_id}>
                <option value="">{editForm.department_id ? 'Select Role' : 'Select department first'}</option>
                {roles.map(r => <option key={r.id} value={r.id}>{r.name} (L{r.level})</option>)}
              </select></div>
          </div>
          {emp.status === 'relieved' && (
            <div className="form-row">
              <div className="form-group"><label className="form-label">Relieving Date</label>
                <input className="form-control" type="date" value={editForm.relieving_date} onChange={e => setEditForm(p=>({...p,relieving_date:e.target.value}))} /></div>
              <div className="form-group" />
            </div>
          )}
          <FormActions onCancel={() => setEditing(false)} onSave={saveEdit} loading={btnLoading('save')} />
        </div>
      )}

      {/* ── TAB: Documents ── */}
      {tab === 'documents' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">📄 Documents</span>
            <div style={{ fontSize:13, color:'var(--text-muted)' }}>
              {docs.filter(d => d.is_verified).length} / {docs.length} verified
            </div>
          </div>
          <p style={{ fontSize:13, color:'#64748b', marginBottom:20 }}>Max 10MB each • PDF, JPG, PNG, DOC accepted</p>
          <div style={{ marginBottom:40 }}>
            <DocumentSection title="🪪 Identity Documents"
              types={['aadhar','pan','passport_photo','voter_id','driving_license','passport']}
              docs={docs} uploadDoc={uploadDoc} verifyDoc={verifyDoc} viewDoc={setViewDoc} canManage={canManage}
              labelMap={{ aadhar:'Aadhar Card', pan:'PAN Card', passport_photo:'Passport Size Photo', voter_id:'Voter ID', driving_license:'Driving License', passport:'Passport' }} />
            <DocumentSection title="🏠 Address Proof (any one)"
              types={['utility_bill','rental_agreement','bank_statement_address']}
              docs={docs} uploadDoc={uploadDoc} verifyDoc={verifyDoc} viewDoc={setViewDoc} canManage={canManage}
              labelMap={{ utility_bill:'Utility Bill', rental_agreement:'Rental Agreement', bank_statement_address:'Bank Statement (Address)' }} />
            <DocumentSection title="🎓 Educational Documents"
              types={['marks_10th','marks_12th','graduation_certificate','postgraduation_certificate','consolidated_marks','degree']}
              docs={docs} uploadDoc={uploadDoc} verifyDoc={verifyDoc} viewDoc={setViewDoc} canManage={canManage}
              labelMap={{ marks_10th:'10th Marks Sheet', marks_12th:'12th Marks Sheet', graduation_certificate:'Graduation Certificate', postgraduation_certificate:'Post-Graduation Certificate', consolidated_marks:'Consolidated Marks', degree:'Degree Certificate' }} />
            <DocumentSection title="💼 Employment / Experience Documents"
              types={['relieving_letter','experience_certificate','experience_letter','payslips','form_16','pf_service_history','bank_statement_salary']}
              docs={docs} uploadDoc={uploadDoc} verifyDoc={verifyDoc} viewDoc={setViewDoc} canManage={canManage}
              labelMap={{ relieving_letter:'Relieving Letter', experience_certificate:'Experience Certificate', experience_letter:'Experience Letter', payslips:'Last 3 Months Payslips', form_16:'Form 16 / ITR', pf_service_history:'PF Service History', bank_statement_salary:'Salary Bank Statement' }} />
            <DocumentSection title="📎 Other Documents"
              types={['offer_letter','joining_letter','other']}
              docs={docs} uploadDoc={uploadDoc} verifyDoc={verifyDoc} viewDoc={setViewDoc} canManage={canManage}
              labelMap={{ offer_letter:'Offer Letter', joining_letter:'Joining Letter', other:'Other Document' }} />
          </div>
          {docs.length > 0 ? (
            <div>
              <h3 style={{ margin:'0 0 16px 0', fontSize:17, fontWeight:600 }}>All Uploaded Documents ({docs.length})</h3>
              <table className="table">
                <thead><tr><th>Document Name</th><th>Type</th><th>Uploaded</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {docs.sort((a,b) => new Date(b.uploaded_at)-new Date(a.uploaded_at)).map(doc => (
                    <tr key={doc.id}>
                      <td style={{ fontWeight:500 }}>{doc.document_name}</td>
                      <td><span className="badge" style={{ background:'#dbeafe', color:'#1e40af', padding:'4px 12px', borderRadius:9999, fontSize:12.5 }}>{doc.document_type.replace(/_/g,' ').toUpperCase()}</span></td>
                      <td style={{ color:'#64748b', fontSize:13.5 }}>{new Date(doc.uploaded_at).toLocaleDateString('en-IN')}</td>
                      <td>{doc.is_verified ? <span className="badge badge-success">✅ Verified</span> : <span className="badge badge-warning">⏳ Pending</span>}</td>
                      <td>
                        <div style={{ display:'flex', gap:8 }}>
                          <button className="btn btn-outline btn-sm" onClick={() => setViewDoc(doc)}>👁 View</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => downloadDoc(doc)}>⬇ Download</button>
                          {canManage && (doc.is_verified
                            ? <button className="btn btn-ghost btn-sm" style={{color:'#f59e0b'}} onClick={() => verifyDoc(doc.id,false)}>Unverify</button>
                            : <button className="btn btn-success btn-sm" onClick={() => verifyDoc(doc.id,true)}>✓ Verify</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state" style={{ padding:'80px 20px', textAlign:'center' }}>
              <div style={{ fontSize:64 }}>📂</div>
              <h3>No documents found</h3>
              <p>Upload documents using the sections above.</p>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: Work History ── */}
      {tab === 'work_history' && (
        <WorkHistoryTab
          employeeId={id}
          workHistory={workHistory}
          canManage={canManage}
          currentUserId={currentUserId}
          onRefresh={() => onboardingAPI.getWorkHistory(id).then(r => setWorkHistory(Array.isArray(r.data) ? r.data : []))}
        />
      )}

      {/* ── TAB: Insurance ── */}
      {tab === 'insurance' && !editingInsurance && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
          <div className="card">
            <div className="card-header" style={{ marginBottom:16 }}>
              <span className="card-title">🏥 Insurance Details</span>
              {canManage && <button className="btn btn-outline btn-sm" onClick={startEditInsurance}>✏️ Edit</button>}
            </div>
            {insurance?.submitted && (
              <div style={{ padding:'8px 14px', background:'#f0fdf4', border:'1px solid #86efac', borderRadius:8, marginBottom:16, fontSize:13, color:'#15803d', fontWeight:600 }}>
                ✅ Insurance submitted to insurance team
              </div>
            )}
            {!insurance && (
              <div style={{ padding:'8px 14px', background:'#fff7ed', border:'1px solid #fed7aa', borderRadius:8, marginBottom:16, fontSize:13, color:'#c2410c' }}>
                ⚠ Insurance info not yet filled. {canManage && 'Click Edit to add details.'}
              </div>
            )}
            {[
              ['Smoking Status',           insurance?.smoking_status],
              ['Blood Group',              insurance?.blood_group],
              ['Pre-existing Conditions',  insurance?.pre_existing_conditions],
            ].map(([l,v]) => <InfoRow key={l} label={l} value={v} />)}
          </div>
          <div className="card">
            <div className="card-header" style={{ marginBottom:16 }}>
              <span className="card-title">👤 Nominee Details</span>
            </div>
            {[
              ['Nominee Name',  insurance?.nominee_name],
              ['Relation',      insurance?.nominee_relation],
              ['Nominee DOB',   insurance?.nominee_dob],
              ['Nominee Phone', insurance?.nominee_phone],
            ].map(([l,v]) => <InfoRow key={l} label={l} value={v} />)}
          </div>
          <div className="card">
            <div className="card-header" style={{ marginBottom:16 }}>
              <span className="card-title">💑 Spouse Details</span>
            </div>
            {[
              ['Spouse Name',   insurance?.spouse_name],
              ['Spouse DOB',    insurance?.spouse_dob],
              ['Spouse Gender', insurance?.spouse_gender],
            ].map(([l,v]) => <InfoRow key={l} label={l} value={v} />)}
          </div>
          <div className="card">
            <div className="card-header" style={{ marginBottom:16 }}>
              <span className="card-title">👶 Children</span>
            </div>
            {insurance?.children?.length > 0 ? insurance.children.map((c,i) => (
              <div key={i} style={{ padding:'10px 14px', background:'var(--bg)', borderRadius:8, border:'1px solid var(--border-light)', marginBottom:10 }}>
                <div style={{ fontWeight:600, fontSize:14 }}>{c.name || `Child ${i+1}`}</div>
                {c.dob && <div style={{ fontSize:12, color:'var(--text-muted)' }}>DOB: {c.dob}</div>}
                {c.gender && <div style={{ fontSize:12, color:'var(--text-muted)', textTransform:'capitalize' }}>Gender: {c.gender}</div>}
              </div>
            )) : <div style={{ fontSize:14, color:'var(--text-muted)', fontStyle:'italic' }}>No children added</div>}
          </div>
        </div>
      )}

      {tab === 'insurance' && editingInsurance && (
        <div className="card">
          <div className="card-header" style={{ marginBottom:24 }}>
            <span className="card-title">✏️ Edit Insurance Details</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setEditingInsurance(false)}>✕ Cancel</button>
          </div>
          <SectionLabel>🏥 Health Information</SectionLabel>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Smoking Status</label>
              <select className="form-control" value={insuranceForm.smoking_status} onChange={e => setInsuranceForm(p=>({...p,smoking_status:e.target.value}))}>
                <option value="">Select</option><option value="smoker">Smoker</option><option value="non-smoker">Non-Smoker</option>
              </select></div>
            <div className="form-group"><label className="form-label">Blood Group</label>
              <select className="form-control" value={insuranceForm.blood_group} onChange={e => setInsuranceForm(p=>({...p,blood_group:e.target.value}))}>
                <option value="">Select</option>
                {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
              </select></div>
          </div>
          <div className="form-group"><label className="form-label">Pre-existing Conditions</label>
            <textarea className="form-control" rows={2} placeholder="e.g. Diabetes (or leave blank)" value={insuranceForm.pre_existing_conditions} onChange={e => setInsuranceForm(p=>({...p,pre_existing_conditions:e.target.value}))} /></div>
          <SectionLabel>👤 Nominee Details</SectionLabel>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Nominee Name</label>
              <input className="form-control" value={insuranceForm.nominee_name} onChange={e => setInsuranceForm(p=>({...p,nominee_name:e.target.value}))} /></div>
            <div className="form-group"><label className="form-label">Relation</label>
              <select className="form-control" value={insuranceForm.nominee_relation} onChange={e => setInsuranceForm(p=>({...p,nominee_relation:e.target.value}))}>
                <option value="">Select</option>
                {['Spouse','Father','Mother','Son','Daughter','Sibling','Other'].map(r => <option key={r} value={r}>{r}</option>)}
              </select></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Nominee Date of Birth</label>
              <input className="form-control" type="date" value={insuranceForm.nominee_dob} onChange={e => setInsuranceForm(p=>({...p,nominee_dob:e.target.value}))} /></div>
            <div className="form-group"><label className="form-label">Nominee Phone</label>
              <input className="form-control" maxLength={10} value={insuranceForm.nominee_phone} onChange={e => setInsuranceForm(p=>({...p,nominee_phone:e.target.value.replace(/\D/g,'')}))} /></div>
          </div>
          <SectionLabel>💑 Spouse Details (Optional)</SectionLabel>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Spouse Name</label>
              <input className="form-control" value={insuranceForm.spouse_name} onChange={e => setInsuranceForm(p=>({...p,spouse_name:e.target.value}))} /></div>
            <div className="form-group"><label className="form-label">Spouse Date of Birth</label>
              <input className="form-control" type="date" value={insuranceForm.spouse_dob} onChange={e => setInsuranceForm(p=>({...p,spouse_dob:e.target.value}))} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Spouse Gender</label>
              <select className="form-control" value={insuranceForm.spouse_gender} onChange={e => setInsuranceForm(p=>({...p,spouse_gender:e.target.value}))}>
                <option value="">Select</option><option value="male">Male</option><option value="female">Female</option>
              </select></div>
            <div className="form-group" />
          </div>
          <FormActions onCancel={() => setEditingInsurance(false)} onSave={saveInsurance} loading={btnLoading('insurance')} />
        </div>
      )}

      {/* Doc Viewer Modal */}
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
              <DocViewer doc={viewDoc} employeeId={id} />
            </div>
          </div>
        </div>
      )}

      {/* Admin Reset Password Modal */}
      {showAdminPw && (
        <div className="modal-overlay" onClick={() => setShowAdminPw(false)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Reset Password — {emp.first_name}</span>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowAdminPw(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label required">New Password</label>
                <input type="password" className="form-control" value={adminNewPw}
                  onChange={e => setAdminNewPw(e.target.value)} placeholder="Min 6 characters" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowAdminPw(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAdminChangePassword}
                disabled={!adminNewPw || adminNewPw.length < 6}>Reset Password</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Document viewer sub-component
function DocViewer({ doc, employeeId }) {
  const [url, setUrl] = useState(null);
  const [type, setType] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const ext = doc.document_name.split('.').pop().toLowerCase();
    setType(ext);
    fetch(`https://intellative-hr-backend.onrender.com/api/v1/employees/${employeeId}/documents/${doc.id}/download`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(r => r.blob()).then(blob => {
      setUrl(URL.createObjectURL(blob));
    });
  }, [doc.id]);

  if (!url) return <div className="spinner" />;

  if (['jpg','jpeg','png','gif','webp'].includes(type)) {
    return <img src={url} alt={doc.document_name} style={{ maxWidth: '100%', maxHeight: 600, borderRadius: 8 }} />;
  }
  if (type === 'pdf') {
    return <iframe src={url} title={doc.document_name} style={{ width: '100%', height: 560, border: 'none', borderRadius: 8 }} />;
  }
  return (
    <div style={{ textAlign: 'center', padding: 40 }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>📄</div>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>
        Preview not available for .{type} files
      </p>
    </div>
  );
}

// Helper: single info row
function InfoRow({ label, value }) {
  return (
    <div style={{ display:'flex', marginBottom:12, gap:12, alignItems:'flex-start' }}>
      <div style={{ width:150, fontSize:12, fontWeight:600, color:'var(--text-muted)', flexShrink:0, paddingTop:2 }}>{label}</div>
      <div style={{ fontSize:14, fontWeight:500, color: value ? 'var(--text)' : 'var(--text-muted)', fontStyle: value ? 'normal' : 'italic' }}>{value || '—'}</div>
    </div>
  );
}

// Helper: section label inside edit forms
function SectionLabel({ children }) {
  return <div style={{ fontWeight:700, fontSize:12, color:'var(--text-muted)', margin:'20px 0 12px', textTransform:'uppercase', letterSpacing:1 }}>{children}</div>;
}

// Helper: save/cancel action row
function FormActions({ onCancel, onSave, loading }) {
  return (
    <div style={{ display:'flex', gap:12, justifyContent:'flex-end', marginTop:24, paddingTop:20, borderTop:'1px solid var(--border-light)' }}>
      <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
      <LoadingButton className="btn btn-primary" loading={loading} loadingText="Saving…" onClick={onSave}>💾 Save Changes</LoadingButton>
    </div>
  );
}

// Reusable Document Upload Card — shows existing doc with view/verify/replace actions
function DocumentSection({ title, types, docs, uploadDoc, verifyDoc, viewDoc: onView, canManage, labelMap }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h4 style={{ marginBottom: 14, fontSize: 15.5, fontWeight: 600 }}>{title}</h4>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: 14,
      }}>
        {types.map(dt => {
          const existing = docs.find(d => d.document_type.toLowerCase() === dt.toLowerCase());
          const displayName = (labelMap && labelMap[dt]) || dt.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          const isVerified = existing?.is_verified;

          return (
            <div key={dt} style={{
              border: `2px solid ${existing ? (isVerified ? '#16a34a' : '#f59e0b') : '#cbd5e1'}`,
              borderRadius: 12,
              padding: '14px 14px 12px',
              background: existing ? (isVerified ? '#f0fdf4' : '#fffbeb') : '#f8fafc',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}>
              {/* Top: icon + name + status */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span style={{ fontSize: 26, lineHeight: 1 }}>
                  {existing ? (isVerified ? '✅' : '⏳') : '📎'}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, lineHeight: 1.3 }}>{displayName}</div>
                  {existing && (
                    <div style={{ fontSize: 11, marginTop: 3, fontWeight: 600, color: isVerified ? '#16a34a' : '#d97706' }}>
                      {isVerified ? '✓ Verified' : '⏳ Pending verification'}
                    </div>
                  )}
                  {!existing && (
                    <div style={{ fontSize: 11, marginTop: 3, color: '#94a3b8' }}>Not uploaded</div>
                  )}
                </div>
              </div>

              {/* Existing doc: filename truncated */}
              {existing && (
                <div style={{ fontSize: 11, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  📄 {existing.document_name}
                </div>
              )}

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 2 }}>
                {existing && (
                  <>
                    <button
                      className="btn btn-outline btn-sm"
                      style={{ fontSize: 11, padding: '3px 10px' }}
                      onClick={() => onView && onView(existing)}
                    >
                      👁 View
                    </button>
                    {canManage && !isVerified && (
                      <button
                        className="btn btn-success btn-sm"
                        style={{ fontSize: 11, padding: '3px 10px' }}
                        onClick={() => verifyDoc(existing.id, true)}
                      >
                        ✓ Verify
                      </button>
                    )}
                    {canManage && isVerified && (
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ fontSize: 11, padding: '3px 10px', color: '#f59e0b' }}
                        onClick={() => verifyDoc(existing.id, false)}
                      >
                        Unverify
                      </button>
                    )}
                  </>
                )}
                {/* Upload / Replace */}
                <label style={{ cursor: 'pointer' }}>
                  <input
                    type="file"
                    style={{ display: 'none' }}
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={e => e.target.files?.[0] && uploadDoc(dt, e.target.files[0])}
                  />
                  <span className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: '3px 10px' }}>
                    {existing ? '🔁 Replace' : '📁 Upload'}
                  </span>
                </label>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}