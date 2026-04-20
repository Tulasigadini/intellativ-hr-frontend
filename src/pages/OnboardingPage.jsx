import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { employeesAPI, departmentsAPI, rolesAPI, onboardingAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useAsync, useButtonLoading } from '../hooks/useAsync';
import { validateForm, VALIDATORS, useFormErrors } from '../hooks/useValidation';
import LoadingButton from '../components/ui/LoadingButton';
import { ValidatedInput, ValidatedSelect } from '../components/ui/FormField';
import { toast } from 'react-toastify';
import ParsedFieldReview from '../components/ui/ParsedFieldReview';

const STEPS = ['Personal Info', 'Work History', 'Job & Salary', 'Documents', 'Insurance', 'Bank Details', 'Review'];

const DOC_CATEGORIES = [
  {
    label: '🪪 Identity Documents',
    docs: [
      { value: 'aadhar', label: 'Govt ID – Aadhar Card', required: true },
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
      { value: 'utility_bill', label: 'Utility Bill (Electricity/Gas/Rent)', required: false },
      { value: 'rental_agreement', label: 'Rental Agreement', required: false },
      { value: 'bank_statement_address', label: 'Bank Statement with Address', required: false },
    ],
  },
  {
    label: '🎓 Educational Documents',
    docs: [
      { value: 'marks_10th', label: '10th Marks Sheet', required: false },
      { value: 'marks_12th', label: '12th Marks Sheet', required: false },
      { value: 'graduation_certificate', label: 'Graduation / Degree Certificate', required: false },
      { value: 'postgraduation_certificate', label: 'Post-Graduation Certificate', required: false },
      { value: 'consolidated_marks', label: 'Consolidated Marks / Transcripts', required: false },
    ],
  },
  {
    label: '💼 Employment / Experience Documents',
    docs: [
      { value: 'relieving_letter', label: 'Relieving Letter (prev employer)', required: false },
      { value: 'experience_certificate', label: 'Experience Certificate', required: false },
      { value: 'experience_letter', label: 'Experience Letter', required: false },
      { value: 'payslips', label: 'Last 3 Months Payslips', required: false },
      { value: 'form_16', label: 'Form 16 / Income Tax Returns', required: false },
      { value: 'pf_service_history', label: 'PF Service History', required: false },
      { value: 'bank_statement_salary', label: 'Last 6 Months Salary Bank Stmt', required: false },
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

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const RELATIONS = ['Spouse', 'Father', 'Mother', 'Son', 'Daughter', 'Sibling', 'Other'];

const BLANK_FORM = {
  employee_type: 'new',
  first_name: '', last_name: '', personal_email: '', phone: '',
  gender: '', date_of_birth: '', address: '', city: '', state: '', pincode: '',
  emergency_contact_name: '', emergency_contact_phone: '',
  department_id: '', role_id: '', joining_date: '',
  previous_employee_id: '', previous_joining_date: '', previous_relieving_date: '',
  pan_number: '', uan_number: '', pf_number: '',
};

const BLANK_BANK = {
  bank_name: '', account_holder_name: '', account_number: '',
  ifsc_code: '', branch_name: '', account_type: 'savings',
  hdfc_customer_id: '', hdfc_netbanking_id: '',
};

const BLANK_SALARY = {
  ctc: '', basic: '', hra: '', special_allowance: '', pf_contribution: '', bonus: '', in_hand_salary: '',
  effective_date: ''
};

const TEAM_META = {
  IT: { icon: '💻', bg: '#eff6ff', border: '#3b82f6', text: '#1d4ed8' },
  HR: { icon: '👥', bg: '#f0fdf4', border: '#22c55e', text: '#15803d' },
  Admin: { icon: '🏢', bg: '#fdf4ff', border: '#a855f7', text: '#7e22ce' },
  Insurance: { icon: '🏥', bg: '#fff7ed', border: '#f97316', text: '#c2410c' },
  Other: { icon: '📋', bg: 'var(--bg)', border: 'var(--border)', text: 'var(--text)' },
};


export default function OnboardingPage() {
  const navigate = useNavigate();
  const { can } = useAuth();
  const { run: runSubmit, loading: submitting } = useAsync();
  const { run: btnRun, isLoading: btnLoading } = useButtonLoading();
  const activateRef = useRef(false);

  const [step, setStep] = useState(0);
  const [form, setForm] = useState(BLANK_FORM);
  const [existingEmp, setExistingEmp] = useState(null);
  const [checking, setChecking] = useState(false);
  const [hardBlock, setHardBlock] = useState(false);
  const checkTimer = useRef(null);
  const [createdEmployee, setCreatedEmployee] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);
  const [pendingDocs, setPendingDocs] = useState([]);
  const [verifiedDocumentTypes, setVerifiedDocumentTypes] = useState([]);
  const [workHistory, setWorkHistory] = useState([]);
  const [showWHForm, setShowWHForm] = useState(false);
  const [newWH, setNewWH] = useState({
    company_name: '', designation: '', department: '',
    from_date: '', to_date: '', is_current: false,
    reason_for_leaving: '', last_ctc: '',
  });
  const [insuranceForm, setInsuranceForm] = useState({
    smoking_status: '',
    nominee_name: '', nominee_relation: '', nominee_dob: '',
    nominee_phone: '', blood_group: '', pre_existing_conditions: '',
    spouse_name: '', spouse_dob: '', spouse_gender: '',
    children: [],
  });
  const [showSpouse, setShowSpouse] = useState(false);
  const [showChildren, setShowChildren] = useState(false);
  const [newChild, setNewChild] = useState({ name: '', dob: '', gender: '' });
  const [insuranceSaved, setInsuranceSaved] = useState(false);
  const [insuranceSkipped, setInsuranceSkipped] = useState(false);
  const [tasksCreated, setTasksCreated] = useState([]);
  const { errors, setAllErrors, clearAll, clearFieldError } = useFormErrors();

  // ── Bank details state ──
  const [bank, setBank] = useState(BLANK_BANK);
  const [bankSkipped, setBankSkipped] = useState(false);
  const [salary, setSalary] = useState(BLANK_SALARY);

  // ── Resume / Form 16 auto-fill state ──
  const [resumeParsing, setResumeParsing] = useState(false);
  const [form16Parsing, setForm16Parsing] = useState(false);
  const [parsedData, setParsedData] = useState(null);  // { parsed, source }
  const [showParseReview, setShowParseReview] = useState(false);
  const [showAutoFill, setShowAutoFill] = useState(true);

  useEffect(() => {
    departmentsAPI.list().then(r => setDepartments(r.data)).catch(() => { });
  }, []);

  useEffect(() => {
    if (form.department_id)
      rolesAPI.list(form.department_id).then(r => setRoles(r.data)).catch(() => { });
    else setRoles([]);
  }, [form.department_id]);

  const isObjectDifferent = (newObj, oldObj) => {
    if (!oldObj) return true;
    for (let key in newObj) {
      if (newObj[key] !== undefined && newObj[key] !== null && newObj[key] !== '' && newObj[key] !== oldObj[key]) {
        return true;
      }
    }
    return false;
  };

  const autoCheck = useCallback(async (firstName, lastName, email, phone) => {
    const fn = (firstName || '').trim(), ln = (lastName || '').trim();
    const em = (email || '').trim(), ph = (phone || '').replace(/\D/g, '');
    const validName = fn.length >= 2 && ln.length >= 2;
    const validEmail = em.includes('@') && em.split('@')[1]?.includes('.') && em.length >= 6;
    const validPhone = ph.length === 10;
    if (!validName || (!validEmail && !validPhone)) { 
      setExistingEmp(null); 
      setHardBlock(false); 
      return; 
    }
    setChecking(true);
    setHardBlock(false);
    try {
      const { data } = await onboardingAPI.checkExisting({
        first_name: fn, last_name: ln,
        personal_email: validEmail ? em : null,
        phone: validPhone ? ph : null,
      });
      if (data.found) {
        setExistingEmp(data.employee);
        if (data.employee.status === 'active') {
          setHardBlock(true);
          toast.error("Process Blocked: This employee is already active.");
        }
      } else {
        setExistingEmp(null);
      }
    } catch { setExistingEmp(null); }
    finally { setChecking(false); }
  }, []);

  const set = (field, val) => {
    setForm(f => {
      const next = { ...f, [field]: val };
      if (['personal_email', 'phone', 'first_name', 'last_name'].includes(field)) {
        const fn = field === 'first_name' ? val : next.first_name;
        const ln = field === 'last_name' ? val : next.last_name;
        const email = field === 'personal_email' ? val : next.personal_email;
        const phone = field === 'phone' ? val : next.phone;
        const allFilled = fn.trim().length >= 2 && ln.trim().length >= 2 &&
          email.trim().length >= 5 && (phone || '').replace(/\D/g, '').length === 10;
        clearTimeout(checkTimer.current);
        if (allFilled) checkTimer.current = setTimeout(() => autoCheck(fn, ln, email, phone), 1000);
        else setExistingEmp(null);
      }
      return next;
    });
    clearFieldError(field);
  };

  useEffect(() => {
    if (!existingEmp) return;
    const isRejoining = existingEmp.status === 'relieved' || existingEmp.status === 'inactive';
    if (!isRejoining) return;

    // Pre-fill Personal Info
    setForm(f => ({
      ...f,
      employee_type: 'rejoining',
      first_name: existingEmp.first_name || f.first_name,
      last_name: existingEmp.last_name || f.last_name,
      personal_email: existingEmp.personal_email || f.personal_email,
      phone: existingEmp.phone || f.phone,
      gender: existingEmp.gender || '',
      date_of_birth: existingEmp.date_of_birth || '',
      address: existingEmp.address || '',
      city: existingEmp.city || '',
      state: existingEmp.state || '',
      pincode: existingEmp.pincode || '',
      emergency_contact_name: existingEmp.emergency_contact_name || '',
      emergency_contact_phone: existingEmp.emergency_contact_phone || '',
      pan_number: existingEmp.pan_number || '',
      uan_number: existingEmp.uan_number || '',
      pf_number: existingEmp.pf_number || '',
      previous_employee_id: existingEmp.employee_id,
      previous_joining_date: existingEmp.joining_date || '',
      previous_relieving_date: existingEmp.relieving_date || '',
    }));

    // Pre-fill Salary
    if (existingEmp.salary) {
      setSalary(s => ({
        ...s,
        ...existingEmp.salary,
        ctc: existingEmp.salary.ctc || '',
        basic: existingEmp.salary.basic || '',
      }));
    }

    // Pre-fill Bank
    if (existingEmp.bank) {
      setBank(b => ({
        ...b,
        ...existingEmp.bank,
        bank_name: existingEmp.bank.bank_name || '',
        account_number: existingEmp.bank.account_number || '',
      }));
    }

    // Pre-fill Work History
    if (existingEmp.work_history?.length > 0) {
      const mappedWH = existingEmp.work_history.map(wh => ({
        ...wh,
        from_date: wh.from_date || wh.start_date || '',
        to_date: wh.to_date || wh.end_date || '',
        last_ctc: wh.salary || wh.last_ctc || '',
      }));
      setWorkHistory(mappedWH);
    }

    // Pre-fill Insurance
    if (existingEmp.insurance) {
      setInsuranceForm(prev => ({
        ...prev,
        ...existingEmp.insurance,
        nominee_dob: existingEmp.insurance.nominee_dob || '',
        spouse_dob: existingEmp.insurance.spouse_dob || '',
      }));
      setInsuranceSaved(true);
    }

    // Pre-fill Documents
    if (existingEmp.verified_document_types) {
      setVerifiedDocumentTypes(existingEmp.verified_document_types);
    }

    toast.info('Rejoining employee detected. Data from previous tenure has been pre-filled.');
  }, [existingEmp]);

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
    clearAll();
    return true;
  };

  const sendStepEmail = async (stepNum, empId) => {
    try { await onboardingAPI.sendStepEmail({ employee_id: empId, step: stepNum }); } catch { }
  };

  // ── Handle parsed data acceptance ──
  const handleAcceptParsed = (acceptedData) => {
    // acceptedData is { personal: {...}, work_history: [...], salary: {...}, bank: {...}, tax: {...} }
    if (acceptedData.personal) {
      const p = { ...acceptedData.personal };
      // Strip +91 country code from phone
      if (p.phone) {
        p.phone = p.phone.replace(/^\+91/, '').replace(/^91(?=\d{10}$)/, '');
        if (p.phone.length > 10) p.phone = p.phone.slice(-10);
      }
      setForm(f => ({ ...f, ...p }));
    }
    if (acceptedData.work_history) {
      const newRecords = acceptedData.work_history.map(wh => ({
        company_name: wh.company_name || '',
        designation: wh.designation || '',
        department: '',
        from_date: wh.from_date || '',
        to_date: wh.is_current ? '' : (wh.to_date || ''),
        is_current: wh.is_current || false,
        reason_for_leaving: '',
        last_ctc: wh.last_ctc || '',
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
    toast.success('Fields applied! Review and adjust personal, salary, and bank details.');
  };

  const nextStep = async () => {
    if (!validateStep()) return;

    if (step === 3) {
      await runSubmit(async () => {
        const payload = { ...form };
        const isRejoining = existingEmp && (existingEmp.status === 'relieved' || existingEmp.status === 'inactive');
        
        if (isRejoining) {
          payload.employee_type = 'rejoining';
        }
        Object.keys(payload).forEach(k => { if (payload[k] === '') payload[k] = null; });

        let empData;
        if (isRejoining) {
          // Rejoining: Reactivate and Update existing record
          await onboardingAPI.reactivate(existingEmp.id, form.joining_date);
          const { data } = await employeesAPI.update(existingEmp.id, payload);
          empData = data;
        } else {
          // New Employee: Create fresh record
          const { data } = await employeesAPI.create(payload);
          empData = data;
        }
        setCreatedEmployee(empData);

        for (const d of pendingDocs) {
          await employeesAPI.uploadDocument(empData.id, d.type, d.file).catch(() => { });
        }

        // SMART UPDATE: Work History
        // Filter out records that are already present in existingEmp's history
        const existingWH = existingEmp?.work_history || [];
        const normalizeDate = (d) => {
          if (!d) return null;
          try { return new Date(d).toISOString().split('T')[0]; } catch { return d; }
        };

        for (const wh of workHistory) {
          const normFrom = normalizeDate(wh.from_date);
          const isDuplicate = existingWH.some(ex => {
            const exFrom = normalizeDate(ex.from_date || ex.start_date);
            return (
              ex.company_name?.toLowerCase() === wh.company_name?.toLowerCase() &&
              ex.designation?.toLowerCase() === wh.designation?.toLowerCase() &&
              exFrom === normFrom
            );
          });
          if (!isDuplicate) {
            await onboardingAPI.addWorkHistory(empData.id, wh).catch(() => { });
          }
        }

        // SMART UPDATE: Salary
        if (salary.ctc || salary.basic) {
          const hasChanged = isObjectDifferent(salary, existingEmp?.salary);
          if (hasChanged) {
            const cleanedSalary = { ...salary };
            Object.keys(cleanedSalary).forEach(k => { if (cleanedSalary[k] === '') cleanedSalary[k] = null; });
            await employeesAPI.saveSalaryDetails(empData.id, cleanedSalary).catch(err => {
              console.error("Salary save failed:", err);
            });
          }
        }
        await sendStepEmail(3, empData.id);

        try {
          const docsSkipped = pendingDocs.length === 0;
          const res = await onboardingAPI.createOnboardingTasks(empData.id, {
            skipped_insurance: false,
            skipped_docs: docsSkipped,
          });
          setTasksCreated(res.data?.tasks || []);
          toast.success('Profile created! Tasks assigned.');
        } catch {
          toast.success('Profile created!');
        }
        setStep(4);
      }).catch(err => toast.error(err?.response?.data?.detail || 'Failed to create profile'));
      return;
    }
    setStep(s => s + 1);
  };

  const handleActivate = async () => {
    if (!createdEmployee || activateRef.current) return;
    activateRef.current = true;
    await btnRun('activate', async () => {
      // Save bank details if not skipped and has data
      if (!bankSkipped && bank.bank_name && bank.account_number) {
        const hasChanged = isObjectDifferent(bank, existingEmp?.bank);
        if (hasChanged) {
          const cleanedBank = { ...bank };
          Object.keys(cleanedBank).forEach(k => { if (cleanedBank[k] === '') cleanedBank[k] = null; });
          try { await employeesAPI.saveBankDetails(createdEmployee.id, cleanedBank); } catch { }
        }
      }
      // Save salary if not already saved (second chance if edited in review)
      if (salary.ctc || salary.basic) {
        try { await employeesAPI.saveSalaryDetails(createdEmployee.id, salary); } catch { }
      }
      await employeesAPI.activate(createdEmployee.id);
      await sendStepEmail(4, createdEmployee.id);
      await onboardingAPI.requestEmailSetup(createdEmployee.id).catch(() => { });
      try { await onboardingAPI.createActivationTasks(createdEmployee.id); } catch { }
      if (insuranceSkipped) {
        try {
          await onboardingAPI.createOnboardingTasks(createdEmployee.id, {
            skipped_insurance: true, skipped_docs: false,
          });
        } catch { }
      }
      toast.success('Activated! Welcome email sent. Activation tasks assigned.');
      navigate(`/employees/${createdEmployee.id}`);
    }).catch(err => {
      toast.error(err?.response?.data?.detail || 'Activation failed');
      activateRef.current = false;
    });
  };

  const saveInsurance = async () => {
    if (!insuranceForm.nominee_name || !insuranceForm.nominee_relation)
      return toast.error('Fill nominee name and relation');
    await btnRun('insurance', async () => {
      const payload = { ...insuranceForm };
      Object.keys(payload).forEach(k => { if (payload[k] === '') payload[k] = null; });
      await onboardingAPI.saveInsurance(createdEmployee.id, payload);
      await onboardingAPI.submitInsurance(createdEmployee.id);
      setInsuranceSaved(true);
      setInsuranceSkipped(false);
      toast.success('Insurance submitted!');
    }).catch(() => toast.error('Failed to save insurance'));
  };

  const skipInsurance = () => {
    setInsuranceSkipped(true);
    toast.info('Insurance skipped — HR will be assigned a follow-up task on activation.');
    setStep(5);
  };

  const addWH = () => {
    if (!newWH.company_name || !newWH.from_date) { toast.error('Company name and start date are required'); return; }
    setWorkHistory(w => [...w, { ...newWH }]);
    setNewWH({ company_name: '', designation: '', department: '', from_date: '', to_date: '', is_current: false, reason_for_leaving: '', last_ctc: '' });
    setShowWHForm(false);
    toast.success('Work history added');
  };

  const addDoc = (type, file) => {
    if (file.size > 10 * 1024 * 1024) { toast.error('Max 10MB per file'); return; }
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'].includes(ext)) { toast.error(`File type .${ext} not allowed`); return; }
    setPendingDocs(d => [...d.filter(x => x.type !== type), { type, file }]);
  };

  const TeamTasksSummary = () => {
    if (!tasksCreated.length) return null;
    const byTeam = tasksCreated.reduce((acc, t) => {
      const key = t.team || 'Other';
      if (!acc[key]) acc[key] = [];
      acc[key].push(t.task);
      return acc;
    }, {});
    return (
      <div style={{ marginBottom: 20, textAlign: 'left' }}>
        <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, color: 'var(--text)' }}>
          ✅ Tasks auto-assigned to teams:
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(195px,1fr))', gap: 10 }}>
          {Object.entries(byTeam).map(([team, tasks]) => {
            const m = TEAM_META[team] || TEAM_META.Other;
            return (
              <div key={team} style={{ padding: '12px 14px', borderRadius: 10, background: m.bg, border: `1.5px solid ${m.border}` }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: m.text, marginBottom: 6 }}>
                  {m.icon} {team} Team
                </div>
                {tasks.map((t, i) => (
                  <div key={i} style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>• {t}</div>
                ))}
              </div>
            );
          })}
        </div>
        {insuranceSkipped && (
          <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 8, background: 'var(--warning-bg)', border: '1px solid var(--warning)', fontSize: 12, color: 'var(--warning)' }}>
            ⚠ Insurance skipped — HR has been assigned a follow-up task.
          </div>
        )}
      </div>
    );
  };

  const ExistingBanner = () => {
    if (checking) return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--bg)', borderRadius: 8, fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
        <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
        Checking employee records…
      </div>
    );
    if (!existingEmp) return null;
    const isRejoining = existingEmp.status === 'relieved' || existingEmp.status === 'inactive';
    return (
      <div style={{ 
        padding: 16, borderRadius: 12, 
        border: `2px solid ${isRejoining ? '#f59e0b' : '#ef4444'}`, 
        background: isRejoining ? 'var(--warning-bg)' : '#fef2f2', 
        marginBottom: 20 
      }}>
        <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, color: isRejoining ? '#b45309' : '#b91c1c' }}>
          {isRejoining ? '🔄 Rejoining Employee Found' : '❌ Active Employee Already Exists'}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', marginBottom: 10 }}>
          {[['Name', existingEmp.name], ['Employee ID', existingEmp.employee_id], ['Status', existingEmp.status],
          ['Department', existingEmp.department || '—'], ['Role', existingEmp.role || '—'], ['Last Relieving', existingEmp.relieving_date || '—'],
          ].map(([l, v]) => (
            <div key={l} style={{ display: 'flex', gap: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', width: 110, flexShrink: 0 }}>{l}</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{v}</span>
            </div>
          ))}
        </div>
        {isRejoining
          ? <p style={{ fontSize: 12, color: '#d97706', marginTop: 4, fontWeight: 600 }}>✓ This will update and reactivate their existing record.</p>
          : <p style={{ fontSize: 12, color: '#b91c1c', marginTop: 4, fontWeight: 700 }}>⚠ ACCESS BLOCKED: An active account already exists. Duplicates are not allowed.</p>
        }
      </div>
    );
  };

  const inputSt = { width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid var(--border)', fontSize: 13, background: 'var(--bg)', color: 'var(--text-primary)', boxSizing: 'border-box' };

  return (
    <>
      {/* Step Progress */}

      <div style={{ marginBottom: 24 }}>
        <h1 className="page-title">Employee Onboarding</h1>
        <p className="page-subtitle">
          {existingEmp && (existingEmp.status === 'relieved' || existingEmp.status === 'inactive')
            ? '🔄 Rejoining employee detected — fill required details to reactivate'
            : 'Register a new employee'}
        </p>
      </div>

      <div className="steps" style={{ overflowX: 'auto', paddingBottom: 8 }}>
        {STEPS.map((label, i) => {
          const isPast = i < step;
          const isCurrent = i === step;
          let statusClass = isCurrent ? 'active' : isPast ? 'done' : '';
          let isSkipped = false;

          if (isPast) {
            if (i === 1 && workHistory.length === 0) isSkipped = true;
            if (i === 4 && insuranceSkipped) isSkipped = true;
            if (i === 5 && bankSkipped) isSkipped = true;
          }

          if (isSkipped) statusClass = 'skipped';

          return (
            <React.Fragment key={i}>
              <div className="step-wrap">
                <div className={`step-circle ${statusClass}`}>
                  {isSkipped ? '⏭️' : (isPast ? '✓' : i + 1)}
                </div>
                <div className={`step-label ${statusClass}`}>{label}</div>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`step-line ${isPast ? (isSkipped ? 'skipped' : 'done') : ''}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      <div className="card" style={{ maxWidth: 820, margin: '0 auto' }}>

        {/* ── Step 0: Personal Info ── */}
        {step === 0 && (
          <div>
            <h3 style={{ marginBottom: 4, fontSize: 17, fontWeight: 700 }}>Personal Information</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
              Enter employee details — or use the auto-fill feature to extract from a resume.
            </p>

            {/* Auto-fill panel */}
            <div style={{ background: 'linear-gradient(135deg,#f0f9ff,#e0f2fe)', border: '1px solid #7dd3fc', borderRadius: 12, padding: 16, marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0369a1' }}>🤖 Auto-fill from Resume / Form 16</h4>
                  <p style={{ margin: '3px 0 0', fontSize: 12, color: '#0369a1', opacity: 0.8 }}>
                    Upload resume to auto-fill personal details &amp; work history. Form 16 for CTC/tax info (optional).
                  </p>
                </div>
                <button onClick={() => setShowAutoFill(v => !v)} style={{ padding: '7px 14px', background: '#0369a1', color: 'white', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
                  {showAutoFill ? 'Hide ▲' : 'Auto-fill ✨'}
                </button>
              </div>

              {showAutoFill && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 16 }}>
                  {/* Resume */}
                  <div style={{ background: 'white', borderRadius: 10, padding: 14, border: '1px solid #bae6fd' }}>
                    <h5 style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 700 }}>📄 Resume (PDF / Image)</h5>
                    <p style={{ margin: '0 0 10px', fontSize: 12, color: '#64748b' }}>Extracts name, phone, email, DOB, city, work history.</p>
                    <label style={{ display: 'block', padding: '9px 14px', background: resumeParsing ? '#9ca3af' : '#0369a1', color: 'white', borderRadius: 7, cursor: resumeParsing ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600, textAlign: 'center' }}>
                      {resumeParsing ? '🤖 Analysing Resume…' : '📁 Upload Resume'}
                      <input type="file" style={{ display: 'none' }} accept=".pdf,.jpg,.jpeg,.png" disabled={resumeParsing}
                        onChange={async (e) => {
                          const f = e.target.files?.[0]; if (!f) return;
                          setResumeParsing(true);
                          try {
                            const { data } = await employeesAPI.publicExtract(f, 'resume');
                            setParsedData(data.data);
                            setShowParseReview(true);
                          } catch (err) {
                            toast.error('Extraction failed');
                          } finally { setResumeParsing(false); e.target.value = ''; }
                        }} />
                    </label>
                  </div>

                  {/* Form 16 */}
                  <div style={{ background: 'white', borderRadius: 10, padding: 14, border: '1px solid #bae6fd' }}>
                    <h5 style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 700 }}>📑 Form 16 (PDF / Image)</h5>
                    <p style={{ margin: '0 0 10px', fontSize: 12, color: '#64748b' }}>Extracts name, PAN, income, allowances, PF, tax deducted.</p>
                    <label style={{ display: 'block', padding: '9px 14px', background: form16Parsing ? '#9ca3af' : '#0369a1', color: 'white', borderRadius: 7, cursor: form16Parsing ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600, textAlign: 'center' }}>
                      {form16Parsing ? '🤖 Analysing Form 16…' : '📁 Upload Form 16'}
                      <input type="file" style={{ display: 'none' }} accept=".pdf,.jpg,.jpeg,.png" disabled={form16Parsing}
                        onChange={async (e) => {
                          const f = e.target.files?.[0]; if (!f) return;
                          setForm16Parsing(true);
                          try {
                            const { data } = await employeesAPI.publicExtract(f, 'form16');
                            setParsedData(data.data);
                            setShowParseReview(true);
                          } catch (err) {
                            toast.error('Extraction failed');
                          } finally { setForm16Parsing(false); e.target.value = ''; }
                        }} />
                    </label>
                  </div>
                </div>
              )}
            </div>

            <ExistingBanner />
            <div className="form-row">
              <ValidatedInput label="First Name" required value={form.first_name} error={errors.first_name} onChange={e => set('first_name', e.target.value)} placeholder="e.g. Tulasi" />
              <ValidatedInput label="Last Name" required value={form.last_name} error={errors.last_name} onChange={e => set('last_name', e.target.value)} placeholder="e.g. Gadini" />
            </div>
            <div className="form-row">
              <ValidatedInput label="Personal Email" required type="email" value={form.personal_email} error={errors.personal_email} onChange={e => set('personal_email', e.target.value)} placeholder="personal@gmail.com" hint="Welcome email sent here" />
              <ValidatedInput label="Phone" required value={form.phone} error={errors.phone} onChange={e => set('phone', e.target.value.replace(/\D/g, ''))} placeholder="10-digit mobile" maxLength={10} />
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
            {existingEmp && (existingEmp.status === 'relieved' || existingEmp.status === 'inactive') && (
              <div style={{ marginTop: 16, padding: 16, background: 'var(--accent-pale)', borderRadius: 10, border: '1px solid var(--accent)' }}>
                <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 12, color: 'var(--primary)' }}>🔄 Rejoining Details</p>
                <div className="form-row">
                  <ValidatedInput label="Previous Joining Date" type="date" value={form.previous_joining_date} onChange={e => set('previous_joining_date', e.target.value)} />
                  <ValidatedInput label="Previous Relieving Date" type="date" value={form.previous_relieving_date} onChange={e => set('previous_relieving_date', e.target.value)} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Step 1: Work History ── */}
        {step === 1 && (
          <div>
            <h3 style={{ marginBottom: 8, fontSize: 17, fontWeight: 700 }}>Work History</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>Add previous employment. Skip for freshers.</p>
            {workHistory.map((wh, i) => (
              <div key={i} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{wh.designation || 'Role'} @ {wh.company_name}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                    {wh.from_date} → {wh.is_current ? 'Present' : (wh.to_date || '—')}
                    {wh.last_ctc && <span style={{ marginLeft: 12 }}>💰 {wh.last_ctc}</span>}
                  </div>
                </div>
                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => setWorkHistory(w => w.filter((_, j) => j !== i))}>✕</button>
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
              <p style={{ marginTop: 16, fontSize: 13, color: 'var(--text-muted)' }}>No work history added. Click Next to skip (freshers).</p>
            )}
          </div>
        )}

        {/* ── Step 2: Job Details ── */}
        {step === 2 && (
          <div>
            <h3 style={{ marginBottom: 24, fontSize: 17, fontWeight: 700 }}>{existingEmp ? '🔄 New Role Details (Rejoining)' : 'Job Details'}</h3>
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
                  <input type="number" className="form-control" value={salary.ctc} onChange={e => setSalary(s => ({ ...s, ctc: e.target.value }))} placeholder="e.g. 1200000" />
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
                <div className="form-group">
                  <label className="form-label">PF Contribution (₹)</label>
                  <input type="number" className="form-control" value={salary.pf_contribution} onChange={e => setSalary(s => ({ ...s, pf_contribution: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Bonus / Variable (₹)</label>
                  <input type="number" className="form-control" value={salary.bonus} onChange={e => setSalary(s => ({ ...s, bonus: e.target.value }))} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 3: Documents ── */}
        {step === 3 && (
          <div>
            <h3 style={{ marginBottom: 8, fontSize: 17, fontWeight: 700 }}>Document Upload</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>Max 10MB each. PDF, JPG, PNG, DOC accepted.</p>
            <div style={{ padding: '10px 14px', background: '#eff6ff', borderRadius: 8, border: '1px solid #3b82f6', fontSize: 12, color: '#1d4ed8', marginBottom: 20 }}>
              💡 Completing this step auto-assigns tasks to: <strong>IT</strong>, <strong>HR</strong>, <strong>Admin</strong> teams.
            </div>
            {DOC_CATEGORIES.map(cat => (
              <div key={cat.label} style={{ marginBottom: 22 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)', marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid var(--border-light)' }}>
                  {cat.label}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {cat.docs.map(dt => {
                    const isVerified = verifiedDocumentTypes.includes(dt.value);
                    const ex = pendingDocs.find(d => d.type === dt.value);
                    
                    return (
                      <label key={dt.value} style={{ 
                        border: isVerified ? '2px solid #86efac' : `2px dashed ${ex ? 'var(--success)' : dt.required ? 'var(--accent)' : 'var(--border)'}`, 
                        borderRadius: 10, padding: 14, cursor: isVerified ? 'default' : 'pointer', 
                        background: isVerified ? '#f0fdf4' : ex ? 'var(--success-bg)' : 'var(--bg)', 
                        display: 'flex', alignItems: 'center', gap: 12 
                      }}>
                        {!isVerified && <input type="file" style={{ display: 'none' }} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={e => { if (e.target.files[0]) addDoc(dt.value, e.target.files[0]); e.target.value = ''; }} />}
                        <span style={{ fontSize: 24 }}>{isVerified ? '🔒' : ex ? '✅' : dt.required ? '📌' : '📎'}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
                            <span>{dt.label}{dt.required && !isVerified && <span style={{ color: 'var(--danger)' }}> *</span>}</span>
                            {isVerified && <span style={{ fontSize: 10, background: '#dcfce7', color: '#166534', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>VERIFIED</span>}
                          </div>
                          <div style={{ fontSize: 11, color: isVerified ? '#166534' : ex ? 'var(--success)' : 'var(--text-muted)' }}>
                            {isVerified ? 'Archive record preserved' : ex ? `✓ ${ex.file.name}` : 'Click to upload'}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
            {pendingDocs.length === 0 && (
              <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 8, background: 'var(--warning-bg)', border: '1px solid var(--warning)', fontSize: 12, color: 'var(--warning)' }}>
                ⚠ No documents uploaded — HR will receive a task to collect documents separately.
              </div>
            )}
          </div>
        )}

        {/* ── Step 4: Insurance ── */}
        {step === 4 && (
          <div>
            <h3 style={{ marginBottom: 8, fontSize: 17, fontWeight: 700 }}>Insurance Information</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>Nominee and family details for group insurance enrollment.</p>
            <div style={{ padding: '10px 14px', background: '#fff7ed', borderRadius: 8, border: '1px solid #f97316', fontSize: 12, color: '#c2410c', marginBottom: 20 }}>
              🏥 Submitting auto-creates tasks for the <strong>Insurance</strong> and <strong>HR</strong> teams.<br />
              ⚠ Skipping will assign a follow-up task to HR.
            </div>
            {insuranceSaved ? (
              <div style={{ textAlign: 'center', padding: '32px 20px' }}>
                <div style={{ fontSize: 52, marginBottom: 12 }}>✅</div>
                <h3 style={{ color: 'var(--success)' }}>Insurance Info Submitted!</h3>
                <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={() => setStep(5)}>Continue to Bank Details →</button>
              </div>
            ) : (
              <>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)', marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid var(--border-light)' }}>👤 Employee Details</div>
                <div className="form-row" style={{ marginBottom: 16 }}>
                  <div className="form-group">
                    <label className="form-label required">Smoking Status</label>
                    <select className="form-control" value={insuranceForm.smoking_status} onChange={e => setInsuranceForm(f => ({ ...f, smoking_status: e.target.value }))}>
                      <option value="">Select</option>
                      <option value="non_smoker">Non-Smoker</option>
                      <option value="smoker">Smoker</option>
                    </select>
                  </div>
                </div>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)', marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid var(--border-light)' }}>🏷 Nominee Details</div>
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
                  <textarea className="form-control" rows={2} placeholder="e.g. Diabetes (or leave blank)" value={insuranceForm.pre_existing_conditions} onChange={e => setInsuranceForm(f => ({ ...f, pre_existing_conditions: e.target.value }))} />
                </div>
                <div style={{ marginTop: 20, marginBottom: 10 }}>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowSpouse(s => !s)} style={{ fontSize: 13 }}>
                    {showSpouse ? '▾' : '▸'} Spouse Details <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(Optional)</span>
                  </button>
                </div>
                {showSpouse && (
                  <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
                    <div className="form-row">
                      <div className="form-group"><label className="form-label">Spouse Name</label><input className="form-control" value={insuranceForm.spouse_name} onChange={e => setInsuranceForm(f => ({ ...f, spouse_name: e.target.value }))} /></div>
                      <div className="form-group"><label className="form-label">Spouse DOB</label><input type="date" className="form-control" value={insuranceForm.spouse_dob} onChange={e => setInsuranceForm(f => ({ ...f, spouse_dob: e.target.value }))} /></div>
                    </div>
                  </div>
                )}
                <div style={{ marginBottom: 10 }}>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowChildren(s => !s)} style={{ fontSize: 13 }}>
                    {showChildren ? '▾' : '▸'} Children Details <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(Optional)</span>
                  </button>
                </div>
                {showChildren && (
                  <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
                    {insuranceForm.children.map((child, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--success-bg)', border: '1px solid var(--success)', borderRadius: 8, marginBottom: 8 }}>
                        <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{child.name}</span>
                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)', padding: '2px 8px' }} onClick={() => setInsuranceForm(f => ({ ...f, children: f.children.filter((_, j) => j !== i) }))}>✕</button>
                      </div>
                    ))}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 10, alignItems: 'end', marginTop: 8 }}>
                      <div className="form-group" style={{ margin: 0 }}><label className="form-label" style={{ fontSize: 12 }}>Child Name</label><input className="form-control" placeholder="Name" value={newChild.name} onChange={e => setNewChild(c => ({ ...c, name: e.target.value }))} /></div>
                      <div className="form-group" style={{ margin: 0 }}><label className="form-label" style={{ fontSize: 12 }}>Date of Birth</label><input type="date" className="form-control" value={newChild.dob} onChange={e => setNewChild(c => ({ ...c, dob: e.target.value }))} /></div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: 12 }}>Gender</label>
                        <select className="form-control" value={newChild.gender} onChange={e => setNewChild(c => ({ ...c, gender: e.target.value }))}>
                          <option value="">Select</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                        </select>
                      </div>
                      <button className="btn btn-primary btn-sm" style={{ height: 38 }} onClick={() => { if (!newChild.name.trim()) return; setInsuranceForm(f => ({ ...f, children: [...f.children, { ...newChild }] })); setNewChild({ name: '', dob: '', gender: '' }); }}>+ Add</button>
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 16 }}>
                  <LoadingButton className="btn btn-accent" loading={btnLoading('insurance')} loadingText="Saving…" onClick={saveInsurance}>
                    💾 Save & Submit to Insurance Team
                  </LoadingButton>
                  <button className="btn btn-ghost" onClick={skipInsurance}>Skip for now →</button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Step 5: Bank Details ── */}
        {step === 5 && createdEmployee && (
          <div>
            <h3 style={{ marginBottom: 8, fontSize: 17, fontWeight: 700 }}>🏦 Bank Details</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
              Employee's salary account details. HDFC-specific fields are optional.
            </p>
            <div style={{ padding: '10px 14px', background: '#eff6ff', borderRadius: 8, border: '1px solid #bfdbfe', fontSize: 13, color: '#1d4ed8', marginBottom: 20 }}>
              ℹ️ <strong>BANK REQUIREMENT:</strong> Please enter ONLY <strong>HDFC Bank</strong> details here. If you are using any other bank account for salary, please skip this step and click "Next".
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
                  <h4 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700 }}>Account Information</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div className="form-group" style={{ gridColumn: '1/-1' }}>
                      <label className="form-label">Bank Name</label>
                      <select value={bank.bank_name} onChange={e => setBank(b => ({ ...b, bank_name: e.target.value }))} style={inputSt}>
                        <option value="">— Select Bank —</option>
                        {['HDFC Bank', 'State Bank of India', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra Bank', 'Punjab National Bank', 'Bank of Baroda', 'Canara Bank', 'Union Bank of India', 'Yes Bank', 'IndusInd Bank', 'Other'].map(b => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group" style={{ gridColumn: '1/-1' }}>
                      <label className="form-label">Account Holder Name</label>
                      <input value={bank.account_holder_name} placeholder="As per bank records" style={inputSt} onChange={e => setBank(b => ({ ...b, account_holder_name: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Account Number</label>
                      <input value={bank.account_number} placeholder="e.g. 50100012345678" style={inputSt} onChange={e => setBank(b => ({ ...b, account_number: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Account Type</label>
                      <select value={bank.account_type} onChange={e => setBank(b => ({ ...b, account_type: e.target.value }))} style={inputSt}>
                        <option value="savings">Savings</option>
                        <option value="current">Current</option>
                        <option value="salary">Salary</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">IFSC Code</label>
                      <input value={bank.ifsc_code} placeholder="e.g. HDFC0001234" style={inputSt} onChange={e => setBank(b => ({ ...b, ifsc_code: e.target.value.toUpperCase() }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Branch Name</label>
                      <input value={bank.branch_name} placeholder="e.g. Hyderabad Main" style={inputSt} onChange={e => setBank(b => ({ ...b, branch_name: e.target.value }))} />
                    </div>
                  </div>
                </div>

                {/* HDFC-specific fields — only shown if HDFC selected */}
                {bank.bank_name === 'HDFC Bank' && (
                  <div style={{ background: 'var(--bg-card)', border: '1px solid #bfdbfe', borderRadius: 12, padding: 20 }}>
                    <h4 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700 }}>🏦 HDFC Bank — Optional Details</h4>
                    <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#1d4ed8' }}>
                      ℹ️ These HDFC-specific details help HR set up payroll faster. Both are optional.
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      <div className="form-group">
                        <label className="form-label">HDFC Customer ID</label>
                        <input value={bank.hdfc_customer_id} placeholder="8-digit customer ID" style={inputSt} onChange={e => setBank(b => ({ ...b, hdfc_customer_id: e.target.value }))} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">HDFC NetBanking ID</label>
                        <input value={bank.hdfc_netbanking_id} placeholder="NetBanking user ID" style={inputSt} onChange={e => setBank(b => ({ ...b, hdfc_netbanking_id: e.target.value }))} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Step 6: Review & Activate ── */}
        {step === 6 && createdEmployee && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
            <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Profile Created!</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
              {existingEmp ? '🔄 Rejoining — ' : ''}<strong>{createdEmployee.first_name} {createdEmployee.last_name}</strong>{' '}
              <code style={{ background: 'var(--accent-pale)', padding: '2px 8px', borderRadius: 4 }}>{createdEmployee.employee_id}</code>
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 24, textAlign: 'left', padding: 20, background: 'var(--bg)', borderRadius: 10 }}>
              {[
                ['Company Email', createdEmployee.email],
                ['Department', createdEmployee.department?.name || '—'],
                ['Role', createdEmployee.role?.name || '—'],
                ['Joining Date', createdEmployee.joining_date || '—'],
                ['Type', createdEmployee.employee_type],
                ['Docs', `${pendingDocs.length} uploaded`],
              ].map(([l, v]) => (
                <div key={l}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>{l}</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{v}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 24 }}>
              {[
                { icon: '📧', label: 'Welcome Email', desc: 'Sent to personal email', done: true },
                { icon: '💻', label: 'Email Setup', desc: 'Task → IT team', done: true },
                { icon: '🏥', label: 'Insurance', desc: insuranceSaved ? 'Submitted' : insuranceSkipped ? 'Skipped — HR task' : 'Pending', done: insuranceSaved, warn: insuranceSkipped },
                { icon: '🏦', label: 'Bank Details', desc: bankSkipped ? 'Skipped — fill later' : (bank.bank_name ? `${bank.bank_name}` : 'Not collected'), done: !bankSkipped && !!bank.bank_name, warn: bankSkipped },
              ].map(item => (
                <div key={item.label} style={{ padding: '14px 12px', background: item.done ? 'var(--success-bg)' : item.warn ? 'var(--warning-bg)' : 'var(--bg)', border: `1px solid ${item.done ? 'var(--success)' : item.warn ? 'var(--warning)' : 'var(--border)'}`, borderRadius: 10, textAlign: 'center' }}>
                  <div style={{ fontSize: 24, marginBottom: 4 }}>{item.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{item.label}</div>
                  <div style={{ fontSize: 11, color: item.done ? 'var(--success)' : item.warn ? 'var(--warning)' : 'var(--text-muted)', marginTop: 2 }}>{item.desc}</div>
                </div>
              ))}
            </div>

            <TeamTasksSummary />

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="btn btn-outline" onClick={() => navigate('/tasks')}>📋 View Tasks</button>
              <button className="btn btn-ghost" onClick={() => navigate('/employees')}>View All Employees</button>
              <LoadingButton loading={btnLoading('activate')} loadingText="Activating…" onClick={handleActivate}>
                🚀 Activate Employee
              </LoadingButton>
            </div>
          </div>
        )}

        {/* Footer Nav */}
        {step < 6 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32, paddingTop: 20, borderTop: '1px solid var(--border-light)' }}>
            <button className="btn btn-ghost" onClick={() => { clearAll(); setStep(s => s - 1); }} disabled={step === 0}>← Back</button>
            <div style={{ display: 'flex', gap: 10 }}>
              {/* Bank step skip option */}
              {step === 5 && !bankSkipped && (
                <button className="btn btn-ghost" onClick={() => { setBankSkipped(true); setStep(6); }}>
                  Skip Bank Details →
                </button>
              )}
              {step === 4 && insuranceSaved
                ? <button className="btn btn-primary" onClick={() => setStep(5)}>Continue to Bank Details →</button>
                : step < 4
                  ? <LoadingButton loading={submitting} disabled={hardBlock} loadingText="Processing…" onClick={nextStep}>{step === 3 ? 'Create Profile →' : 'Next →'}</LoadingButton>
                  : step === 5
                    ? <button className="btn btn-primary" onClick={() => setStep(6)}>Continue to Review →</button>
                    : null
              }
            </div>
          </div>
        )}

        {showParseReview && (
          <ParsedFieldReview
            data={parsedData}
            currentData={{ personal: form, work_history: workHistory, salary, bank, tax: {} }}
            onAccept={handleAcceptParsed}
            onClose={() => { setShowParseReview(false); setParsedData(null); }}
          />
        )}
      </div>
    </>
  );
}