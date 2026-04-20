import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  employeesAPI, departmentsAPI, rolesAPI, onboardingAPI,
} from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useAsync, useButtonLoading } from '../hooks/useAsync';
import { validateForm, VALIDATORS, useFormErrors } from '../hooks/useValidation';
import LoadingButton from '../components/ui/LoadingButton';
import { ValidatedInput, ValidatedSelect } from '../components/ui/FormField';
import { toast } from 'react-toastify';
import { ConfirmDialog } from '../components/layout/Layout';
import ParsedFieldReview from '../components/ui/ParsedFieldReview';

/* ─── Constants ─────────────────────────────────────────────────────────────── */
const DOC_CATEGORIES = [
  {
    label: '🪪 Identity Documents',
    docs: [
      { value: 'aadhar', label: 'Aadhar Card', required: true },
      { value: 'pan', label: 'PAN Card', required: true },
      { value: 'passport_photo', label: 'Passport Size Photo', required: true },
      { value: 'voter_id', label: 'Voter ID', required: false },
      { value: 'driving_license', label: 'Driving License', required: false },
      { value: 'passport', label: 'Passport', required: false },
    ],
  },
  {
    label: '🏠 Address Proof',
    docs: [
      { value: 'utility_bill', label: 'Utility Bill', required: false },
      { value: 'rental_agreement', label: 'Rental Agreement', required: false },
      { value: 'bank_statement_address', label: 'Bank Statement (Address)', required: false },
    ],
  },
  {
    label: '🎓 Educational Documents',
    docs: [
      { value: 'marks_10th', label: '10th Marks Sheet', required: false },
      { value: 'marks_12th', label: '12th Marks Sheet', required: false },
      { value: 'graduation_certificate', label: 'Graduation Certificate', required: false },
      { value: 'postgraduation_certificate', label: 'Post-Graduation Certificate', required: false },
      { value: 'consolidated_marks', label: 'Consolidated Marks', required: false },
      { value: 'degree', label: 'Degree Certificate', required: false },
    ],
  },
  {
    label: '💼 Employment / Experience Documents',
    docs: [
      { value: 'relieving_letter', label: 'Relieving Letter', required: false },
      { value: 'experience_certificate', label: 'Experience Certificate', required: false },
      { value: 'experience_letter', label: 'Experience Letter', required: false },
      { value: 'payslips', label: 'Last 3 Months Payslips', required: false },
      { value: 'form_16', label: 'Form 16 / ITR', required: false },
      { value: 'pf_service_history', label: 'PF Service History', required: false },
      { value: 'bank_statement_salary', label: 'Salary Bank Statement', required: false },
    ],
  },
  {
    label: '📎 Other Documents',
    docs: [
      { value: 'offer_letter', label: 'Offer Letter', required: false },
      { value: 'joining_letter', label: 'Joining Letter', required: false },
      { value: 'other', label: 'Other', required: false },
    ],
  },
];

const DOC_TYPES = DOC_CATEGORIES.flatMap(c => c.docs);
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const RELATIONS = ['Spouse', 'Father', 'Mother', 'Son', 'Daughter', 'Sibling', 'Other'];
const FLOW_STEPS = ['Personal Info', 'Work History', 'Job Details', 'Documents', 'Insurance', 'Bank Details', 'Complete'];

const STEP_CONFIG = [
  { key: 'has_personal_info', label: 'Personal Info', icon: '👤', desc: 'Name, contact, address' },
  { key: 'has_job_details', label: 'Job Details', icon: '💼', desc: 'Department, role, joining date' },
  { key: 'has_documents', label: 'Documents', icon: '📄', desc: 'Aadhar, PAN + optional docs' },
  { key: 'has_insurance', label: 'Insurance', icon: '🏥', desc: 'Nominee & health info' },
];

const fmtDate = (d) => d
  ? new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  : '—';

const inputSt = {
  width: '100%', padding: '8px 10px', borderRadius: 7,
  border: '1px solid var(--border)', fontSize: 13,
  background: 'var(--bg)', color: 'var(--text-primary)', boxSizing: 'border-box',
};

/* ─── Mini progress ring ─────────────────────────────────────────────────────── */
const Ring = ({ pct, size = 52 }) => {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const color = pct === 100 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f3f4f6" strokeWidth={5} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={5}
        strokeDasharray={circ} strokeDashoffset={circ * (1 - pct / 100)}
        strokeLinecap="round" style={{ transition: 'stroke-dashoffset .5s' }} />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
        style={{
          transform: `rotate(90deg)`, transformOrigin: `${size / 2}px ${size / 2}px`,
          fontSize: size < 48 ? 9 : 11, fontWeight: 800, fill: color
        }}>
        {pct}%
      </text>
    </svg>
  );
};

const StepPill = ({ done, icon, label }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '4px 10px', borderRadius: 20,
    background: done ? '#f0fdf4' : '#fff7ed',
    border: `1px solid ${done ? '#86efac' : '#fed7aa'}`,
    fontSize: 12, fontWeight: 600,
    color: done ? '#15803d' : '#c2410c',
    whiteSpace: 'nowrap',
  }}>
    <span>{icon}</span>
    <span>{label}</span>
    <span style={{ fontSize: 11 }}>{done ? '✓' : '!'}</span>
  </div>
);

/* ─── Employee Card ──────────────────────────────────────────────────────────── */
const EmpCard = ({ emp, onResume, onSendEmail, onCreateTask }) => {
  const c = emp.completion;
  const missing = c.missing_steps || [];
  const isActive = emp.employee_status === 'active';

  return (
    <div
      onClick={() => onResume(emp)}
      style={{
        background: '#fff', borderRadius: 14, padding: '18px 20px',
        border: '1px solid #e5e7eb',
        borderLeft: `4px solid ${c.percent === 100 ? '#22c55e' : c.percent >= 50 ? '#f59e0b' : '#ef4444'}`,
        boxShadow: '0 1px 4px rgba(0,0,0,.04)', cursor: 'pointer',
        transition: 'box-shadow .15s, transform .1s',
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,.09)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,.04)'; e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <Ring pct={c.percent} />
        <div style={{ flex: 1, minWidth: 160 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <span style={{ fontWeight: 800, fontSize: 15, color: '#111827' }}>{emp.name}</span>
            {isActive && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: '#eff6ff', border: '1px solid #93c5fd', color: '#1d4ed8' }}>ACTIVE</span>
            )}
            {!isActive && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: '#fef3c7', border: '1px solid #fcd34d', color: '#92400e' }}>PENDING</span>
            )}
          </div>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>
            {emp.employee_id} · {emp.department || 'No dept'} · {emp.role || 'No role'}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {STEP_CONFIG.map(s => (
              <StepPill key={s.key} done={c[s.key]} icon={s.icon} label={s.label} />
            ))}
          </div>
          {missing.length > 0 && (
            <div style={{ marginTop: 8, fontSize: 12, color: '#b45309', fontWeight: 600 }}>
              ⚠ Still needed: {missing.join(' · ')}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
          <div style={{ fontSize: 11, color: '#9ca3af' }}>Started {fmtDate(emp.created_at?.split('T')[0])}</div>
          <button
            onClick={e => { e.stopPropagation(); onResume(emp); }}
            style={{ background: c.percent === 100 ? '#22c55e' : '#0d5c7a', color: '#fff', border: 'none', borderRadius: 9, padding: '8px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            {c.percent === 100 ? '✓ View / Edit' : `▶ Complete (${c.steps_done}/${c.total_steps})`}
          </button>
          {emp.personal_email && (!c.has_documents || !c.has_insurance) && (
            <button
              onClick={e => { e.stopPropagation(); onSendEmail(emp); }}
              style={{ background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa', borderRadius: 9, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
              📧 Send Joining Email
            </button>
          )}
          <button
            onClick={e => { e.stopPropagation(); onCreateTask(emp); }}
            style={{ background: '#faf5ff', color: '#7c3aed', border: '1px solid #e9d5ff', borderRadius: 9, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
            📋 Assign Profile Task
          </button>
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════════════════════ */
function DocViewer({ doc, employeeId }) {
  const [url, setUrl] = React.useState(null);
  React.useEffect(() => {
    let objectUrl = null;
    const token = localStorage.getItem('access_token');
    fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1'}/employees/${employeeId}/documents/${doc.id}/download`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(r => r.blob()).then(blob => { objectUrl = URL.createObjectURL(blob); setUrl(objectUrl); }).catch(() => { });
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [doc.id, employeeId]);
  if (!url) return <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Loading document…</div>;
  const ext = doc.document_name.split('.').pop().toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext))
    return <img src={url} alt={doc.document_name} style={{ maxWidth: '100%', maxHeight: 520, borderRadius: 8 }} />;
  return <iframe src={url} title={doc.document_name} style={{ width: '100%', height: 500, border: 'none', borderRadius: 8 }} />;
}

export default function PendingOnboardingPage() {
  const navigate = useNavigate();
  const { can } = useAuth();
  const { run: runSubmit, loading: submitting } = useAsync();
  const { run: btnRun, isLoading: btnLoading } = useButtonLoading();
  const activateRef = useRef(false);

  /* ── List state ── */
  const [list, setList] = useState([]);
  const [listLoading, setLL] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  /* ── Flow state ── */
  const [selected, setSelected] = useState(null);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({});
  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);
  const [pendingDocs, setPendingDocs] = useState([]);
  const [serverDocs, setServerDocs] = useState([]);
  const [viewDoc, setViewDoc] = useState(null);
  const [workHistory, setWorkHistory] = useState([]);
  const [showWHForm, setShowWHForm] = useState(false);
  const [newWH, setNewWH] = useState({ company_name: '', designation: '', from_date: '', to_date: '', is_current: false, reason_for_leaving: '', last_ctc: '' });
  const [insuranceForm, setInsuranceForm] = useState({ nominee_name: '', nominee_relation: '', nominee_dob: '', nominee_phone: '', blood_group: '', pre_existing_conditions: '' });
  const [insuranceSaved, setInsuranceSaved] = useState(false);
  const [insuranceSkipped, setInsuranceSkipped] = useState(false);
  const { errors, setAllErrors, clearAll, clearFieldError } = useFormErrors();

  /* ── Bank details state ── */
  const BLANK_BANK = { bank_name: '', account_holder_name: '', account_number: '', ifsc_code: '', branch_name: '', account_type: 'savings', hdfc_customer_id: '', hdfc_netbanking_id: '' };
  const [bank, setBank] = useState(BLANK_BANK);
  const [bankSaving, setBankSaving] = useState(false);
  const [bankLoaded, setBankLoaded] = useState(false);
  const [bankSkipped, setBankSkipped] = useState(false);
  const [salary, setSalary] = useState({ ctc: '', basic: '', hra: '', special_allowance: '', pf_contribution: '', bonus: '', in_hand_salary: '' });
  const [salaryLoaded, setSalaryLoaded] = useState(false);

  /* ── Resume / Form 16 auto-fill state ── */
  const [resumeParsing, setResumeParsing] = useState(false);
  const [form16Parsing, setForm16Parsing] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [showParseReview, setShowParseReview] = useState(false);
  const [showAutoFill, setShowAutoFill] = useState(false);

  /* ── Confirm dialogs ── */
  const [emailConfirmTarget, setEmailConfirmTarget] = useState(null);
  const [taskConfirmTarget, setTaskConfirmTarget] = useState(null);
  const [taskResult, setTaskResult] = useState(null);

  /* ── Load list ── */
  const loadList = useCallback(async () => {
    setLL(true);
    try {
      const { data } = await onboardingAPI.getPendingEmployees();
      setList(data);
    } catch { toast.error('Failed to load employees'); }
    finally { setLL(false); }
  }, []);

  useEffect(() => { loadList(); }, [loadList]);
  useEffect(() => { departmentsAPI.list().then(r => setDepartments(r.data)).catch(() => { }); }, []);
  useEffect(() => {
    if (form.department_id)
      rolesAPI.list(form.department_id).then(r => setRoles(r.data)).catch(() => { });
    else setRoles([]);
  }, [form.department_id]);

  /* ── Load bank details when bank step shown ── */
  useEffect(() => {
    if (step === 5 && selected?.id && !bankLoaded) {
      employeesAPI.getBankDetails(selected.id).then(res => {
        if (res.data) {
          setBank({
            bank_name: res.data.bank_name || '', account_holder_name: res.data.account_holder_name || '',
            account_number: res.data.account_number || '', ifsc_code: res.data.ifsc_code || '',
            branch_name: res.data.branch_name || '', account_type: res.data.account_type || 'savings',
            hdfc_customer_id: res.data.hdfc_customer_id || '', hdfc_netbanking_id: res.data.hdfc_netbanking_id || '',
          });
        }
        setBankLoaded(true);
      }).catch(() => setBankLoaded(true));
    }
  }, [step, selected?.id, bankLoaded]);

  /* ── Open resume flow ── */
  const openResume = async (emp) => {
    activateRef.current = false;
    setInsuranceSaved(false);
    setInsuranceSkipped(false);
    setPendingDocs([]);
    setServerDocs([]);
    setViewDoc(null);
    setWorkHistory([]);
    setShowWHForm(false);
    setBank(BLANK_BANK);
    setBankLoaded(false);
    setBankSkipped(false);
    setShowAutoFill(false);
    clearAll();

    setForm({
      employee_type: emp.employee_type || 'new',
      first_name: emp.first_name || '',
      last_name: emp.last_name || '',
      personal_email: emp.personal_email || '',
      phone: emp.phone || '',
      gender: emp.gender || '',
      date_of_birth: emp.date_of_birth || '',
      address: emp.address || '',
      city: emp.city || '',
      state: emp.state || '',
      pincode: emp.pincode || '',
      emergency_contact_name: emp.emergency_contact_name || '',
      emergency_contact_phone: emp.emergency_contact_phone || '',
      department_id: emp.department_id || '',
      role_id: emp.role_id || '',
      joining_date: emp.joining_date || '',
    });

    try { const { data } = await onboardingAPI.getWorkHistory(emp.id); setWorkHistory(data || []); } catch { }
    try { const { data } = await employeesAPI.listDocuments(emp.id); setServerDocs(Array.isArray(data) ? data : []); } catch { setServerDocs([]); }
    try {
      const { data } = await onboardingAPI.getInsurance(emp.id);
      if (data?.nominee_name) {
        setInsuranceForm({
          nominee_name: data.nominee_name || '', nominee_relation: data.nominee_relation || '',
          nominee_dob: data.nominee_dob || '', nominee_phone: data.nominee_phone || '',
          blood_group: data.blood_group || '', pre_existing_conditions: data.pre_existing_conditions || '',
        });
        setInsuranceSaved(true);
      }
    } catch { }
    try { const { data } = await employeesAPI.getBankDetails(emp.id); if (data) setBank(data); setBankLoaded(true); } catch { }
    try { const { data } = await employeesAPI.getSalaryDetails(emp.id); if (data) setSalary(data); setSalaryLoaded(true); } catch { }

    const c = emp.completion;
    let startStep = 0;
    if (c.has_personal_info) startStep = 1;
    if (c.has_personal_info) startStep = 2;
    if (c.has_job_details) startStep = 3;
    if (c.has_documents) startStep = 4;
    if (c.has_insurance || emp.employee_status === 'active') startStep = 5;

    setSelected(emp);
    setStep(startStep);
  };

  const closeFlow = () => { setSelected(null); setStep(0); loadList(); };

  /* ── Handle parsed field acceptance ── */
  const handleAcceptParsed = (acceptedData) => {
    if (acceptedData.personal) {
      const p = { ...acceptedData.personal };
      if (p.phone) {
        p.phone = p.phone.replace(/^\+91/, '').replace(/^91(?=\d{10}$)/, '');
        if (p.phone.length > 10) p.phone = p.phone.slice(-10);
      }
      setForm(f => ({ ...f, ...p }));
    }
    if (acceptedData.work_history) {
      const newRecords = acceptedData.work_history.map(wh => ({
        company_name: wh.company_name || '', designation: wh.designation || '',
        from_date: wh.from_date || '', to_date: wh.is_current ? '' : (wh.to_date || ''),
        is_current: wh.is_current || false, reason_for_leaving: '', last_ctc: wh.last_ctc || '',
      }));
      setWorkHistory(w => [...w, ...newRecords]);
    }
    if (acceptedData.salary) {
      setSalary(s => ({ ...s, ...acceptedData.salary }));
    }
    if (acceptedData.bank) {
      setBank(b => ({ ...b, ...acceptedData.bank }));
    }
    setShowParseReview(false);
    setParsedData(null);
    toast.success('Fields applied! Review and adjust below.');
  };

  /* ── Sending joining email ── */
  const sendJoiningEmail = async (emp) => { setEmailConfirmTarget(emp); };

  const doSendEmail = async () => {
    const emp = emailConfirmTarget;
    setEmailConfirmTarget(null);
    try {
      await onboardingAPI.sendJoiningDetailsEmail(emp.id);
      toast.success(`✅ Joining details email sent to ${emp.personal_email}`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to send email');
    }
  };

  /* ── Create profile task ── */
  const handleCreateTask = async (emp) => { setTaskConfirmTarget(emp); };

  const doCreateTask = async () => {
    const emp = taskConfirmTarget;
    setTaskConfirmTarget(null);
    try {
      const { data } = await employeesAPI.createProfileTask(emp.id);
      setTaskResult({ emp, data });
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to create task');
    }
  };

  /* ── Field setter ── */
  const set = (field, val) => { setForm(f => ({ ...f, [field]: val })); clearFieldError(field); };

  /* ── Step validation ── */
  const validateStep = () => {
    const ruleMap = {
      0: {
        first_name: [VALIDATORS.required, VALIDATORS.name], last_name: [VALIDATORS.required, VALIDATORS.name],
        personal_email: [VALIDATORS.required, VALIDATORS.email], phone: [VALIDATORS.required, VALIDATORS.phone]
      },
      2: { department_id: [VALIDATORS.required], joining_date: [VALIDATORS.required, VALIDATORS.joiningDate] },
    };
    const rules = { ...(ruleMap[step] || {}) };
    if (step === 0) {
      if (form.pincode) rules.pincode = [VALIDATORS.pincode];
      if (form.date_of_birth) rules.date_of_birth = [VALIDATORS.dob];
      if (form.emergency_contact_phone) rules.emergency_contact_phone = [VALIDATORS.altPhone];
    }
    const errs = validateForm(form, rules);
    if (Object.keys(errs).length > 0) { setAllErrors(errs); toast.error('Please fix the errors before continuing'); return false; }
    clearAll(); return true;
  };

  /* ── Save personal info ── */
  const savePersonalInfo = async () => {
    if (!validateStep()) return;
    await runSubmit(async () => {
      await employeesAPI.update(selected.id, {
        first_name: form.first_name, last_name: form.last_name,
        personal_email: form.personal_email, phone: form.phone,
        gender: form.gender || null, date_of_birth: form.date_of_birth || null,
        address: form.address || null, city: form.city || null,
        state: form.state || null, pincode: form.pincode || null,
        emergency_contact_name: form.emergency_contact_name || null,
        emergency_contact_phone: form.emergency_contact_phone || null,
      });
      toast.success('Personal info saved');
      setStep(1);
    }).catch(err => toast.error(err?.response?.data?.detail || 'Failed to save'));
  };

  /* ── Save job details ── */
  const saveJobDetails = async () => {
    if (!validateStep()) return;
    await runSubmit(async () => {
      await employeesAPI.update(selected.id, {
        department_id: form.department_id || null,
        role_id: form.role_id || null,
        joining_date: form.joining_date || null,
      });
      if (salary.ctc || salary.basic) {
        await employeesAPI.saveSalaryDetails(selected.id, salary).catch(() => { });
      }
      toast.success('Job & Salary details saved');
      setStep(3);
    }).catch(err => toast.error(err?.response?.data?.detail || 'Failed to save'));
  };

  /* ── Save documents ── */
  const saveDocuments = async () => {
    await runSubmit(async () => {
      for (const d of pendingDocs)
        await employeesAPI.uploadDocument(selected.id, d.type, d.file).catch(() => { });
      toast.success(pendingDocs.length ? `${pendingDocs.length} document(s) uploaded` : 'No new documents uploaded');
      try { const { data } = await employeesAPI.listDocuments(selected.id); setServerDocs(Array.isArray(data) ? data : []); } catch { }
      setPendingDocs([]);
      setStep(4);
    });
  };

  /* ── Work history ── */
  const addWH = async () => {
    if (!newWH.company_name || !newWH.from_date) { toast.error('Company name and start date are required'); return; }
    await onboardingAPI.addWorkHistory(selected.id, newWH).catch(() => { });
    setWorkHistory(w => [...w, { ...newWH }]);
    setNewWH({ company_name: '', designation: '', from_date: '', to_date: '', is_current: false, reason_for_leaving: '', last_ctc: '' });
    setShowWHForm(false);
    toast.success('Work history added');
  };

  /* ── Doc upload handler ── */
  const addDoc = (type, file) => {
    if (file.size > 10 * 1024 * 1024) { toast.error('Max 10MB per file'); return; }
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'].includes(ext)) { toast.error(`File type .${ext} not allowed`); return; }
    setPendingDocs(d => [...d.filter(x => x.type !== type), { type, file }]);
  };

  /* ── Insurance ── */
  const saveInsurance = async () => {
    if (!insuranceForm.nominee_name || !insuranceForm.nominee_relation)
      return toast.error('Fill nominee name and relation');
    await btnRun('insurance', async () => {
      const payload = { ...insuranceForm };
      Object.keys(payload).forEach(k => { if (payload[k] === '') payload[k] = null; });
      await onboardingAPI.saveInsurance(selected.id, payload);
      await onboardingAPI.submitInsurance(selected.id);
      setInsuranceSaved(true);
      setInsuranceSkipped(false);
      toast.success('Insurance submitted!');
    }).catch(() => toast.error('Failed to save insurance'));
  };

  /* ── Save bank details ── */
  const saveBank = async () => {
    if (!bank.bank_name || !bank.account_number || !bank.ifsc_code) {
      toast.error('Bank name, account number and IFSC are required'); return;
    }
    setBankSaving(true);
    try {
      await employeesAPI.saveBankDetails(selected.id, bank);
      toast.success('Bank details saved!');
      setStep(6);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Save failed');
    } finally { setBankSaving(false); }
  };

  /* ── Activate ── */
  const handleActivate = async () => {
    if (activateRef.current) return;
    activateRef.current = true;
    await btnRun('activate', async () => {
      await employeesAPI.activate(selected.id);
      if (salary.ctc || salary.basic) {
        await employeesAPI.saveSalaryDetails(selected.id, salary).catch(() => { });
      }
      await onboardingAPI.requestEmailSetup(selected.id).catch(() => { });
      try { await onboardingAPI.createActivationTasks(selected.id); } catch { }
      if (insuranceSkipped) {
        try { await onboardingAPI.createOnboardingTasks(selected.id, { skipped_insurance: true, skipped_docs: false }); } catch { }
      }
      toast.success(`${selected.name} activated! Welcome email sent.`);
      navigate(`/employees/${selected.id}`);
    }).catch(err => {
      toast.error(err?.response?.data?.detail || 'Activation failed');
      activateRef.current = false;
    });
  };

  /* ── Filtered list ── */
  const filtered = list.filter(e => {
    const matchSearch = !search ||
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      (e.employee_id || '').toLowerCase().includes(search.toLowerCase()) ||
      (e.department || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus =
      filterStatus === 'all' ? true :
        filterStatus === 'pending' ? e.employee_status === 'pending' :
          filterStatus === 'active' ? e.employee_status === 'active' : true;
    return matchSearch && matchStatus;
  });

  const pendingCount = list.filter(e => e.employee_status === 'pending').length;
  const activeIncomplete = list.filter(e => e.employee_status === 'active').length;

  /* ════════════════════════════════════════════════════════════════════════
     FLOW VIEW
  ════════════════════════════════════════════════════════════════════════ */
  if (selected) {
    const isActive = selected.employee_status === 'active';
    const c = selected.completion;

    return (
      <>
        {/* Parse review modal */}
        {showParseReview && parsedData && (
          <ParsedFieldReview
            data={parsedData}
            currentData={{ personal: form, work_history: workHistory, salary, bank, tax: {} }}
            onAccept={handleAcceptParsed}
            onClose={() => { setShowParseReview(false); setParsedData(null); }}
          />
        )}

        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
            <button onClick={closeFlow} style={{ background: '#f3f4f6', border: 'none', borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 700, color: '#374151', cursor: 'pointer' }}>
              ← Back
            </button>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h1 style={{ fontSize: 19, fontWeight: 800, color: '#111827', margin: 0 }}>
                  Complete Onboarding — {selected.name}
                </h1>
                {isActive && (
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: '#eff6ff', border: '1px solid #93c5fd', color: '#1d4ed8' }}>
                    ACTIVE EMPLOYEE
                  </span>
                )}
              </div>
              <p style={{ fontSize: 12, color: '#9ca3af', margin: '2px 0 0' }}>
                {selected.employee_id} · {selected.department || 'No department'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {STEP_CONFIG.map(s => (
                <div key={s.key} title={s.label} style={{ width: 32, height: 32, borderRadius: 8, background: c[s.key] ? '#f0fdf4' : '#fff7ed', border: `1.5px solid ${c[s.key] ? '#86efac' : '#fed7aa'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>
                  {s.icon}
                </div>
              ))}
            </div>
          </div>

          {c.missing_steps?.length > 0 && (
            <div style={{ padding: '12px 16px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10, marginBottom: 16, fontSize: 13, color: '#92400e', display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 16 }}>⚠</span>
              <span><strong>Incomplete steps:</strong> {c.missing_steps.join(' · ')}</span>
            </div>
          )}

          {/* Step tabs */}
          <div style={{ display: 'flex', gap: 2, background: '#f3f4f6', padding: 4, borderRadius: 12, border: '1px solid #e5e7eb', marginBottom: 20, overflowX: 'auto' }}>
            {FLOW_STEPS.map((label, i) => {
              const stepDone = (() => {
                if (i === 0) return c.has_personal_info;
                if (i === 1) return c.has_work_history;
                if (i === 2) return c.has_job_details;
                if (i === 3) return c.has_documents;
                if (i === 4) return c.has_insurance;
                return false;
              })();
              const active = step === i;
              return (
                <button key={i} onClick={() => setStep(i)} style={{ padding: '7px 14px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap', background: active ? '#fff' : 'transparent', color: active ? '#111827' : stepDone ? '#15803d' : '#9ca3af', boxShadow: active ? '0 1px 4px rgba(0,0,0,.08)' : 'none' }}>
                  {stepDone ? '✓' : `${i + 1}.`} {label}
                </button>
              );
            })}
          </div>

          <div className="card" style={{ maxWidth: 820, margin: '0 auto' }}>

            {/* ── Step 0: Personal Info ── */}
            {step === 0 && (
              <div>
                <h3 style={{ marginBottom: 4, fontSize: 17, fontWeight: 700 }}>Personal Information</h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>Update employee personal details or auto-fill from resume.</p>


                <div className="form-row">
                  <ValidatedInput label="First Name" required value={form.first_name} error={errors.first_name} onChange={e => set('first_name', e.target.value)} />
                  <ValidatedInput label="Last Name" required value={form.last_name} error={errors.last_name} onChange={e => set('last_name', e.target.value)} />
                </div>
                <div className="form-row">
                  <ValidatedInput label="Personal Email" required type="email" value={form.personal_email} error={errors.personal_email} onChange={e => set('personal_email', e.target.value)} />
                  <ValidatedInput label="Phone" required value={form.phone} error={errors.phone} onChange={e => set('phone', e.target.value.replace(/\D/g, ''))} maxLength={10} />
                </div>
                <div className="form-row">
                  <ValidatedSelect label="Gender" value={form.gender} onChange={e => set('gender', e.target.value)}>
                    <option value="">Select</option>
                    {['male', 'female', 'other'].map(g => <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>)}
                  </ValidatedSelect>
                  <ValidatedInput label="Date of Birth" type="date" value={form.date_of_birth} error={errors.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} hint="Must be 18+ years old" />
                </div>
                <ValidatedInput label="Address" value={form.address} onChange={e => set('address', e.target.value)} />
                <div className="form-row-3">
                  <ValidatedInput label="City" value={form.city} onChange={e => set('city', e.target.value)} />
                  <ValidatedInput label="State" value={form.state} onChange={e => set('state', e.target.value)} />
                  <ValidatedInput label="Pincode" value={form.pincode} error={errors.pincode} onChange={e => set('pincode', e.target.value.replace(/\D/g, ''))} maxLength={6} hint="6 digits" />
                </div>
                <div className="form-row">
                  <ValidatedInput label="Emergency Contact Name" value={form.emergency_contact_name} onChange={e => set('emergency_contact_name', e.target.value)} />
                  <ValidatedInput label="Emergency Contact Phone" value={form.emergency_contact_phone} error={errors.emergency_contact_phone} onChange={e => set('emergency_contact_phone', e.target.value.replace(/\D/g, ''))} maxLength={10} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
                  <LoadingButton loading={submitting} loadingText="Saving…" onClick={savePersonalInfo}>Save & Next →</LoadingButton>
                </div>
              </div>
            )}

            {/* ── Step 1: Work History ── */}
            {step === 1 && (
              <div>
                <h3 style={{ marginBottom: 8, fontSize: 17, fontWeight: 700 }}>Work History <span style={{ fontSize: 13, color: '#9ca3af', fontWeight: 500 }}>(Optional)</span></h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>Previous employment records. Skip for freshers.</p>
                {workHistory.map((wh, i) => (
                  <div key={i} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', marginBottom: 10, display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{wh.designation || 'Role'} @ {wh.company_name}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{wh.from_date} → {wh.is_current ? 'Present' : (wh.to_date || '—')}</div>
                    </div>
                  </div>
                ))}
                {!showWHForm ? (
                  <button className="btn btn-outline" onClick={() => setShowWHForm(true)}>+ Add Work Experience</button>
                ) : (
                  <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
                    <div className="form-row">
                      <div className="form-group"><label className="form-label required">Company Name</label><input className="form-control" value={newWH.company_name} onChange={e => setNewWH(w => ({ ...w, company_name: e.target.value }))} /></div>
                      <div className="form-group"><label className="form-label">Designation</label><input className="form-control" value={newWH.designation} onChange={e => setNewWH(w => ({ ...w, designation: e.target.value }))} /></div>
                    </div>
                    <div className="form-row">
                      <div className="form-group"><label className="form-label required">Start Date</label><input type="date" className="form-control" value={newWH.from_date} onChange={e => setNewWH(w => ({ ...w, from_date: e.target.value }))} /></div>
                      <div className="form-group"><label className="form-label">End Date</label><input type="date" className="form-control" value={newWH.to_date} disabled={newWH.is_current} onChange={e => setNewWH(w => ({ ...w, to_date: e.target.value }))} /></div>
                    </div>
                    <div className="form-row">
                      <div className="form-group"><label className="form-label">Last CTC</label><input className="form-control" placeholder="e.g. 6 LPA" value={newWH.last_ctc} onChange={e => setNewWH(w => ({ ...w, last_ctc: e.target.value }))} /></div>
                      <div className="form-group"><label className="form-label">Reason for Leaving</label><input className="form-control" value={newWH.reason_for_leaving} onChange={e => setNewWH(w => ({ ...w, reason_for_leaving: e.target.value }))} /></div>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, marginBottom: 14, cursor: 'pointer' }}>
                      <input type="checkbox" checked={newWH.is_current} onChange={e => setNewWH(w => ({ ...w, is_current: e.target.checked, to_date: '' }))} /> Currently working here
                    </label>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button className="btn btn-primary" onClick={addWH}>Add</button>
                      <button className="btn btn-ghost" onClick={() => setShowWHForm(false)}>Cancel</button>
                    </div>
                  </div>
                )}
                {workHistory.length === 0 && !showWHForm && (
                  <p style={{ marginTop: 16, fontSize: 13, color: 'var(--text-muted)' }}>No work history — click Next to skip (freshers).</p>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
                  <button className="btn btn-ghost" onClick={() => setStep(0)}>← Back</button>
                  <button className="btn btn-primary" onClick={() => setStep(2)}>Next →</button>
                </div>
              </div>
            )}

            {/* ── Step 2: Job Details ── */}
            {step === 2 && (
              <div>
                <h3 style={{ marginBottom: 24, fontSize: 17, fontWeight: 700 }}>Job Details</h3>
                <div className="form-row">
                  <ValidatedSelect label="Department" required value={form.department_id} error={errors.department_id} onChange={e => { set('department_id', e.target.value); set('role_id', ''); }}>
                    <option value="">Select Department</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </ValidatedSelect>
                  <ValidatedSelect label="Role" value={form.role_id} onChange={e => set('role_id', e.target.value)} disabled={!form.department_id}>
                    <option value="">{form.department_id ? 'Select Role' : 'Select department first'}</option>
                    {roles.map(r => <option key={r.id} value={r.id}>{r.name} (L{r.level})</option>)}
                  </ValidatedSelect>
                </div>
                <div className="form-row">
                  <ValidatedInput label="Joining Date" required type="date" value={form.joining_date} error={errors.joining_date} onChange={e => set('joining_date', e.target.value)} />
                </div>

                <div style={{ marginTop: 24, padding: 20, background: 'linear-gradient(135deg,#f8fafc,#f1f5f9)', borderRadius: 12, border: '1px solid var(--border)' }}>
                  <h4 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: 'var(--primary)' }}>💰 Compensation Details</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div className="form-group">
                      <label className="form-label">Annual CTC (₹)</label>
                      <input type="number" className="form-control" value={salary.ctc} onChange={e => setSalary(s => ({ ...s, ctc: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Basic Salary (₹)</label>
                      <input type="number" className="form-control" value={salary.basic} onChange={e => setSalary(s => ({ ...s, basic: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">HRA (₹)</label>
                      <input type="number" className="form-control" value={salary.hra} onChange={e => setSalary(s => ({ ...s, hra: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Special Allowance (₹)</label>
                      <input type="number" className="form-control" value={salary.special_allowance} onChange={e => setSalary(s => ({ ...s, special_allowance: e.target.value }))} />
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
                  <button className="btn btn-ghost" onClick={() => setStep(1)}>← Back</button>
                  <LoadingButton loading={submitting} loadingText="Saving…" onClick={saveJobDetails}>Save & Next →</LoadingButton>
                </div>
              </div>
            )}

            {/* ── Step 3: Documents ── */}
            {step === 3 && (
              <div>
                <h3 style={{ marginBottom: 8, fontSize: 17, fontWeight: 700 }}>Document Upload</h3>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>Max 10MB each. PDF, JPG, PNG, DOC accepted.</p>
                {serverDocs.length > 0 && (
                  <div style={{ padding: '10px 14px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, marginBottom: 16, fontSize: 13, color: '#15803d', fontWeight: 600 }}>
                    ✓ {serverDocs.length} document(s) already uploaded.
                  </div>
                )}
                {DOC_CATEGORIES.map(cat => (
                  <div key={cat.label} style={{ marginBottom: 22 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)', marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid var(--border-light)' }}>
                      {cat.label}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      {cat.docs.map(dt => {
                        const serverDoc = serverDocs.find(d => d.document_type === dt.value);
                        const pendingDoc = pendingDocs.find(d => d.type === dt.value);
                        const hasServer = !!serverDoc;
                        const hasPending = !!pendingDoc;
                        const isVerified = serverDoc?.is_verified;
                        return (
                          <div key={dt.value} style={{ border: `2px solid ${hasPending ? '#f59e0b' : hasServer ? '#16a34a' : dt.required ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 10, padding: 12, background: hasPending ? '#fffbeb' : hasServer ? '#f0fdf4' : 'var(--bg)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 20 }}>{hasPending ? '🔄' : hasServer ? '✅' : dt.required ? '📌' : '📎'}</span>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, fontSize: 13 }}>{dt.label}{dt.required && <span style={{ color: 'var(--danger)' }}> *</span>}</div>
                                {hasServer && !hasPending && <div style={{ fontSize: 11, color: isVerified ? '#16a34a' : '#f59e0b', fontWeight: 600 }}>{isVerified ? '✓ Verified' : '⏳ Pending'}</div>}
                                {hasPending && <div style={{ fontSize: 11, color: '#f59e0b', fontWeight: 600 }}>🔄 Ready to upload</div>}
                                {!hasServer && !hasPending && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Not uploaded</div>}
                              </div>
                            </div>
                            {hasServer && !hasPending && (
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button className="btn btn-outline btn-sm" style={{ fontSize: 11, padding: '3px 10px' }} onClick={() => setViewDoc(serverDoc)}>👁 View</button>
                                <label style={{ cursor: 'pointer' }}>
                                  <input type="file" style={{ display: 'none' }} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={e => { if (e.target.files[0]) addDoc(dt.value, e.target.files[0]); e.target.value = ''; }} />
                                  <span className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: '3px 10px' }}>🔁 Replace</span>
                                </label>
                              </div>
                            )}
                            {hasPending && (
                              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                <span style={{ fontSize: 11, color: '#92400e', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pendingDoc.file.name}</span>
                                <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: '3px 8px', color: 'var(--danger)' }} onClick={() => setPendingDocs(d => d.filter(x => x.type !== dt.value))}>✕</button>
                              </div>
                            )}
                            {!hasServer && !hasPending && (
                              <label style={{ cursor: 'pointer' }}>
                                <input type="file" style={{ display: 'none' }} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={e => { if (e.target.files[0]) addDoc(dt.value, e.target.files[0]); e.target.value = ''; }} />
                                <span className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: '3px 10px', display: 'block', textAlign: 'center' }}>📁 Upload</span>
                              </label>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                  <button className="btn btn-ghost" onClick={() => setStep(2)}>← Back</button>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn btn-ghost" onClick={() => setStep(4)}>Skip →</button>
                    <LoadingButton loading={submitting} loadingText="Uploading…" onClick={saveDocuments}>
                      {pendingDocs.length > 0 ? `Upload ${pendingDocs.length} & Next →` : 'Next →'}
                    </LoadingButton>
                  </div>
                </div>
              </div>
            )}

            {/* ── View Document Modal ── */}
            {viewDoc && (
              <div className="modal-overlay" onClick={() => setViewDoc(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="modal" onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: 16, padding: 24, width: '90%', maxWidth: 700, maxHeight: '90vh', overflow: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <span style={{ fontWeight: 700, fontSize: 16 }}>📄 {viewDoc.document_name}</span>
                    <button className="btn btn-ghost btn-sm" onClick={() => setViewDoc(null)}>✕ Close</button>
                  </div>
                  <DocViewer doc={viewDoc} employeeId={selected?.id} />
                </div>
              </div>
            )}

            {/* ── Step 4: Insurance ── */}
            {step === 4 && (
              <div>
                <h3 style={{ marginBottom: 8, fontSize: 17, fontWeight: 700 }}>Insurance Information</h3>
                {insuranceSaved || c.has_insurance ? (
                  <div style={{ textAlign: 'center', padding: '32px 20px' }}>
                    <div style={{ fontSize: 52, marginBottom: 12 }}>✅</div>
                    <h3 style={{ color: 'var(--success)' }}>Insurance Info Submitted!</h3>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 20 }}>
                      <button className="btn btn-ghost" onClick={() => setStep(3)}>← Back</button>
                      <button className="btn btn-primary" onClick={() => setStep(5)}>Continue to Bank Details →</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>Nominee and health details for group insurance enrollment.</p>
                    <div className="form-row">
                      <div className="form-group"><label className="form-label required">Nominee Name</label><input className="form-control" value={insuranceForm.nominee_name} onChange={e => setInsuranceForm(f => ({ ...f, nominee_name: e.target.value }))} /></div>
                      <div className="form-group">
                        <label className="form-label required">Relation</label>
                        <select className="form-control" value={insuranceForm.nominee_relation} onChange={e => setInsuranceForm(f => ({ ...f, nominee_relation: e.target.value }))}>
                          <option value="">Select</option>
                          {RELATIONS.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group"><label className="form-label">Nominee DOB</label><input type="date" className="form-control" value={insuranceForm.nominee_dob} onChange={e => setInsuranceForm(f => ({ ...f, nominee_dob: e.target.value }))} /></div>
                      <div className="form-group"><label className="form-label">Nominee Phone</label><input className="form-control" maxLength={10} value={insuranceForm.nominee_phone} onChange={e => setInsuranceForm(f => ({ ...f, nominee_phone: e.target.value.replace(/\D/g, '') }))} /></div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Blood Group</label>
                        <select className="form-control" value={insuranceForm.blood_group} onChange={e => setInsuranceForm(f => ({ ...f, blood_group: e.target.value }))}>
                          <option value="">Select</option>
                          {BLOOD_GROUPS.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Pre-existing Medical Conditions</label>
                      <textarea className="form-control" rows={3} value={insuranceForm.pre_existing_conditions} onChange={e => setInsuranceForm(f => ({ ...f, pre_existing_conditions: e.target.value }))} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, flexWrap: 'wrap', gap: 10 }}>
                      <button className="btn btn-ghost" onClick={() => setStep(3)}>← Back</button>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button className="btn btn-ghost" onClick={() => { setInsuranceSkipped(true); setStep(5); }}>Skip →</button>
                        <LoadingButton className="btn btn-accent" loading={btnLoading('insurance')} loadingText="Saving…" onClick={saveInsurance}>
                          💾 Save & Submit
                        </LoadingButton>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── Step 5: Bank Details ── */}
            {step === 5 && (
              <div>
                <h3 style={{ marginBottom: 8, fontSize: 17, fontWeight: 700 }}>🏦 Bank Details</h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
                  Employee salary account. HDFC-specific fields are only shown if HDFC Bank is selected.
                </p>
                <div style={{ padding: '10px 14px', background: '#eff6ff', borderRadius: 8, border: '1px solid #bfdbfe', fontSize: 12, color: '#1d4ed8', marginBottom: 16 }}>
                  ℹ️ You can skip and collect later — or fill now to speed up payroll setup.
                </div>

                {bankSkipped ? (
                  <div style={{ textAlign: 'center', padding: '24px 20px', background: 'var(--bg)', border: '1px dashed var(--border)', borderRadius: 12 }}>
                    <div style={{ fontSize: 40, marginBottom: 10 }}>⏭️</div>
                    <p style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Bank details skipped</p>
                    <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={() => setBankSkipped(false)}>Fill bank details</button>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: 16 }}>
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                        <div className="form-group" style={{ gridColumn: '1/-1' }}>
                          <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Bank Name *</label>
                          <select value={bank.bank_name} onChange={e => setBank(b => ({ ...b, bank_name: e.target.value }))} style={inputSt}>
                            <option value="">— Select Bank —</option>
                            {['HDFC Bank', 'State Bank of India', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra Bank', 'Punjab National Bank', 'Bank of Baroda', 'Canara Bank', 'Union Bank of India', 'Yes Bank', 'IndusInd Bank', 'Other'].map(b => (
                              <option key={b} value={b}>{b}</option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group" style={{ gridColumn: '1/-1' }}>
                          <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Account Holder Name</label>
                          <input value={bank.account_holder_name} placeholder="As per bank records" style={inputSt} onChange={e => setBank(b => ({ ...b, account_holder_name: e.target.value }))} />
                        </div>
                        <div className="form-group">
                          <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Account Number *</label>
                          <input value={bank.account_number} placeholder="e.g. 50100012345678" style={inputSt} onChange={e => setBank(b => ({ ...b, account_number: e.target.value }))} />
                        </div>
                        <div className="form-group">
                          <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Account Type</label>
                          <select value={bank.account_type} onChange={e => setBank(b => ({ ...b, account_type: e.target.value }))} style={inputSt}>
                            <option value="savings">Savings</option>
                            <option value="current">Current</option>
                            <option value="salary">Salary</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>IFSC Code *</label>
                          <input value={bank.ifsc_code} placeholder="e.g. HDFC0001234" style={inputSt} onChange={e => setBank(b => ({ ...b, ifsc_code: e.target.value.toUpperCase() }))} />
                        </div>
                        <div className="form-group">
                          <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Branch Name</label>
                          <input value={bank.branch_name} placeholder="e.g. Hyderabad Main" style={inputSt} onChange={e => setBank(b => ({ ...b, branch_name: e.target.value }))} />
                        </div>
                      </div>
                    </div>

                    {/* HDFC-specific — only shown when HDFC is selected */}
                    {bank.bank_name === 'HDFC Bank' && (
                      <div style={{ background: 'var(--bg-card)', border: '1px solid #bfdbfe', borderRadius: 12, padding: 20 }}>
                        <h4 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700 }}>🏦 HDFC Bank — Optional Details</h4>
                        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#1d4ed8' }}>
                          ℹ️ HDFC Customer ID and NetBanking ID help HR set up payroll faster. Both optional.
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                          <div className="form-group">
                            <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>HDFC Customer ID</label>
                            <input value={bank.hdfc_customer_id} placeholder="8-digit customer ID" style={inputSt} onChange={e => setBank(b => ({ ...b, hdfc_customer_id: e.target.value }))} />
                          </div>
                          <div className="form-group">
                            <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>HDFC NetBanking ID</label>
                            <input value={bank.hdfc_netbanking_id} placeholder="NetBanking user ID" style={inputSt} onChange={e => setBank(b => ({ ...b, hdfc_netbanking_id: e.target.value }))} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
                  <button className="btn btn-ghost" onClick={() => setStep(4)}>← Back</button>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {!bankSkipped && (
                      <button className="btn btn-ghost" onClick={() => { setBankSkipped(true); setStep(6); }}>Skip Bank Details →</button>
                    )}
                    {!bankSkipped && (
                      <button onClick={saveBank} disabled={bankSaving} style={{ padding: '9px 20px', background: '#0d5c7a', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                        {bankSaving ? 'Saving…' : '💾 Save & Continue →'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 6: Done / Activate ── */}
            {step === 6 && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 64, marginBottom: 16 }}>{isActive ? '✅' : '🎉'}</div>
                <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>
                  {isActive ? 'Onboarding Updated!' : 'Ready to Activate!'}
                </h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
                  <strong>{selected.name}</strong>{' '}
                  <code style={{ background: 'var(--accent-pale)', padding: '2px 8px', borderRadius: 4 }}>{selected.employee_id}</code>
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, marginBottom: 24, textAlign: 'left' }}>
                  {STEP_CONFIG.map(s => {
                    const done = s.key === 'has_documents'
                      ? (c[s.key] || pendingDocs.length > 0)
                      : s.key === 'has_insurance'
                        ? (c[s.key] || insuranceSaved)
                        : c[s.key];
                    return (
                      <div key={s.key} style={{ padding: '12px 14px', borderRadius: 10, background: done ? '#f0fdf4' : '#fff7ed', border: `1px solid ${done ? '#86efac' : '#fed7aa'}`, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 20 }}>{s.icon}</span>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: done ? '#15803d' : '#92400e' }}>
                            {done ? '✓' : '!'} {s.label}
                          </div>
                          <div style={{ fontSize: 11, color: '#6b7280' }}>{s.desc}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Bank status */}
                <div style={{ padding: '12px 14px', borderRadius: 10, background: !bankSkipped && bank.bank_name ? '#f0fdf4' : '#fff7ed', border: `1px solid ${!bankSkipped && bank.bank_name ? '#86efac' : '#fed7aa'}`, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, textAlign: 'left' }}>
                  <span style={{ fontSize: 20 }}>🏦</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: !bankSkipped && bank.bank_name ? '#15803d' : '#92400e' }}>
                      {!bankSkipped && bank.bank_name ? '✓' : '!'} Bank Details
                    </div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>{bankSkipped ? 'Skipped — collect later' : (bank.bank_name || 'Not collected')}</div>
                  </div>
                </div>

                {insuranceSkipped && !c.has_insurance && (
                  <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 8, background: 'var(--warning-bg)', border: '1px solid var(--warning)', fontSize: 12, color: 'var(--warning)', textAlign: 'left' }}>
                    ⚠ Insurance skipped — HR will receive a follow-up task on activation.
                  </div>
                )}
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button className="btn btn-ghost" onClick={() => setStep(5)}>← Back</button>
                  <button className="btn btn-outline" onClick={closeFlow}>Back to List</button>
                  {isActive ? (
                    <button className="btn btn-primary" onClick={() => navigate(`/employees/${selected.id}`)}>
                      View Employee Profile →
                    </button>
                  ) : (
                    <LoadingButton loading={btnLoading('activate')} loadingText="Activating…" onClick={handleActivate}>
                      🚀 Activate Employee
                    </LoadingButton>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  /* ════════════════════════════════════════════════════════════════════════
     LIST VIEW
  ════════════════════════════════════════════════════════════════════════ */
  return (
    <>
      {/* Confirm dialogs */}
      {emailConfirmTarget && (
        <ConfirmDialog
          title="Send Joining Details Email"
          message={`Send joining details email to ${emailConfirmTarget.name} at ${emailConfirmTarget.personal_email}?`}
          onConfirm={doSendEmail}
          onCancel={() => setEmailConfirmTarget(null)}
        />
      )}
      {taskConfirmTarget && (
        <ConfirmDialog
          title="Assign Profile Completion Task"
          message={`Create a task for ${taskConfirmTarget.name} to fill in their missing profile details? An email will also be sent to their personal email if available.`}
          onConfirm={doCreateTask}
          onCancel={() => setTaskConfirmTarget(null)}
        />
      )}
      {taskResult && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--bg-card,#fff)', borderRadius: 16, padding: '28px 24px', width: '100%', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>📋</div>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Task Created!</h3>
            </div>
            <div style={{ background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
              <p style={{ margin: 0, fontSize: 13, color: '#4c1d95' }}><strong>{taskResult.emp.name}</strong> has been assigned a profile completion task.</p>
              {taskResult.data.missing_fields?.length > 0 && (
                <ul style={{ margin: '8px 0 0', paddingLeft: 20, fontSize: 13, color: '#6b7280' }}>
                  {taskResult.data.missing_fields.map((f, i) => <li key={i}>{f}</li>)}
                </ul>
              )}
              {taskResult.data.email_sent && (
                <p style={{ margin: '8px 0 0', fontSize: 12, color: '#7c3aed' }}>✉️ Email notification sent to personal email.</p>
              )}
            </div>
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setTaskResult(null)}>OK</button>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <h1 className="page-title">Pending Onboarding</h1>
          <p className="page-subtitle">Employees with incomplete onboarding steps — including those already activated but with missing docs or insurance</p>
        </div>

        {!listLoading && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
            <button onClick={() => setFilterStatus('all')} style={{ padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, background: filterStatus === 'all' ? '#0d5c7a' : '#f3f4f6', color: filterStatus === 'all' ? '#fff' : '#374151' }}>
              All ({list.length})
            </button>
            <button onClick={() => setFilterStatus('pending')} style={{ padding: '8px 16px', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 13, background: filterStatus === 'pending' ? '#92400e' : '#fffbeb', color: filterStatus === 'pending' ? '#fff' : '#92400e', border: '1px solid #fcd34d' }}>
              ⏳ Not Yet Activated ({pendingCount})
            </button>
            <button onClick={() => setFilterStatus('active')} style={{ padding: '8px 16px', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 13, background: filterStatus === 'active' ? '#1d4ed8' : '#eff6ff', color: filterStatus === 'active' ? '#fff' : '#1d4ed8', border: '1px solid #93c5fd' }}>
              ✓ Active but Incomplete ({activeIncomplete})
            </button>
          </div>
        )}

        <div style={{ marginBottom: 18 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, employee ID, or department…" style={{ width: '100%', maxWidth: 420, padding: '9px 14px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 13, outline: 'none' }} />
        </div>

        {listLoading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9ca3af' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
            <p style={{ fontWeight: 600 }}>Loading employees…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
            <p style={{ fontWeight: 700, color: '#111827', fontSize: 16, margin: 0 }}>
              {list.length === 0 ? 'All onboardings complete!' : 'No results for this filter'}
            </p>
            <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 6 }}>
              {list.length === 0 ? 'Every employee has completed all onboarding steps.' : 'Try a different search or filter.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(emp => (
              <EmpCard key={emp.id} emp={emp} onResume={openResume} onSendEmail={sendJoiningEmail} onCreateTask={handleCreateTask} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}