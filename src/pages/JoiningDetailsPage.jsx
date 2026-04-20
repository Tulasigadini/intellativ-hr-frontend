import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { onboardingAPI, employeesAPI } from '../services/api';
import { toast } from 'react-toastify';
import { ConfirmDialog } from '../components/layout/Layout';

/* ─── ParsedFieldReview Modal ────────────────────────────────────────────────
   Shown after resume or Form 16 is parsed.
   Employee checks/unchecks each field before applying.
───────────────────────────────────────────────────────────────────────────── */
function ParsedFieldReview({ parsed, source, onAccept, onClose }) {
  const [accepted, setAccepted] = React.useState(() => {
    const init = {};
    Object.entries(parsed).forEach(([k, v]) => {
      if (v && k !== 'work_history') init[k] = true;
    });
    return init;
  });

  const fields = Object.entries(parsed).filter(([k, v]) => v && k !== 'work_history');

  const LABELS = {
    first_name: 'First Name', last_name: 'Last Name', phone: 'Phone',
    personal_email: 'Personal Email', date_of_birth: 'Date of Birth', gender: 'Gender',
    city: 'City', state: 'State', pincode: 'Pincode', address: 'Address',
    employee_name: 'Employee Name (Form 16)', pan_number: 'PAN Number',
    uan_number: 'UAN Number', pf_number: 'PF Number', pf_account_number: 'PF Account Number',
    employer_name: 'Employer', financial_year: 'Financial Year', assessment_year: 'Assessment Year',
    gross_salary: 'Gross Salary', basic_salary: 'Basic Salary', hra: 'HRA',
    special_allowance: 'Special Allowance', total_deductions: 'Total Deductions',
    tds_deducted: 'TDS Deducted', net_taxable_income: 'Net Taxable Income',
    annual_ctc: 'Annual CTC', pf_deduction: 'PF Deduction', ctc: 'Annual CTC',
    basic: 'Basic Salary', pf_contribution: 'PF Contribution',
  };

  const fmtVal = (k, v) => {
    const ctcFields = ['gross_salary', 'basic_salary', 'hra', 'special_allowance',
      'total_deductions', 'tds_deducted', 'net_taxable_income', 'annual_ctc', 'pf_deduction'];
    if (ctcFields.includes(k) && v)
      return `₹${Number(v).toLocaleString('en-IN')}`;
    return String(v);
  };

  const toggleAll = (val) => {
    const next = {};
    fields.forEach(([k]) => { next[k] = val; });
    setAccepted(next);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-card,#fff)', borderRadius: 16, padding: '28px 24px', width: '100%', maxWidth: 520, maxHeight: '85vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>
              {source === 'resume' ? '📄 Resume' : '📑 Form 16'} — Review Extracted Fields
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6b7280' }}>
              Check fields you want to apply. Unchecked fields will be ignored.
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#9ca3af' }}>×</button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <button onClick={() => toggleAll(true)} style={{ padding: '5px 12px', fontSize: 12, background: '#f0fdf4', color: '#15803d', border: '1px solid #86efac', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>✓ Select All</button>
          <button onClick={() => toggleAll(false)} style={{ padding: '5px 12px', fontSize: 12, background: '#f9fafb', color: '#6b7280', border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>✗ Deselect All</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
          {fields.length === 0 ? (
            <p style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No extractable fields found.</p>
          ) : fields.map(([k, v]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: accepted[k] ? '#f0fdf4' : '#fef2f2', border: `1px solid ${accepted[k] ? '#86efac' : '#fca5a5'}` }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>{LABELS[k] || k}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{fmtVal(k, v)}</div>
              </div>
              <button onClick={() => setAccepted(a => ({ ...a, [k]: !a[k] }))}
                style={{
                  padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                  background: accepted[k] ? '#dcfce7' : '#fee2e2',
                  color: accepted[k] ? '#15803d' : '#dc2626', flexShrink: 0
                }}>
                {accepted[k] ? '✓ Accept' : '✕ Decline'}
              </button>
            </div>
          ))}
        </div>

        {source === 'resume' && parsed.work_history?.length > 0 && (
          <div style={{ padding: '10px 12px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, marginBottom: 16, fontSize: 13, color: '#1d4ed8' }}>
            💼 <strong>{parsed.work_history.length} work history record(s)</strong> will also be imported.
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '9px 20px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Decline All</button>
          <button
            onClick={() => onAccept(
              Object.fromEntries(fields.filter(([k]) => accepted[k]).map(([k, v]) => [k, v])),
              source === 'resume' ? parsed.work_history : null
            )}
            style={{ padding: '9px 20px', background: '#0d5c7a', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
            ✅ Apply Selected
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Constants
───────────────────────────────────────────────────────────────────────────── */
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
    label: '🏠 Address Proof (any one)',
    docs: [
      { value: 'utility_bill', label: 'Utility Bill', required: false },
      { value: 'rental_agreement', label: 'Rental Agreement', required: false },
      { value: 'bank_statement_address', label: 'Bank Statement (Address Proof)', required: false },
    ],
  },
  {
    label: '🎓 Educational Documents',
    docs: [
      { value: 'marks_10th', label: '10th Marks Sheet', required: false },
      { value: 'marks_12th', label: '12th Marks Sheet', required: false },
      { value: 'graduation_certificate', label: 'Graduation Certificate', required: false },
      { value: 'postgraduation_certificate', label: 'Post-Graduation Certificate', required: false },
      { value: 'consolidated_marks', label: 'Consolidated Marks / Transcripts', required: false },
    ],
  },
  {
    label: '💼 Employment Documents',
    docs: [
      { value: 'relieving_letter', label: 'Relieving Letter', required: false },
      { value: 'experience_certificate', label: 'Experience Certificate', required: false },
      { value: 'experience_letter', label: 'Experience Letter', required: false },
      { value: 'payslips', label: 'Last 3 Months Payslips', required: false },
      { value: 'form_16', label: 'Form 16 / ITR', required: false },
      { value: 'bank_statement_salary', label: 'Salary Bank Statement (6m)', required: false },
    ],
  },
  {
    label: '📎 Other Documents',
    docs: [
      { value: 'degree', label: 'Degree Certificate', required: false },
      { value: 'offer_letter', label: 'Offer Letter', required: false },
      { value: 'joining_letter', label: 'Joining Letter', required: false },
      { value: 'other', label: 'Other Document', required: false },
    ],
  },
];

const ALL_DOCS = DOC_CATEGORIES.flatMap(c => c.docs);
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const RELATIONS = ['Spouse', 'Father', 'Mother', 'Son', 'Daughter', 'Sibling', 'Other'];

const BLANK_INS = {
  smoking_status: '', nominee_name: '', nominee_relation: '',
  nominee_dob: '', nominee_phone: '', blood_group: '',
  pre_existing_conditions: '', spouse_name: '', spouse_dob: '',
  spouse_gender: '', children: [],
};

const BLANK_WH = {
  company_name: '', designation: '', department: '',
  from_date: '', to_date: '', is_current: false,
  reason_for_leaving: '', last_ctc: '',
};

const TABS = [
  { id: 'overview', label: '📋 Overview' },
  { id: 'profile', label: '👤 My Profile' },
  { id: 'documents', label: '📄 Documents' },
  { id: 'work-history', label: '💼 Work History' },
  { id: 'insurance', label: '🏥 Insurance' },
  { id: 'bank', label: '🏦 Bank Details' },
];

const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';

const inputStyle = {
  width: '100%', padding: '8px 10px', borderRadius: 7,
  border: '1px solid var(--border)', fontSize: 13,
  background: 'var(--bg)', color: 'var(--text-primary)',
  boxSizing: 'border-box',
};

/* ─────────────────────────────────────────────────────────────────────────────
   Main Component
───────────────────────────────────────────────────────────────────────────── */
export default function JoiningDetailsPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const getTabFromURL = useCallback(() => {
    const p = new URLSearchParams(location.search);
    const t = p.get('tab');
    return TABS.find(x => x.id === t) ? t : 'overview';
  }, [location.search]);

  const [activeTab, setActiveTab] = useState(getTabFromURL);

  const setTab = useCallback((id) => {
    setActiveTab(id);
    const p = new URLSearchParams(location.search);
    p.set('tab', id);
    navigate({ search: p.toString() }, { replace: true });
  }, [location.search, navigate]);

  useEffect(() => {
    setActiveTab(getTabFromURL());
  }, [getTabFromURL]);

  /* ── Data state ─────────────────────────────────────────────────────── */
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [jdDeleteTarget, setJdDeleteTarget] = useState(null);

  // Documents
  const [uploading, setUploading] = useState({});
  const [selectedDocType, setSelectedDocType] = useState('');

  // Insurance
  const [ins, setIns] = useState(BLANK_INS);
  const [showSpouse, setShowSpouse] = useState(false);
  const [showChildren, setShowChildren] = useState(false);
  const [newChild, setNewChild] = useState({ name: '', dob: '', gender: '' });
  const [insuranceSaving, setInsuranceSaving] = useState(false);
  const [insuranceSubmitting, setInsuranceSubmitting] = useState(false);

  // Work history
  const [workHistory, setWorkHistory] = useState([]);
  const [whLoading, setWhLoading] = useState(false);
  const [showWHForm, setShowWHForm] = useState(false);
  const [editingWH, setEditingWH] = useState(null);
  const [whForm, setWhForm] = useState(BLANK_WH);
  const [whSaving, setWhSaving] = useState(false);

  /* ── Fetch status ──────────────────────────────────────────────────── */
  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await onboardingAPI.getMyJoiningStatus();
      setStatus(data);
      if (data.insurance) {
        setIns({
          ...BLANK_INS,
          smoking_status: data.insurance.smoking_status || '',
          nominee_name: data.insurance.nominee_name || '',
          nominee_relation: data.insurance.nominee_relation || '',
          blood_group: data.insurance.blood_group || '',
          pre_existing_conditions: data.insurance.pre_existing_conditions || '',
          nominee_dob: data.insurance.nominee_dob || '',
          nominee_phone: data.insurance.nominee_phone || '',
          spouse_name: data.insurance.spouse_name || '',
          spouse_dob: data.insurance.spouse_dob || '',
          spouse_gender: data.insurance.spouse_gender || '',
          children: data.insurance.children || [],
        });
        if (data.insurance.spouse_name) setShowSpouse(true);
        if (data.insurance.children?.length) setShowChildren(true);
      }
    } catch {
      toast.error('Failed to load joining details');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchWorkHistory = useCallback(async (empId) => {
    if (!empId) return;
    setWhLoading(true);
    try {
      const { data } = await onboardingAPI.getWorkHistory(empId);
      setWorkHistory(data);
    } catch {
      toast.error('Failed to load work history');
    } finally {
      setWhLoading(false);
    }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  useEffect(() => {
    if (activeTab === 'work-history' && status?.employee?.id) {
      fetchWorkHistory(status.employee.id);
    }
  }, [activeTab, status?.employee?.id, fetchWorkHistory]);

  /* ── Document Upload ──────────────────────────────────────────────── */
  const handleUpload = async (docType, file) => {
    if (!file) return;
    setUploading(u => ({ ...u, [docType]: true }));
    try {
      await employeesAPI.uploadDocument(status.employee.id, docType, file);
      toast.success('Document uploaded!');
      await fetchStatus();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(u => ({ ...u, [docType]: false }));
    }
  };

  /* ── Insurance ────────────────────────────────────────────────────── */
  const saveInsurance = async () => {
    if (!ins.nominee_name || !ins.nominee_relation) {
      toast.error('Nominee name and relation are required'); return false;
    }
    setInsuranceSaving(true);
    try {
      await onboardingAPI.saveInsurance(status.employee.id, {
        ...ins,
        nominee_dob: ins.nominee_dob || null,
        nominee_phone: ins.nominee_phone || null,
        spouse_name: (showSpouse && ins.spouse_name) ? ins.spouse_name : null,
        spouse_gender: (showSpouse && ins.spouse_gender) ? ins.spouse_gender : null,
        spouse_dob: (showSpouse && ins.spouse_dob) ? ins.spouse_dob : null,
        children: showChildren ? (ins.children || []) : [],
      });
      toast.success('Insurance details saved!');
      await fetchStatus();
      return true;
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Save failed');
      return false;
    } finally {
      setInsuranceSaving(false);
    }
  };

  const submitInsurance = async () => {
    const ok = await saveInsurance();
    if (!ok) return;
    setInsuranceSubmitting(true);
    try {
      await onboardingAPI.submitInsurance(status.employee.id);
      toast.success('✅ Insurance submitted to HR!');
      await fetchStatus();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Submission failed');
    } finally {
      setInsuranceSubmitting(false);
    }
  };

  /* ── Work History ────────────────────────────────────────────────── */
  const openAddWH = () => { setEditingWH(null); setWhForm(BLANK_WH); setShowWHForm(true); };
  const openEditWH = (wh) => {
    setEditingWH(wh);
    setWhForm({
      company_name: wh.company_name || '', designation: wh.designation || '',
      department: wh.department || '', from_date: wh.start_date || '',
      to_date: wh.end_date || '', is_current: wh.is_current || false,
      reason_for_leaving: wh.reason_for_leaving || '', last_ctc: wh.salary || '',
    });
    setShowWHForm(true);
  };
  const closeWHForm = () => { setShowWHForm(false); setEditingWH(null); setWhForm(BLANK_WH); };

  const saveWH = async () => {
    if (!whForm.company_name.trim()) { toast.error('Company name is required'); return; }
    if (!whForm.from_date) { toast.error('Start date is required'); return; }
    setWhSaving(true);
    try {
      const payload = { ...whForm, to_date: whForm.is_current ? null : (whForm.to_date || null), is_intellativ: false };
      if (editingWH) {
        await onboardingAPI.updateWorkHistory(editingWH.id, payload);
        toast.success('Work history updated!');
      } else {
        await onboardingAPI.addWorkHistory(status.employee.id, payload);
        toast.success('Work history added!');
      }
      closeWHForm();
      fetchWorkHistory(status.employee.id);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Save failed');
    } finally {
      setWhSaving(false);
    }
  };

  const deleteWH = async (wh) => {
    if (wh.is_intellativ) { toast.error('You cannot delete your current company record. Contact HR.'); return; }
    setJdDeleteTarget(wh); return;
    try {
      await onboardingAPI.deleteWorkHistory(wh.id);
      toast.success('Deleted');
      fetchWorkHistory(status.employee.id);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Delete failed');
    }
  };

  /* ── Bank Details ────────────────────────────────────────────────── */
  const BLANK_BANK = { bank_name: '', account_holder_name: '', account_number: '', ifsc_code: '', branch_name: '', account_type: 'savings', hdfc_customer_id: '', hdfc_netbanking_id: '' };
  const [bank, setBank] = useState(BLANK_BANK);
  const [bankLoading, setBankLoading] = useState(false);
  const [bankSaving, setBankSaving] = useState(false);
  const [bankLoaded, setBankLoaded] = useState(false);

  const fetchBank = useCallback(async (empId) => {
    if (!empId) return;
    setBankLoading(true);
    try {
      const { data } = await employeesAPI.getBankDetails(empId);
      if (data) setBank({ bank_name: data.bank_name || '', account_holder_name: data.account_holder_name || '', account_number: data.account_number || '', ifsc_code: data.ifsc_code || '', branch_name: data.branch_name || '', account_type: data.account_type || 'savings', hdfc_customer_id: data.hdfc_customer_id || '', hdfc_netbanking_id: data.hdfc_netbanking_id || '' });
      setBankLoaded(true);
    } catch { setBankLoaded(true); }
    finally { setBankLoading(false); }
  }, []);

  useEffect(() => {
    if (activeTab === 'bank' && status?.employee?.id && !bankLoaded) {
      fetchBank(status.employee.id);
    }
  }, [activeTab, status?.employee?.id, bankLoaded, fetchBank]);

  const saveBank = async () => {
    if (!bank.bank_name || !bank.account_number || !bank.ifsc_code) {
      toast.error('Bank name, account number and IFSC are required'); return;
    }
    setBankSaving(true);
    try {
      await employeesAPI.saveBankDetails(status.employee.id, bank);
      toast.success('Bank details saved!');
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Save failed');
    } finally { setBankSaving(false); }
  };

  /* ── Resume Parse ────────────────────────────────────────────────── */
  const [resumeParsing, setResumeParsing] = useState(false);
  const [form16Parsing, setForm16Parsing] = useState(false);
  const [showParsePanel, setShowParsePanel] = useState(false);
  const [parsedData, setParsedData] = useState(null); // {parsed, source}
  const [showParseReview, setShowParseReview] = useState(false);

  /* ── Handle parsed field acceptance (from modal) ───────────────── */
  const handleAcceptParsed = async (accepted, workHistoryRecords) => {
    // For resume: nothing to "save" to profile — profile is view-only for employees.
    // We only import work history records.
    if (workHistoryRecords?.length) {
      let added = 0;
      for (const wh of workHistoryRecords) {
        try {
          await onboardingAPI.addWorkHistory(status.employee.id, {
            company_name: wh.company_name || '', designation: wh.designation || '',
            department: wh.department || '', from_date: wh.from_date || null,
            to_date: wh.is_current ? null : (wh.to_date || null),
            is_current: wh.is_current || false, last_ctc: wh.last_ctc || '', is_intellativ: false,
          });
          added++;
        } catch { }
      }
      if (added > 0) {
        toast.success(`✅ Imported ${added} work history record(s)!`);
        fetchWorkHistory(status.employee.id);
      }
    }
    // For Form 16: just informational — CTC fields are HR-managed, nothing to set on the profile.
    // If any personal fields were extracted, notify employee they are view-only here.
    const personalKeys = ['first_name', 'last_name', 'phone', 'personal_email', 'date_of_birth', 'gender', 'city', 'state', 'pincode'];
    const hasPersonal = Object.keys(accepted).some(k => personalKeys.includes(k));
    if (hasPersonal) {
      toast.info('ℹ️ Personal detail fields are view-only. Contact HR to update them.');
    }
    setShowParseReview(false);
    setParsedData(null);
  };

  /* ── Render guards ──────────────────────────────────────────────── */
  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
      <div className="spinner" style={{ width: 40, height: 40 }} />
    </div>
  );
  if (!status) return (
    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
      Unable to load. Please refresh.
    </div>
  );

  const emp = status.employee;
  const comp = status.completion;
  const uploadedTypes = new Set((status.documents || []).map(d => d.document_type));
  const insuranceSubmitted = status.insurance?.submitted;

  const completionItems = [
    { label: 'Documents Uploaded', done: comp.has_documents },
    { label: 'Insurance Filled', done: comp.has_insurance },
    { label: 'Insurance Submitted', done: comp.insurance_submitted },
  ];
  const doneCnt = completionItems.filter(i => i.done).length;
  const pct = Math.round((doneCnt / completionItems.length) * 100);

  /* ── JSX ────────────────────────────────────────────────────────── */
  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px' }}>

      {/* Parse review modal */}
      {showParseReview && parsedData && (
        <ParsedFieldReview
          parsed={parsedData.parsed}
          source={parsedData.source}
          onAccept={handleAcceptParsed}
          onClose={() => { setShowParseReview(false); setParsedData(null); }}
        />
      )}

      {/* Delete work history confirm */}
      {jdDeleteTarget && (
        <ConfirmDialog
          title="Delete Work History"
          message={`Delete "${jdDeleteTarget.company_name}"? This cannot be undone.`}
          onConfirm={async () => {
            try {
              await onboardingAPI.deleteWorkHistory(jdDeleteTarget.id);
              toast.success('Deleted');
              fetchWorkHistory(status.employee.id);
            } catch (e) {
              toast.error(e?.response?.data?.detail || 'Delete failed');
            } finally { setJdDeleteTarget(null); }
          }}
          onCancel={() => setJdDeleteTarget(null)}
        />
      )}

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>🏢 Joining Details</h1>
        <p style={{ margin: '5px 0 0', color: 'var(--text-muted)', fontSize: 14 }}>
          Welcome, <strong>{emp.first_name}</strong>! Please complete all pending steps below.
        </p>
      </div>

      {/* Progress */}
      <div style={{
        background: pct === 100 ? 'linear-gradient(135deg,#16a34a,#22c55e)' : 'linear-gradient(135deg,#0d5c7a,#1a8cad)',
        borderRadius: 14, padding: '18px 24px', marginBottom: 24, color: 'white',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>
            {pct === 100 ? '✅ All steps complete!' : `Joining Progress — ${pct}%`}
          </span>
          <span style={{ fontSize: 12, opacity: 0.85 }}>{doneCnt}/{completionItems.length} done</span>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.25)', borderRadius: 8, height: 8, overflow: 'hidden' }}>
          <div style={{ background: 'white', height: '100%', width: `${pct}%`, borderRadius: 8, transition: 'width .5s' }} />
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
          {completionItems.map(item => (
            <span key={item.label} style={{ fontSize: 12, opacity: item.done ? 1 : 0.7 }}>
              {item.done ? '✅' : '⬜'} {item.label}
            </span>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, borderBottom: '2px solid var(--border)', marginBottom: 24, overflowX: 'auto' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
            fontWeight: activeTab === t.id ? 700 : 400,
            color: activeTab === t.id ? 'var(--primary)' : 'var(--text-muted)',
            borderBottom: activeTab === t.id ? '2px solid var(--primary)' : '2px solid transparent',
            fontSize: 13, marginBottom: -2, transition: 'all .15s',
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gap: 16 }}>
          <InfoCard title="👤 Your Details">
            <Row label="Name" value={emp.name} />
            <Row label="Employee ID" value={emp.employee_id} />
            <Row label="Company Email" value={emp.email} />
            <Row label="Department" value={emp.department || '—'} />
            <Row label="Role" value={emp.role || '—'} />
            <Row label="Joining Date" value={emp.joining_date || '—'} />
            <Row label="Status" value={<StatusBadge status={emp.status} />} />
          </InfoCard>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(210px,1fr))', gap: 14 }}>
            <ActionCard icon="📄" title="Documents"
              desc={comp.has_documents ? `${comp.document_count} document(s) uploaded` : 'No documents yet'}
              status={comp.has_documents ? 'done' : 'pending'} btnLabel="Upload Documents"
              onAction={() => setTab('documents')} />
            <ActionCard icon="💼" title="Work History"
              desc="Add your previous employment records"
              status="info" btnLabel="Manage Work History"
              onAction={() => setTab('work-history')} />
            <ActionCard icon="🏥" title="Insurance"
              desc={insuranceSubmitted ? 'Submitted to HR ✅' : comp.has_insurance ? 'Saved — not submitted yet' : 'Not filled yet'}
              status={insuranceSubmitted ? 'done' : comp.has_insurance ? 'partial' : 'pending'}
              btnLabel={insuranceSubmitted ? 'View Insurance' : 'Fill Insurance'}
              onAction={() => setTab('insurance')} />
          </div>
          {(!comp.has_documents || !comp.has_insurance) && (
            <div style={{ background: '#fff8e1', border: '1px solid #f59e0b', borderRadius: 10, padding: '14px 18px', fontSize: 13, color: '#92400e' }}>
              ⚠️ <strong>Action Required:</strong> Please complete the pending sections. HR is waiting on these details.
            </div>
          )}
        </div>
      )}

      {/* ── PROFILE (view-only with extraction) ── */}
      {activeTab === 'profile' && (
        <div>
          {/* Extraction panel at top of profile */}
          <div style={{ background: 'linear-gradient(135deg,#f0f9ff,#e0f2fe)', border: '1px solid #7dd3fc', borderRadius: 12, padding: 16, marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0369a1' }}>🤖 Extract from Resume / Form 16</h4>
                <p style={{ margin: '3px 0 0', fontSize: 12, color: '#0369a1', opacity: 0.8 }}>Upload documents to review extracted information. Work history is auto-imported.</p>
              </div>
              <button onClick={() => setShowParsePanel(p => !p)} style={{ padding: '7px 14px', background: '#0369a1', color: 'white', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
                {showParsePanel ? 'Hide ▲' : 'Extract Data ✨'}
              </button>
            </div>
            {showParsePanel && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 16 }}>
                <div style={{ background: 'white', borderRadius: 10, padding: 14, border: '1px solid #bae6fd' }}>
                  <h5 style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 700 }}>📄 Resume (PDF / Image)</h5>
                  <p style={{ margin: '0 0 10px', fontSize: 12, color: '#64748b' }}>Extracts name, phone, email, DOB, city, work history.</p>
                  <label style={{ display: 'block', padding: '9px 14px', background: resumeParsing ? '#9ca3af' : '#0369a1', color: 'white', borderRadius: 7, cursor: resumeParsing ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600, textAlign: 'center' }}>
                    {resumeParsing ? '🤖 Analysing…' : '📁 Upload Resume'}
                    <input type="file" style={{ display: 'none' }} accept=".pdf,.jpg,.jpeg,.png" disabled={resumeParsing}
                      onChange={async (e) => {
                        const f = e.target.files?.[0]; if (!f) return;
                        setResumeParsing(true);
                        try {
                          const { data } = await employeesAPI.parseResume(status.employee.id, f);
                          setParsedData({ parsed: data.parsed, source: 'resume' });
                          setShowParseReview(true);
                        } catch (err) { toast.error('Extraction failed'); }
                        finally { setResumeParsing(false); e.target.value = ''; }
                      }} />
                  </label>
                </div>
                <div style={{ background: 'white', borderRadius: 10, padding: 14, border: '1px solid #bae6fd' }}>
                  <h5 style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 700 }}>📑 Form 16 (PDF / Image)</h5>
                  <p style={{ margin: '0 0 10px', fontSize: 12, color: '#64748b' }}>Extracts PAN, UAN, CTC, TDS, PF, salary breakdown.</p>
                  <label style={{ display: 'block', padding: '9px 14px', background: form16Parsing ? '#9ca3af' : '#7c3aed', color: 'white', borderRadius: 7, cursor: form16Parsing ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600, textAlign: 'center' }}>
                    {form16Parsing ? '🤖 Analysing…' : '📁 Upload Form 16'}
                    <input type="file" style={{ display: 'none' }} accept=".pdf,.jpg,.jpeg,.png" disabled={form16Parsing}
                      onChange={async (e) => {
                        const f = e.target.files?.[0]; if (!f) return;
                        setForm16Parsing(true);
                        try {
                          const { data } = await employeesAPI.parseForm16(status.employee.id, f);
                          try { await employeesAPI.uploadDocument(status.employee.id, 'form_16', f); await fetchStatus(); } catch { }
                          setParsedData({ parsed: data.parsed, source: 'form16' });
                          setShowParseReview(true);
                          toast.success('Form 16 uploaded! Review extracted details.');
                        } catch (err) { toast.error('Extraction failed'); }
                        finally { setForm16Parsing(false); e.target.value = ''; }
                      }} />
                  </label>
                </div>
              </div>
            )}
          </div>

          <div style={{ background: '#e8f5e9', border: '1px solid #4caf50', borderRadius: 8, padding: '10px 16px', marginBottom: 20, fontSize: 13, color: '#2e7d32' }}>
            ℹ️ <strong>View Only:</strong> These details are managed by HR. Contact your HR team if anything is incorrect.
          </div>
          <InfoCard title="Personal Information">
            <Row label="Full Name" value={emp.name} />
            <Row label="Personal Email" value={emp.personal_email || '—'} />
            <Row label="Phone" value={emp.phone ? emp.phone.replace(/^\+91/, '').replace(/^91(?=\d{10}$)/, '') : '—'} />
            <Row label="Gender" value={emp.gender ? cap(emp.gender) : '—'} />
            <Row label="Date of Birth" value={emp.date_of_birth || '—'} />
            <Row label="Address" value={emp.address || '—'} />
            <Row label="City / State" value={[emp.city, emp.state].filter(Boolean).join(', ') || '—'} />
            <Row label="Pincode" value={emp.pincode || '—'} />
          </InfoCard>
          <InfoCard title="Emergency Contact" style={{ marginTop: 16 }}>
            <Row label="Name" value={emp.emergency_contact_name || '—'} />
            <Row label="Phone" value={emp.emergency_contact_phone || '—'} />
          </InfoCard>
          <InfoCard title="Job Information" style={{ marginTop: 16 }}>
            <Row label="Department" value={emp.department || '—'} />
            <Row label="Role" value={emp.role || '—'} />
            <Row label="Joining Date" value={emp.joining_date || '—'} />
            <Row label="Employee Type" value={emp.employee_type || '—'} />
          </InfoCard>
          {(emp.pan_number || emp.uan_number || emp.pf_number) && (
            <InfoCard title="Statutory / Identity Numbers" style={{ marginTop: 16 }}>
              {emp.pan_number && <Row label="PAN Number" value={emp.pan_number} />}
              {emp.uan_number && <Row label="UAN Number" value={emp.uan_number} />}
              {emp.pf_number && <Row label="PF Number" value={emp.pf_number} />}
            </InfoCard>
          )}
        </div>
      )}

      {/* ── DOCUMENTS ── */}
      {activeTab === 'documents' && (
        <div>
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 600 }}>Upload Your Documents</h3>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>
              Accepted: PDF, JPG, JPEG, PNG, DOC, DOCX · Max 10 MB per file
            </p>
          </div>



          {/* Quick upload picker */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 24 }}>
            <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600 }}>Quick Upload</h4>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: '1 1 220px' }}>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Document Type</label>
                <select value={selectedDocType} onChange={e => setSelectedDocType(e.target.value)} style={inputStyle}>
                  <option value="">— Select type —</option>
                  {ALL_DOCS.map(d => (
                    <option key={d.value} value={d.value}>
                      {d.label}{d.required ? ' *' : ''}{uploadedTypes.has(d.value) ? ' ✅' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <label style={{
                padding: '8px 20px',
                background: selectedDocType ? 'var(--primary)' : '#9ca3af',
                color: 'white', borderRadius: 7, fontSize: 13, fontWeight: 600,
                cursor: selectedDocType ? 'pointer' : 'not-allowed',
              }}>
                {uploading[selectedDocType] ? 'Uploading…' : '📁 Choose File'}
                <input type="file" style={{ display: 'none' }} disabled={!selectedDocType}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f && selectedDocType) { handleUpload(selectedDocType, f); e.target.value = ''; }
                  }} />
              </label>
            </div>
          </div>

          {/* Uploaded documents list */}
          {status.documents?.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h4 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 600 }}>Uploaded Documents ({status.documents.length})</h4>
              <div style={{ display: 'grid', gap: 8 }}>
                {status.documents.map(doc => {
                  const meta = ALL_DOCS.find(d => d.value === doc.document_type);
                  return (
                    <div key={doc.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 16px', background: 'var(--bg-card)',
                      border: '1px solid var(--border)', borderRadius: 8,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 22 }}>📄</span>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{meta?.label || doc.document_type}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            Uploaded {new Date(doc.uploaded_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <span style={{
                        padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                        background: doc.is_verified ? '#dcfce7' : '#fff3cd',
                        color: doc.is_verified ? '#16a34a' : '#92400e',
                      }}>
                        {doc.is_verified ? '✅ Verified' : '⏳ Pending Review'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Category checklist */}
          <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600 }}>Document Checklist</h4>
          <div style={{ display: 'grid', gap: 14 }}>
            {DOC_CATEGORIES.map(cat => (
              <div key={cat.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>{cat.label}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(210px,1fr))', gap: 8 }}>
                  {cat.docs.map(doc => {
                    const uploaded = uploadedTypes.has(doc.value);
                    return (
                      <label key={doc.value} style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '8px 10px', borderRadius: 6,
                        cursor: uploaded ? 'default' : 'pointer',
                        background: uploaded ? '#f0fdf4' : 'var(--bg)',
                        border: `1px solid ${uploaded ? '#bbf7d0' : 'var(--border)'}`,
                        fontSize: 12,
                      }}>
                        <span>{uploaded ? '✅' : doc.required ? '🔴' : '⬜'}</span>
                        <span style={{ flex: 1, color: uploaded ? '#166534' : 'var(--text-primary)' }}>
                          {doc.label}{doc.required && !uploaded ? ' *' : ''}
                        </span>
                        {!uploaded && (
                          <>
                            <input type="file" style={{ display: 'none' }} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                              onChange={e => {
                                const f = e.target.files?.[0];
                                if (f) { handleUpload(doc.value, f); e.target.value = ''; }
                              }} />
                            <span style={{ fontSize: 10, padding: '2px 6px', background: 'var(--primary)', color: 'white', borderRadius: 4, flexShrink: 0 }}>
                              {uploading[doc.value] ? '…' : 'Upload'}
                            </span>
                          </>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── WORK HISTORY ── */}
      {activeTab === 'work-history' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Work History</h3>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
                Add your previous employment records. Current company entries are managed by HR.
              </p>
            </div>
            {!showWHForm && (
              <button onClick={openAddWH} style={{
                padding: '9px 18px', background: 'var(--primary)', color: 'white',
                border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
              }}>+ Add Work History</button>
            )}
          </div>

          {/* Add / Edit form */}
          {showWHForm && (
            <div style={{
              background: 'var(--bg-card)', border: '2px solid var(--primary)',
              borderRadius: 12, padding: 22, marginBottom: 20,
            }}>
              <h4 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700 }}>
                {editingWH ? '✏️ Edit Work History' : '➕ Add Work History'}
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <FormField label="Company Name *" style={{ gridColumn: '1/-1' }}>
                  <input value={whForm.company_name} placeholder="Previous company name" style={inputStyle}
                    onChange={e => setWhForm(f => ({ ...f, company_name: e.target.value }))} />
                </FormField>
                <FormField label="Designation / Role">
                  <input value={whForm.designation} placeholder="e.g. Software Engineer" style={inputStyle}
                    onChange={e => setWhForm(f => ({ ...f, designation: e.target.value }))} />
                </FormField>
                <FormField label="Department">
                  <input value={whForm.department} placeholder="e.g. Technology" style={inputStyle}
                    onChange={e => setWhForm(f => ({ ...f, department: e.target.value }))} />
                </FormField>
                <FormField label="Start Date *">
                  <input type="date" value={whForm.from_date} style={inputStyle}
                    onChange={e => setWhForm(f => ({ ...f, from_date: e.target.value }))} />
                </FormField>
                <FormField label={whForm.is_current ? 'End Date (currently working here)' : 'End Date'}>
                  <input type="date" value={whForm.to_date} disabled={whForm.is_current}
                    style={{ ...inputStyle, opacity: whForm.is_current ? 0.5 : 1 }}
                    onChange={e => setWhForm(f => ({ ...f, to_date: e.target.value }))} />
                </FormField>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                    <input type="checkbox" checked={whForm.is_current}
                      onChange={e => setWhForm(f => ({ ...f, is_current: e.target.checked, to_date: '' }))} />
                    I currently work here
                  </label>
                </div>
                <FormField label="Reason for Leaving">
                  <input value={whForm.reason_for_leaving} placeholder="e.g. Better opportunity"
                    disabled={whForm.is_current} style={{ ...inputStyle, opacity: whForm.is_current ? 0.5 : 1 }}
                    onChange={e => setWhForm(f => ({ ...f, reason_for_leaving: e.target.value }))} />
                </FormField>
                <FormField label="Last CTC / Salary">
                  <input value={whForm.last_ctc} placeholder="e.g. 8 LPA" style={inputStyle}
                    onChange={e => setWhForm(f => ({ ...f, last_ctc: e.target.value }))} />
                </FormField>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 18, justifyContent: 'flex-end' }}>
                <button onClick={closeWHForm} style={{
                  padding: '9px 20px', background: 'var(--bg)', border: '1px solid var(--border)',
                  borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                }}>Cancel</button>
                <button onClick={saveWH} disabled={whSaving} style={{
                  padding: '9px 20px', background: 'var(--primary)', color: 'white',
                  border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                }}>
                  {whSaving ? 'Saving…' : editingWH ? '💾 Update' : '✅ Save'}
                </button>
              </div>
            </div>
          )}

          {/* Work history list */}
          {whLoading ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Loading…</div>
          ) : workHistory.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)',
              background: 'var(--bg-card)', border: '1px dashed var(--border)', borderRadius: 12,
            }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>💼</div>
              <p style={{ margin: 0, fontWeight: 600 }}>No work history added yet</p>
              <p style={{ margin: '6px 0 0', fontSize: 13 }}>Click "+ Add Work History" above to get started</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {workHistory.map(wh => (
                <div key={wh.id} style={{
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderRadius: 12, padding: 18,
                  borderLeft: `4px solid ${wh.is_intellativ ? 'var(--primary)' : '#9ca3af'}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: 15 }}>{wh.company_name}</span>
                        {wh.is_intellativ && (
                          <span style={{ padding: '2px 8px', background: '#eff6ff', color: '#1d4ed8', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                            Current Company
                          </span>
                        )}
                        {wh.is_current && !wh.is_intellativ && (
                          <span style={{ padding: '2px 8px', background: '#f0fdf4', color: '#16a34a', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                            Present
                          </span>
                        )}
                      </div>
                      {wh.designation && <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 2 }}>{wh.designation}</div>}
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {wh.start_date} → {wh.is_current || wh.is_intellativ ? 'Present' : (wh.end_date || '—')}
                        {wh.department ? ` · ${wh.department}` : ''}
                        {wh.salary ? ` · CTC: ${wh.salary}` : ''}
                      </div>
                      {wh.reason_for_leaving && (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                          Reason: {wh.reason_for_leaving}
                        </div>
                      )}
                    </div>
                    {!wh.is_intellativ && (
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0, marginLeft: 12 }}>
                        <button onClick={() => openEditWH(wh)} style={{
                          padding: '6px 12px', background: '#eff6ff', color: '#1d4ed8',
                          border: '1px solid #bfdbfe', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                        }}>✏️ Edit</button>
                        <button onClick={() => deleteWH(wh)} style={{
                          padding: '6px 12px', background: '#fef2f2', color: '#dc2626',
                          border: '1px solid #fecaca', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                        }}>🗑 Delete</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── INSURANCE ── */}
      {activeTab === 'insurance' && (
        <div>
          {insuranceSubmitted && (
            <div style={{ background: '#f0fdf4', border: '1px solid #4caf50', borderRadius: 10, padding: '14px 18px', marginBottom: 20, fontSize: 13, color: '#166534' }}>
              ✅ <strong>Submitted:</strong> Your insurance details are with HR. Contact HR if you need changes.
            </div>
          )}
          <div style={{ display: 'grid', gap: 20 }}>

            <FieldGroup title="🏥 Insurance & Health Details">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <FormField label="Smoking Status">
                  <select value={ins.smoking_status} disabled={insuranceSubmitted} style={inputStyle}
                    onChange={e => setIns(i => ({ ...i, smoking_status: e.target.value }))}>
                    <option value="">— Select —</option>
                    <option value="non_smoker">Non-Smoker</option>
                    <option value="smoker">Smoker</option>
                  </select>
                </FormField>
                <FormField label="Blood Group">
                  <select value={ins.blood_group} disabled={insuranceSubmitted} style={inputStyle}
                    onChange={e => setIns(i => ({ ...i, blood_group: e.target.value }))}>
                    <option value="">— Select —</option>
                    {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
                  </select>
                </FormField>
                <FormField label="Pre-existing Conditions" style={{ gridColumn: '1/-1' }}>
                  <textarea value={ins.pre_existing_conditions} rows={2} disabled={insuranceSubmitted}
                    placeholder="Any pre-existing conditions, or type 'None'"
                    style={{ ...inputStyle, resize: 'vertical' }}
                    onChange={e => setIns(i => ({ ...i, pre_existing_conditions: e.target.value }))} />
                </FormField>
              </div>
            </FieldGroup>

            <FieldGroup title="👤 Nominee Details *">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <FormField label="Nominee Full Name *">
                  <input value={ins.nominee_name} disabled={insuranceSubmitted} placeholder="Full name" style={inputStyle}
                    onChange={e => setIns(i => ({ ...i, nominee_name: e.target.value }))} />
                </FormField>
                <FormField label="Relation *">
                  <select value={ins.nominee_relation} disabled={insuranceSubmitted} style={inputStyle}
                    onChange={e => setIns(i => ({ ...i, nominee_relation: e.target.value }))}>
                    <option value="">— Select —</option>
                    {RELATIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </FormField>
                <FormField label="Nominee Date of Birth">
                  <input type="date" value={ins.nominee_dob} disabled={insuranceSubmitted} style={inputStyle}
                    onChange={e => setIns(i => ({ ...i, nominee_dob: e.target.value }))} />
                </FormField>
                <FormField label="Nominee Phone">
                  <input value={ins.nominee_phone} disabled={insuranceSubmitted} placeholder="10-digit mobile" style={inputStyle}
                    onChange={e => setIns(i => ({ ...i, nominee_phone: e.target.value }))} />
                </FormField>
              </div>
            </FieldGroup>

            <FieldGroup title="💑 Spouse Details (Optional)">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', marginBottom: 14 }}>
                <input type="checkbox" checked={showSpouse} disabled={insuranceSubmitted}
                  onChange={e => setShowSpouse(e.target.checked)} />
                Include spouse in insurance coverage
              </label>
              {showSpouse && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <FormField label="Spouse Name">
                    <input value={ins.spouse_name} disabled={insuranceSubmitted} placeholder="Spouse full name" style={inputStyle}
                      onChange={e => setIns(i => ({ ...i, spouse_name: e.target.value }))} />
                  </FormField>
                  <FormField label="Spouse Gender">
                    <select value={ins.spouse_gender} disabled={insuranceSubmitted} style={inputStyle}
                      onChange={e => setIns(i => ({ ...i, spouse_gender: e.target.value }))}>
                      <option value="">— Select —</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </FormField>
                  <FormField label="Spouse Date of Birth">
                    <input type="date" value={ins.spouse_dob} disabled={insuranceSubmitted} style={inputStyle}
                      onChange={e => setIns(i => ({ ...i, spouse_dob: e.target.value }))} />
                  </FormField>
                </div>
              )}
            </FieldGroup>

            <FieldGroup title="👶 Children Details (Optional)">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', marginBottom: 14 }}>
                <input type="checkbox" checked={showChildren} disabled={insuranceSubmitted}
                  onChange={e => setShowChildren(e.target.checked)} />
                Include children in insurance coverage
              </label>
              {showChildren && !insuranceSubmitted && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 10, alignItems: 'flex-end', marginBottom: 12 }}>
                  <FormField label="Child Name">
                    <input value={newChild.name} placeholder="Name" style={inputStyle}
                      onChange={e => setNewChild(c => ({ ...c, name: e.target.value }))} />
                  </FormField>
                  <FormField label="Date of Birth">
                    <input type="date" value={newChild.dob} style={inputStyle}
                      onChange={e => setNewChild(c => ({ ...c, dob: e.target.value }))} />
                  </FormField>
                  <FormField label="Gender">
                    <select value={newChild.gender} style={inputStyle}
                      onChange={e => setNewChild(c => ({ ...c, gender: e.target.value }))}>
                      <option value="">—</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </FormField>
                  <button onClick={() => {
                    if (!newChild.name.trim()) { toast.error('Child name required'); return; }
                    setIns(i => ({ ...i, children: [...(i.children || []), { ...newChild }] }));
                    setNewChild({ name: '', dob: '', gender: '' });
                  }} style={{ padding: '8px 14px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                    + Add
                  </button>
                </div>
              )}
              {(ins.children || []).length > 0 && (
                <div style={{ display: 'grid', gap: 8 }}>
                  {ins.children.map((c, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6 }}>
                      <span style={{ fontSize: 13 }}>
                        👶 {c.name} {c.gender ? `(${cap(c.gender)})` : ''} {c.dob ? `· DOB: ${c.dob}` : ''}
                      </span>
                      {!insuranceSubmitted && (
                        <button onClick={() => setIns(i2 => ({ ...i2, children: i2.children.filter((_, j) => j !== i) }))}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 18 }}>×</button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </FieldGroup>

            {!insuranceSubmitted && (
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button onClick={saveInsurance} disabled={insuranceSaving} style={{
                  padding: '10px 24px', background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)',
                }}>
                  {insuranceSaving ? 'Saving…' : '💾 Save Draft'}
                </button>
                <button onClick={submitInsurance} disabled={insuranceSubmitting || insuranceSaving} style={{
                  padding: '10px 24px', background: '#0d5c7a', color: 'white',
                  border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                }}>
                  {insuranceSubmitting ? 'Submitting…' : '🚀 Submit to HR'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── BANK DETAILS ── */}
      {activeTab === 'bank' && (
        <div>
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>🏦 Bank Details</h3>
            <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>
              Your salary will be credited to this account. HDFC fields are optional.
            </p>
          </div>

          {bankLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>
          ) : (
            <div style={{ display: 'grid', gap: 20 }}>
              <FieldGroup title="Account Information">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <FormField label="Bank Name *" style={{ gridColumn: '1/-1' }}>
                    <select value={bank.bank_name} onChange={e => setBank(b => ({ ...b, bank_name: e.target.value }))} style={inputStyle}>
                      <option value="">— Select Bank —</option>
                      {['HDFC Bank', 'State Bank of India', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra Bank', 'Punjab National Bank', 'Bank of Baroda', 'Canara Bank', 'Union Bank of India', 'Yes Bank', 'IndusInd Bank', 'Other'].map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </FormField>
                  <FormField label="Account Holder Name *" style={{ gridColumn: '1/-1' }}>
                    <input value={bank.account_holder_name} placeholder="As per bank records" style={inputStyle}
                      onChange={e => setBank(b => ({ ...b, account_holder_name: e.target.value }))} />
                  </FormField>
                  <FormField label="Account Number *">
                    <input value={bank.account_number} placeholder="e.g. 50100012345678" style={inputStyle}
                      onChange={e => setBank(b => ({ ...b, account_number: e.target.value }))} />
                  </FormField>
                  <FormField label="Account Type">
                    <select value={bank.account_type} onChange={e => setBank(b => ({ ...b, account_type: e.target.value }))} style={inputStyle}>
                      <option value="savings">Savings</option>
                      <option value="current">Current</option>
                      <option value="salary">Salary</option>
                    </select>
                  </FormField>
                  <FormField label="IFSC Code *">
                    <input value={bank.ifsc_code} placeholder="e.g. HDFC0001234" style={inputStyle}
                      onChange={e => setBank(b => ({ ...b, ifsc_code: e.target.value.toUpperCase() }))} />
                  </FormField>
                  <FormField label="Branch Name">
                    <input value={bank.branch_name} placeholder="e.g. Hyderabad Main Branch" style={inputStyle}
                      onChange={e => setBank(b => ({ ...b, branch_name: e.target.value }))} />
                  </FormField>
                </div>
              </FieldGroup>

              {bank.bank_name === 'HDFC Bank' && (
                <FieldGroup title="HDFC Bank — Optional Details">
                  <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#1d4ed8' }}>
                    ℹ️ These details help HR set up payroll faster. They are optional.
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <FormField label="HDFC Customer ID">
                      <input value={bank.hdfc_customer_id} placeholder="8-digit customer ID" style={inputStyle}
                        onChange={e => setBank(b => ({ ...b, hdfc_customer_id: e.target.value }))} />
                    </FormField>
                    <FormField label="HDFC NetBanking ID">
                      <input value={bank.hdfc_netbanking_id} placeholder="NetBanking user ID" style={inputStyle}
                        onChange={e => setBank(b => ({ ...b, hdfc_netbanking_id: e.target.value }))} />
                    </FormField>
                  </div>
                </FieldGroup>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={saveBank} disabled={bankSaving} style={{
                  padding: '10px 28px', background: '#0d5c7a', color: 'white',
                  border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                }}>
                  {bankSaving ? 'Saving…' : '💾 Save Bank Details'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────────────────────── */
function InfoCard({ title, children, style }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, ...style }}>
      <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700 }}>{title}</h3>
      {children}
    </div>
  );
}
function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
      <span style={{ color: 'var(--text-muted)', minWidth: 160 }}>{label}</span>
      <span style={{ fontWeight: 500, textAlign: 'right' }}>{value}</span>
    </div>
  );
}
function StatusBadge({ status }) {
  const map = {
    active: { bg: '#dcfce7', color: '#16a34a', label: 'Active' },
    pending: { bg: '#fff3cd', color: '#92400e', label: 'Pending' },
    inactive: { bg: '#fee2e2', color: '#dc2626', label: 'Inactive' },
  };
  const s = map[status] || { bg: '#f3f4f6', color: '#6b7280', label: status };
  return <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color }}>{s.label}</span>;
}
function ActionCard({ icon, title, desc, status, btnLabel, onAction }) {
  const colors = {
    done: { bg: '#f0fdf4', border: '#4caf50', badge: '#dcfce7', badgeText: '#16a34a', label: 'Complete' },
    partial: { bg: '#fff8e1', border: '#f59e0b', badge: '#fff3cd', badgeText: '#92400e', label: 'In Progress' },
    pending: { bg: 'var(--bg-card)', border: 'var(--border)', badge: '#fee2e2', badgeText: '#dc2626', label: 'Pending' },
    info: { bg: 'var(--bg-card)', border: 'var(--border)', badge: '#eff6ff', badgeText: '#1d4ed8', label: 'Optional' },
  };
  const c = colors[status] || colors.info;
  return (
    <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 12, padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontSize: 28 }}>{icon}</span>
        <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: c.badge, color: c.badgeText }}>{c.label}</span>
      </div>
      <div>
        <div style={{ fontWeight: 700, fontSize: 15 }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{desc}</div>
      </div>
      <button onClick={onAction} style={{
        padding: '8px 14px',
        background: status === 'done' ? 'transparent' : '#0d5c7a',
        color: status === 'done' ? '#166534' : 'white',
        border: status === 'done' ? '1px solid #4caf50' : 'none',
        borderRadius: 7, cursor: 'pointer', fontSize: 12, fontWeight: 600, alignSelf: 'flex-start',
      }}>{btnLabel}</button>
    </div>
  );
}
function FieldGroup({ title, children }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
      <h4 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700 }}>{title}</h4>
      {children}
    </div>
  );
}
function FormField({ label, children, style }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, ...style }}>
      <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>{label}</label>
      {children}
    </div>
  );
}