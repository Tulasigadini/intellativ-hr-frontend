import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { employeesAPI, departmentsAPI, rolesAPI, onboardingAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useAsync, useButtonLoading } from '../hooks/useAsync';
import { validateForm, VALIDATORS, useFormErrors } from '../hooks/useValidation';
import LoadingButton from '../components/ui/LoadingButton';
import { ValidatedInput, ValidatedSelect } from '../components/ui/FormField';
import { toast } from 'react-toastify';

const STEPS = ['Personal Info', 'Work History', 'Job Details', 'Documents', 'Insurance', 'Review'];

const DOC_CATEGORIES = [
  {
    label: '🪪 Identity Documents',
    docs: [
      { value: 'aadhar',           label: 'Govt ID – Aadhar Card',     required: true  },
      { value: 'pan',              label: 'PAN Card',                   required: true  },
      { value: 'passport_photo',   label: 'Passport Size Photo',        required: true  },
      { value: 'voter_id',         label: 'Voter ID',                   required: false },
      { value: 'driving_license',  label: 'Driving License',            required: false },
      { value: 'passport',         label: 'Passport',                   required: false },
    ],
  },
  {
    label: '🏠 Address Proof (any one)',
    docs: [
      { value: 'utility_bill',           label: 'Utility Bill (Electricity/Gas/Rent)', required: false },
      { value: 'rental_agreement',       label: 'Rental Agreement',                    required: false },
      { value: 'bank_statement_address', label: 'Bank Statement with Address',         required: false },
    ],
  },
  {
    label: '🎓 Educational Documents',
    docs: [
      { value: 'marks_10th',                label: '10th Marks Sheet',              required: false },
      { value: 'marks_12th',                label: '12th Marks Sheet',              required: false },
      { value: 'graduation_certificate',    label: 'Graduation / Degree Certificate', required: false },
      { value: 'postgraduation_certificate',label: 'Post-Graduation Certificate',   required: false },
      { value: 'consolidated_marks',        label: 'Consolidated Marks / Transcripts', required: false },
    ],
  },
  {
    label: '💼 Employment / Experience Documents',
    docs: [
      { value: 'relieving_letter',      label: 'Relieving Letter (prev employer)', required: false },
      { value: 'experience_certificate',label: 'Experience Certificate',           required: false },
      { value: 'experience_letter',     label: 'Experience Letter',                required: false },
      { value: 'payslips',              label: 'Last 3 Months Payslips',           required: false },
      { value: 'form_16',               label: 'Form 16 / Income Tax Returns',     required: false },
      { value: 'pf_service_history',    label: 'PF Service History',               required: false },
      { value: 'bank_statement_salary', label: 'Last 6 Months Salary Bank Stmt',  required: false },
    ],
  },
  {
    label: '📎 Other Documents',
    docs: [
      { value: 'degree',        label: 'Degree Certificate',  required: false },
      { value: 'offer_letter',  label: 'Offer Letter',        required: false },
      { value: 'joining_letter',label: 'Joining Letter',      required: false },
      { value: 'other',         label: 'Other Document',      required: false },
    ],
  },
];

const BLOOD_GROUPS = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];
const RELATIONS    = ['Spouse','Father','Mother','Son','Daughter','Sibling','Other'];

const BLANK_FORM = {
  employee_type: 'new',
  first_name:'', last_name:'', personal_email:'', phone:'',
  gender:'', date_of_birth:'', address:'', city:'', state:'', pincode:'',
  emergency_contact_name:'', emergency_contact_phone:'',
  department_id:'', role_id:'', joining_date:'',
  previous_employee_id:'', previous_joining_date:'', previous_relieving_date:'',
};

const TEAM_META = {
  IT:        { icon:'💻', bg:'#eff6ff', border:'#3b82f6', text:'#1d4ed8' },
  HR:        { icon:'👥', bg:'#f0fdf4', border:'#22c55e', text:'#15803d' },
  Admin:     { icon:'🏢', bg:'#fdf4ff', border:'#a855f7', text:'#7e22ce' },
  Insurance: { icon:'🏥', bg:'#fff7ed', border:'#f97316', text:'#c2410c' },
  Other:     { icon:'📋', bg:'var(--bg)', border:'var(--border)', text:'var(--text)' },
};

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { can } = useAuth();
  const { run: runSubmit, loading: submitting } = useAsync();
  const { run: btnRun, isLoading: btnLoading } = useButtonLoading();
  const activateRef = useRef(false);

  const [step, setStep]                       = useState(0);
  const [form, setForm]                       = useState(BLANK_FORM);
  const [existingEmp, setExistingEmp]         = useState(null);
  const [checking, setChecking]               = useState(false);
  const checkTimer                            = useRef(null);
  const [createdEmployee, setCreatedEmployee] = useState(null);
  const [departments, setDepartments]         = useState([]);
  const [roles, setRoles]                     = useState([]);
  const [pendingDocs, setPendingDocs]         = useState([]);
  const [workHistory, setWorkHistory]         = useState([]);
  const [showWHForm, setShowWHForm]           = useState(false);
  const [newWH, setNewWH]                     = useState({
    company_name:'', designation:'', department:'',
    from_date:'', to_date:'', is_current: false,
    reason_for_leaving:'', last_ctc:'',
  });
  const [insuranceForm, setInsuranceForm] = useState({
    smoking_status: '',
    nominee_name:'', nominee_relation:'', nominee_dob:'',
    nominee_phone:'', blood_group:'', pre_existing_conditions:'',
    spouse_name:'', spouse_dob:'', spouse_gender:'',
    children:[],
  });
  const [showSpouse, setShowSpouse]         = useState(false);
  const [showChildren, setShowChildren]     = useState(false);
  const [newChild, setNewChild]             = useState({ name:'', dob:'', gender:'' });
  const [insuranceSaved, setInsuranceSaved]     = useState(false);
  const [insuranceSkipped, setInsuranceSkipped] = useState(false);
  const [tasksCreated, setTasksCreated]         = useState([]);
  const { errors, setAllErrors, clearAll, clearFieldError } = useFormErrors();

  useEffect(() => {
    departmentsAPI.list().then(r => setDepartments(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (form.department_id)
      rolesAPI.list(form.department_id).then(r => setRoles(r.data)).catch(() => {});
    else setRoles([]);
  }, [form.department_id]);

  const autoCheck = useCallback(async (firstName, lastName, email, phone) => {
    const fn = (firstName||'').trim(), ln = (lastName||'').trim();
    const em = (email||'').trim(), ph = (phone||'').replace(/\D/g,'');
    const validName  = fn.length >= 2 && ln.length >= 2;
    const validEmail = em.includes('@') && em.split('@')[1]?.includes('.') && em.length >= 6;
    const validPhone = ph.length === 10;
    if (!validName || (!validEmail && !validPhone)) { setExistingEmp(null); return; }
    setChecking(true);
    try {
      const { data } = await onboardingAPI.checkExisting({
        first_name: fn, last_name: ln,
        personal_email: validEmail ? em : null,
        phone: validPhone ? ph : null,
      });
      setExistingEmp(data.found ? data.employee : null);
    } catch { setExistingEmp(null); }
    finally { setChecking(false); }
  }, []);

  const set = (field, val) => {
    setForm(f => {
      const next = { ...f, [field]: val };
      if (['personal_email','phone','first_name','last_name'].includes(field)) {
        const fn    = field === 'first_name'     ? val : next.first_name;
        const ln    = field === 'last_name'      ? val : next.last_name;
        const email = field === 'personal_email' ? val : next.personal_email;
        const phone = field === 'phone'          ? val : next.phone;
        const allFilled = fn.trim().length >= 2 && ln.trim().length >= 2 &&
          email.trim().length >= 5 && (phone||'').replace(/\D/g,'').length === 10;
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
    setForm(f => ({
      ...f,
      employee_type:           'rejoining',
      previous_employee_id:    existingEmp.employee_id,
      previous_joining_date:   existingEmp.joining_date   || '',
      previous_relieving_date: existingEmp.relieving_date || '',
    }));
  }, [existingEmp]);

  const validateStep = () => {
    const ruleMap = {
      0: { first_name:[VALIDATORS.required,VALIDATORS.name], last_name:[VALIDATORS.required,VALIDATORS.name],
           personal_email:[VALIDATORS.required,VALIDATORS.email], phone:[VALIDATORS.required,VALIDATORS.phone] },
      2: { department_id:[VALIDATORS.required], joining_date:[VALIDATORS.required,VALIDATORS.joiningDate] },
    };
    const rules = { ...(ruleMap[step] || {}) };
    if (step === 0) {
      if (form.pincode)                 rules.pincode = [VALIDATORS.pincode];
      if (form.date_of_birth)           rules.date_of_birth = [VALIDATORS.dob];
      if (form.emergency_contact_phone) rules.emergency_contact_phone = [VALIDATORS.altPhone];
    }
    const errs = validateForm(form, rules);
    if (Object.keys(errs).length > 0) { setAllErrors(errs); toast.error('Please fix the errors before continuing'); return false; }
    clearAll();
    return true;
  };

  const sendStepEmail = async (stepNum, empId) => {
    try { await onboardingAPI.sendStepEmail({ employee_id: empId, step: stepNum }); } catch {}
  };

  const nextStep = async () => {
    if (!validateStep()) return;

    if (step === 3) {
      await runSubmit(async () => {
        const payload = { ...form };
        Object.keys(payload).forEach(k => { if (payload[k] === '') payload[k] = null; });

        let empData;
        if (existingEmp && (existingEmp.status === 'relieved' || existingEmp.status === 'inactive')) {
          await onboardingAPI.reactivate(existingEmp.id, form.joining_date);
          const { data } = await employeesAPI.get(existingEmp.id);
          empData = data;
          if (form.department_id || form.role_id) {
            await employeesAPI.update(existingEmp.id, {
              department_id: form.department_id || null,
              role_id: form.role_id || null,
              joining_date: form.joining_date,
            });
          }
        } else {
          const { data } = await employeesAPI.create(payload);
          empData = data;
        }
        setCreatedEmployee(empData);

        for (const d of pendingDocs) {
          await employeesAPI.uploadDocument(empData.id, d.type, d.file).catch(() => {});
        }
        for (const wh of workHistory) {
          await onboardingAPI.addWorkHistory(empData.id, wh).catch(() => {});
        }
        await sendStepEmail(3, empData.id);

        // ── Auto-create onboarding tasks for IT, HR, Admin teams ──
        try {
          const docsSkipped = pendingDocs.length === 0;
          const res = await onboardingAPI.createOnboardingTasks(empData.id, {
            skipped_insurance: false,
            skipped_docs: docsSkipped,
          });
          setTasksCreated(res.data?.tasks || []);
          toast.success('Profile created! Tasks assigned to IT, HR & Admin teams.');
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
      await employeesAPI.activate(createdEmployee.id);
      await sendStepEmail(4, createdEmployee.id);
      await onboardingAPI.requestEmailSetup(createdEmployee.id).catch(() => {});
      // Activation tasks: IT final check + Admin office induction
      try { await onboardingAPI.createActivationTasks(createdEmployee.id); } catch {}
      // If insurance was skipped, create HR fallback task now
      if (insuranceSkipped) {
        try {
          await onboardingAPI.createOnboardingTasks(createdEmployee.id, {
            skipped_insurance: true, skipped_docs: false,
          });
        } catch {}
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
      await onboardingAPI.saveInsurance(createdEmployee.id, insuranceForm);
      await onboardingAPI.submitInsurance(createdEmployee.id);
      setInsuranceSaved(true);
      setInsuranceSkipped(false);
      toast.success('Insurance submitted! Tasks created for Insurance & HR teams.');
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
    setNewWH({ company_name:'', designation:'', department:'', from_date:'', to_date:'', is_current:false, reason_for_leaving:'', last_ctc:'' });
    setShowWHForm(false);
    toast.success('Work history added');
  };

  const addDoc = (type, file) => {
    if (file.size > 10 * 1024 * 1024) { toast.error('Max 10MB per file'); return; }
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['pdf','jpg','jpeg','png','doc','docx'].includes(ext)) { toast.error(`File type .${ext} not allowed`); return; }
    setPendingDocs(d => [...d.filter(x => x.type !== type), { type, file }]);
  };

  // ── Team tasks summary card (shown on review step) ─────────────────────
  const TeamTasksSummary = () => {
    if (!tasksCreated.length) return null;
    const byTeam = tasksCreated.reduce((acc, t) => {
      const key = t.team || 'Other';
      if (!acc[key]) acc[key] = [];
      acc[key].push(t.task);
      return acc;
    }, {});
    return (
      <div style={{ marginBottom:20, textAlign:'left' }}>
        <p style={{ fontWeight:700, fontSize:14, marginBottom:10, color:'var(--text)' }}>
          ✅ Tasks auto-assigned to teams:
        </p>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(195px,1fr))', gap:10 }}>
          {Object.entries(byTeam).map(([team, tasks]) => {
            const m = TEAM_META[team] || TEAM_META.Other;
            return (
              <div key={team} style={{ padding:'12px 14px', borderRadius:10, background:m.bg, border:`1.5px solid ${m.border}` }}>
                <div style={{ fontWeight:700, fontSize:13, color:m.text, marginBottom:6 }}>
                  {m.icon} {team} Team
                </div>
                {tasks.map((t, i) => (
                  <div key={i} style={{ fontSize:12, color:'var(--text-muted)', marginBottom:2 }}>• {t}</div>
                ))}
              </div>
            );
          })}
        </div>
        {insuranceSkipped && (
          <div style={{ marginTop:10, padding:'10px 14px', borderRadius:8, background:'var(--warning-bg)', border:'1px solid var(--warning)', fontSize:12, color:'var(--warning)' }}>
            ⚠ Insurance skipped — HR has been assigned a follow-up task to collect details.
          </div>
        )}
      </div>
    );
  };

  const ExistingBanner = () => {
    if (checking) return (
      <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', background:'var(--bg)', borderRadius:8, fontSize:13, color:'var(--text-muted)', marginBottom:16 }}>
        <div className="spinner" style={{ width:14, height:14, borderWidth:2 }} />
        Checking employee records…
      </div>
    );
    if (!existingEmp) return null;
    const isRejoining = existingEmp.status === 'relieved' || existingEmp.status === 'inactive';
    return (
      <div style={{ padding:16, borderRadius:12, border:`2px solid ${isRejoining ? '#f59e0b' : 'var(--danger)'}`, background: isRejoining ? 'var(--warning-bg)' : 'var(--danger-bg)', marginBottom:20 }}>
        <p style={{ fontWeight:700, fontSize:14, marginBottom:10, color: isRejoining ? 'var(--warning)' : 'var(--danger)' }}>
          {isRejoining ? '🔄 Rejoining Employee Found' : '⚠ Active Employee Already Exists'}
        </p>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px 16px', marginBottom:10 }}>
          {[['Name',existingEmp.name],['Employee ID',existingEmp.employee_id],['Status',existingEmp.status],
            ['Department',existingEmp.department||'—'],['Role',existingEmp.role||'—'],['Last Relieving',existingEmp.relieving_date||'—'],
          ].map(([l,v]) => (
            <div key={l} style={{ display:'flex', gap:8 }}>
              <span style={{ fontSize:12, color:'var(--text-muted)', width:110, flexShrink:0 }}>{l}</span>
              <span style={{ fontSize:13, fontWeight:600 }}>{v}</span>
            </div>
          ))}
        </div>
        {isRejoining
          ? <p style={{ fontSize:12, color:'var(--warning)', marginTop:4 }}>✓ This employee will be rejoined. Fill job details in Step 3 and proceed.</p>
          : <p style={{ fontSize:12, color:'var(--danger)', marginTop:4 }}>⚠ This employee already has an active account. Please verify before continuing.</p>
        }
      </div>
    );
  };

  return (
    <>
      <div style={{ marginBottom:24 }}>
        <h1 className="page-title">Employee Onboarding</h1>
        <p className="page-subtitle">
          {existingEmp && (existingEmp.status==='relieved'||existingEmp.status==='inactive')
            ? '🔄 Rejoining employee detected — fill required details to reactivate'
            : 'Register a new employee'}
        </p>
      </div>

      <div className="steps" style={{ overflowX:'auto', paddingBottom:8 }}>
        {STEPS.map((label, i) => (
          <React.Fragment key={i}>
            <div className="step-wrap">
              <div className={`step-circle ${i<step?'done':i===step?'active':''}`}>{i<step?'✓':i+1}</div>
              <div className={`step-label ${i<step?'done':i===step?'active':''}`}>{label}</div>
            </div>
            {i < STEPS.length-1 && <div className={`step-line ${i<step?'done':''}`} />}
          </React.Fragment>
        ))}
      </div>

      <div className="card" style={{ maxWidth:820, margin:'0 auto' }}>

        {/* Step 0: Personal Info */}
        {step === 0 && (
          <div>
            <h3 style={{ marginBottom:4, fontSize:17, fontWeight:700 }}>Personal Information</h3>
            <p style={{ fontSize:13, color:'var(--text-secondary)', marginBottom:20 }}>
              Enter employee details — the system automatically detects if they've worked here before.
            </p>
            <ExistingBanner />
            <div className="form-row">
              <ValidatedInput label="First Name" required value={form.first_name} error={errors.first_name} onChange={e => set('first_name', e.target.value)} placeholder="e.g. Tulasi" />
              <ValidatedInput label="Last Name" required value={form.last_name} error={errors.last_name} onChange={e => set('last_name', e.target.value)} placeholder="e.g. Gadini" />
            </div>
            <div className="form-row">
              <ValidatedInput label="Personal Email" required type="email" value={form.personal_email} error={errors.personal_email} onChange={e => set('personal_email', e.target.value)} placeholder="personal@gmail.com" hint="Welcome email sent here" />
              <ValidatedInput label="Phone" required value={form.phone} error={errors.phone} onChange={e => set('phone', e.target.value.replace(/\D/g,''))} placeholder="10-digit mobile" maxLength={10} />
            </div>
            <div className="form-row">
              <ValidatedSelect label="Gender" value={form.gender} onChange={e => set('gender', e.target.value)}>
                <option value="">Select</option>
                {['male','female','other'].map(g=><option key={g} value={g}>{g.charAt(0).toUpperCase()+g.slice(1)}</option>)}
              </ValidatedSelect>
              <ValidatedInput label="Date of Birth" type="date" value={form.date_of_birth} error={errors.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} hint="Must be 18+ years old" />
            </div>
            <ValidatedInput label="Address" value={form.address} onChange={e => set('address', e.target.value)} />
            <div className="form-row-3">
              <ValidatedInput label="City"    value={form.city}    onChange={e=>set('city',e.target.value)} />
              <ValidatedInput label="State"   value={form.state}   onChange={e=>set('state',e.target.value)} />
              <ValidatedInput label="Pincode" value={form.pincode} error={errors.pincode} onChange={e=>set('pincode',e.target.value.replace(/\D/g,''))} maxLength={6} hint="6 digits" />
            </div>
            <div className="form-row">
              <ValidatedInput label="Emergency Contact Name" value={form.emergency_contact_name} onChange={e=>set('emergency_contact_name',e.target.value)} />
              <ValidatedInput label="Emergency Contact Phone" value={form.emergency_contact_phone} error={errors.emergency_contact_phone} onChange={e=>set('emergency_contact_phone',e.target.value.replace(/\D/g,''))} maxLength={10} />
            </div>
            {existingEmp && (existingEmp.status==='relieved'||existingEmp.status==='inactive') && (
              <div style={{ marginTop:16, padding:16, background:'var(--accent-pale)', borderRadius:10, border:'1px solid var(--accent)' }}>
                <p style={{ fontWeight:600, fontSize:14, marginBottom:12, color:'var(--primary)' }}>🔄 Rejoining Details</p>
                <div className="form-row">
                  <ValidatedInput label="Previous Joining Date" type="date" value={form.previous_joining_date} onChange={e=>set('previous_joining_date',e.target.value)} />
                  <ValidatedInput label="Previous Relieving Date" type="date" value={form.previous_relieving_date} onChange={e=>set('previous_relieving_date',e.target.value)} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 1: Work History */}
        {step === 1 && (
          <div>
            <h3 style={{ marginBottom:8, fontSize:17, fontWeight:700 }}>Work History</h3>
            <p style={{ fontSize:13, color:'var(--text-secondary)', marginBottom:20 }}>Add previous employment. Skip for freshers.</p>
            {workHistory.map((wh, i) => (
              <div key={i} style={{ background:'var(--bg)', border:'1px solid var(--border)', borderRadius:10, padding:'14px 16px', marginBottom:10, display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div>
                  <div style={{ fontWeight:700, fontSize:15 }}>{wh.designation||'Role'} @ {wh.company_name}</div>
                  <div style={{ fontSize:13, color:'var(--text-muted)', marginTop:2 }}>
                    {wh.from_date} → {wh.is_current ? 'Present' : (wh.to_date||'—')}
                    {wh.last_ctc && <span style={{ marginLeft:12 }}>💰 {wh.last_ctc}</span>}
                  </div>
                  {wh.reason_for_leaving && <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>Reason: {wh.reason_for_leaving}</div>}
                </div>
                <button className="btn btn-ghost btn-sm" style={{ color:'var(--danger)' }} onClick={()=>setWorkHistory(w=>w.filter((_,j)=>j!==i))}>✕</button>
              </div>
            ))}
            {!showWHForm ? (
              <button className="btn btn-outline" onClick={()=>setShowWHForm(true)}>+ Add Work Experience</button>
            ) : (
              <div style={{ background:'var(--bg)', border:'1px solid var(--border)', borderRadius:12, padding:20 }}>
                <div className="form-row">
                  <div className="form-group"><label className="form-label required">Company Name</label><input className="form-control" value={newWH.company_name} onChange={e=>setNewWH(w=>({...w,company_name:e.target.value}))} /></div>
                  <div className="form-group"><label className="form-label">Designation</label><input className="form-control" value={newWH.designation} onChange={e=>setNewWH(w=>({...w,designation:e.target.value}))} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label required">Start Date</label><input type="date" className="form-control" value={newWH.from_date} onChange={e=>setNewWH(w=>({...w,from_date:e.target.value}))} /></div>
                  <div className="form-group"><label className="form-label">End Date</label><input type="date" className="form-control" value={newWH.to_date} disabled={newWH.is_current} onChange={e=>setNewWH(w=>({...w,to_date:e.target.value}))} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Last CTC</label><input className="form-control" placeholder="e.g. 6 LPA" value={newWH.last_ctc} onChange={e=>setNewWH(w=>({...w,last_ctc:e.target.value}))} /></div>
                  <div className="form-group"><label className="form-label">Reason for Leaving</label><input className="form-control" value={newWH.reason_for_leaving} onChange={e=>setNewWH(w=>({...w,reason_for_leaving:e.target.value}))} /></div>
                </div>
                <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:14, marginBottom:14, cursor:'pointer' }}>
                  <input type="checkbox" checked={newWH.is_current} onChange={e=>setNewWH(w=>({...w,is_current:e.target.checked,to_date:''}))} /> Currently working here
                </label>
                <div style={{ display:'flex', gap:10 }}>
                  <button className="btn btn-primary" onClick={addWH}>Add</button>
                  <button className="btn btn-ghost" onClick={()=>setShowWHForm(false)}>Cancel</button>
                </div>
              </div>
            )}
            {workHistory.length===0 && !showWHForm && (
              <p style={{ marginTop:16, fontSize:13, color:'var(--text-muted)' }}>No work history added. Click Next to skip (freshers).</p>
            )}
          </div>
        )}

        {/* Step 2: Job Details */}
        {step === 2 && (
          <div>
            <h3 style={{ marginBottom:24, fontSize:17, fontWeight:700 }}>{existingEmp ? '🔄 New Role Details (Rejoining)' : 'Job Details'}</h3>
            {existingEmp && (
              <div style={{ padding:'10px 14px', background:'var(--accent-pale)', borderRadius:8, fontSize:13, color:'var(--primary)', marginBottom:20 }}>
                Assign new department, role, and joining date for {existingEmp.name}.
              </div>
            )}
            <div className="form-row">
              <ValidatedSelect label="Department" required value={form.department_id} error={errors.department_id} onChange={e=>{set('department_id',e.target.value);set('role_id','');}}>
                <option value="">Select Department</option>
                {departments.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
              </ValidatedSelect>
              <ValidatedSelect label="Role" value={form.role_id} onChange={e=>set('role_id',e.target.value)} disabled={!form.department_id}>
                <option value="">{form.department_id?'Select Role':'Select department first'}</option>
                {roles.map(r=><option key={r.id} value={r.id}>{r.name} (L{r.level})</option>)}
              </ValidatedSelect>
            </div>
            <div className="form-row">
              <ValidatedInput label="Joining Date" required type="date" value={form.joining_date} error={errors.joining_date} onChange={e=>set('joining_date',e.target.value)} />
            </div>
          </div>
        )}

        {/* Step 3: Documents */}
        {step === 3 && (
          <div>
            <h3 style={{ marginBottom:8, fontSize:17, fontWeight:700 }}>Document Upload</h3>
            <p style={{ fontSize:13, color:'var(--text-muted)', marginBottom:8 }}>Max 10MB each. PDF, JPG, PNG, DOC accepted.</p>
            <div style={{ padding:'10px 14px', background:'#eff6ff', borderRadius:8, border:'1px solid #3b82f6', fontSize:12, color:'#1d4ed8', marginBottom:20 }}>
              💡 Completing this step auto-assigns tasks to: <strong>IT</strong> (email setup, laptop), <strong>HR</strong> (doc verification, onboarding checklist), <strong>Admin</strong> (ID card, welcome kit).
            </div>
            {DOC_CATEGORIES.map(cat => (
              <div key={cat.label} style={{ marginBottom:22 }}>
                <div style={{ fontWeight:700, fontSize:13, color:'var(--text)', marginBottom:10, paddingBottom:6, borderBottom:'1px solid var(--border-light)' }}>
                  {cat.label}
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  {cat.docs.map(dt => {
                    const ex = pendingDocs.find(d => d.type===dt.value);
                    return (
                      <label key={dt.value} style={{ border:`2px dashed ${ex?'var(--success)':dt.required?'var(--accent)':'var(--border)'}`, borderRadius:10, padding:14, cursor:'pointer', background:ex?'var(--success-bg)':'var(--bg)', display:'flex', alignItems:'center', gap:12 }}>
                        <input type="file" style={{ display:'none' }} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={e=>{ if(e.target.files[0]) addDoc(dt.value,e.target.files[0]); e.target.value=''; }} />
                        <span style={{ fontSize:24 }}>{ex?'✅':dt.required?'📌':'📎'}</span>
                        <div>
                          <div style={{ fontWeight:600, fontSize:13 }}>{dt.label}{dt.required&&<span style={{ color:'var(--danger)' }}> *</span>}</div>
                          <div style={{ fontSize:11, color:ex?'var(--success)':'var(--text-muted)' }}>{ex?`✓ ${ex.file.name}`:'Click to upload'}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
            {pendingDocs.length===0 && (
              <div style={{ marginTop:14, padding:'10px 14px', borderRadius:8, background:'var(--warning-bg)', border:'1px solid var(--warning)', fontSize:12, color:'var(--warning)' }}>
                ⚠ No documents uploaded — HR will receive a task to collect documents separately.
              </div>
            )}
          </div>
        )}

        {/* Step 4: Insurance */}
        {step === 4 && (
          <div>
            <h3 style={{ marginBottom:8, fontSize:17, fontWeight:700 }}>Insurance Information</h3>
            <p style={{ fontSize:13, color:'var(--text-secondary)', marginBottom:8 }}>Employee, nominee, and family details for group insurance enrollment.</p>
            <div style={{ padding:'10px 14px', background:'#fff7ed', borderRadius:8, border:'1px solid #f97316', fontSize:12, color:'#c2410c', marginBottom:20 }}>
              🏥 Submitting this auto-creates tasks for the <strong>Insurance team</strong> (enrollment) and <strong>HR team</strong> (collect documents).<br/>
              ⚠ Skipping will assign a follow-up task to HR.
            </div>
            {insuranceSaved ? (
              <div style={{ textAlign:'center', padding:'32px 20px' }}>
                <div style={{ fontSize:52, marginBottom:12 }}>✅</div>
                <h3 style={{ color:'var(--success)' }}>Insurance Info Submitted!</h3>
                <p style={{ color:'var(--text-secondary)', marginTop:8 }}>Tasks created for Insurance & HR teams.</p>
                <button className="btn btn-primary" style={{ marginTop:20 }} onClick={()=>setStep(5)}>Continue to Review →</button>
              </div>
            ) : (
              <>
                {/* ── Employee Insurance Details ── */}
                <div style={{ fontWeight:700, fontSize:13, color:'var(--text)', marginBottom:10, paddingBottom:6, borderBottom:'1px solid var(--border-light)' }}>
                  👤 Employee Details
                </div>
                <div className="form-row" style={{ marginBottom:16 }}>
                  <div className="form-group">
                    <label className="form-label required">Smoking Status</label>
                    <select className="form-control" value={insuranceForm.smoking_status} onChange={e=>setInsuranceForm(f=>({...f,smoking_status:e.target.value}))}>
                      <option value="">Select</option>
                      <option value="non_smoker">Non-Smoker</option>
                      <option value="smoker">Smoker</option>
                    </select>
                  </div>
                </div>

                {/* ── Nominee Details ── */}
                <div style={{ fontWeight:700, fontSize:13, color:'var(--text)', marginBottom:10, paddingBottom:6, borderBottom:'1px solid var(--border-light)' }}>
                  🏷 Nominee Details
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label required">Nominee Name</label><input className="form-control" value={insuranceForm.nominee_name} onChange={e=>setInsuranceForm(f=>({...f,nominee_name:e.target.value}))} /></div>
                  <div className="form-group">
                    <label className="form-label required">Relation</label>
                    <select className="form-control" value={insuranceForm.nominee_relation} onChange={e=>setInsuranceForm(f=>({...f,nominee_relation:e.target.value}))}>
                      <option value="">Select</option>
                      {RELATIONS.map(r=><option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Nominee Date of Birth</label><input type="date" className="form-control" value={insuranceForm.nominee_dob} onChange={e=>setInsuranceForm(f=>({...f,nominee_dob:e.target.value}))} /></div>
                  <div className="form-group"><label className="form-label">Nominee Phone</label><input className="form-control" maxLength={10} value={insuranceForm.nominee_phone} onChange={e=>setInsuranceForm(f=>({...f,nominee_phone:e.target.value.replace(/\D/g,'')}))} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Blood Group</label>
                    <select className="form-control" value={insuranceForm.blood_group} onChange={e=>setInsuranceForm(f=>({...f,blood_group:e.target.value}))}>
                      <option value="">Select</option>
                      {BLOOD_GROUPS.map(b=><option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Pre-existing Medical Conditions</label>
                  <textarea className="form-control" rows={2} placeholder="e.g. Diabetes (or leave blank)" value={insuranceForm.pre_existing_conditions} onChange={e=>setInsuranceForm(f=>({...f,pre_existing_conditions:e.target.value}))} />
                </div>

                {/* ── Spouse Details (Optional) ── */}
                <div style={{ marginTop:20, marginBottom:10 }}>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={()=>setShowSpouse(s=>!s)}
                    style={{ fontSize:13 }}
                  >
                    {showSpouse ? '▾' : '▸'} Spouse Details <span style={{ color:'var(--text-muted)', fontWeight:400 }}>(Optional)</span>
                  </button>
                </div>
                {showSpouse && (
                  <div style={{ background:'var(--bg)', border:'1px solid var(--border)', borderRadius:10, padding:16, marginBottom:16 }}>
                    <div style={{ fontWeight:700, fontSize:13, marginBottom:12, color:'var(--text)' }}>💑 Spouse Details</div>
                    <div className="form-row">
                      <div className="form-group"><label className="form-label">Spouse Name</label><input className="form-control" value={insuranceForm.spouse_name} onChange={e=>setInsuranceForm(f=>({...f,spouse_name:e.target.value}))} /></div>
                      <div className="form-group"><label className="form-label">Spouse Date of Birth</label><input type="date" className="form-control" value={insuranceForm.spouse_dob} onChange={e=>setInsuranceForm(f=>({...f,spouse_dob:e.target.value}))} /></div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Spouse Gender</label>
                        <select className="form-control" value={insuranceForm.spouse_gender} onChange={e=>setInsuranceForm(f=>({...f,spouse_gender:e.target.value}))}>
                          <option value="">Select</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Children Details (Optional) ── */}
                <div style={{ marginBottom:10 }}>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={()=>setShowChildren(s=>!s)}
                    style={{ fontSize:13 }}
                  >
                    {showChildren ? '▾' : '▸'} Children Details <span style={{ color:'var(--text-muted)', fontWeight:400 }}>(Optional)</span>
                  </button>
                </div>
                {showChildren && (
                  <div style={{ background:'var(--bg)', border:'1px solid var(--border)', borderRadius:10, padding:16, marginBottom:16 }}>
                    <div style={{ fontWeight:700, fontSize:13, marginBottom:12, color:'var(--text)' }}>👶 Children</div>
                    {insuranceForm.children.map((child,i)=>(
                      <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', background:'var(--success-bg)', border:'1px solid var(--success)', borderRadius:8, marginBottom:8 }}>
                        <span style={{ flex:1, fontSize:13, fontWeight:600 }}>{child.name}</span>
                        <span style={{ fontSize:12, color:'var(--text-muted)' }}>{child.gender && child.gender.charAt(0).toUpperCase()+child.gender.slice(1)}</span>
                        {child.dob && <span style={{ fontSize:12, color:'var(--text-muted)' }}>{child.dob}</span>}
                        <button className="btn btn-ghost btn-sm" style={{ color:'var(--danger)', padding:'2px 8px' }} onClick={()=>setInsuranceForm(f=>({...f,children:f.children.filter((_,j)=>j!==i)}))}>✕</button>
                      </div>
                    ))}
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr auto', gap:10, alignItems:'end', marginTop:8 }}>
                      <div className="form-group" style={{ margin:0 }}>
                        <label className="form-label" style={{ fontSize:12 }}>Child Name</label>
                        <input className="form-control" placeholder="Name" value={newChild.name} onChange={e=>setNewChild(c=>({...c,name:e.target.value}))} />
                      </div>
                      <div className="form-group" style={{ margin:0 }}>
                        <label className="form-label" style={{ fontSize:12 }}>Date of Birth</label>
                        <input type="date" className="form-control" value={newChild.dob} onChange={e=>setNewChild(c=>({...c,dob:e.target.value}))} />
                      </div>
                      <div className="form-group" style={{ margin:0 }}>
                        <label className="form-label" style={{ fontSize:12 }}>Gender</label>
                        <select className="form-control" value={newChild.gender} onChange={e=>setNewChild(c=>({...c,gender:e.target.value}))}>
                          <option value="">Select</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <button
                        className="btn btn-primary btn-sm"
                        style={{ height:38 }}
                        onClick={()=>{
                          if(!newChild.name.trim()){ return; }
                          setInsuranceForm(f=>({...f,children:[...f.children,{...newChild}]}));
                          setNewChild({name:'',dob:'',gender:''});
                        }}
                      >+ Add</button>
                    </div>
                  </div>
                )}

                <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap', marginTop:16 }}>
                  <LoadingButton className="btn btn-accent" loading={btnLoading('insurance')} loadingText="Saving…" onClick={saveInsurance}>
                    💾 Save & Submit to Insurance Team
                  </LoadingButton>
                  <button className="btn btn-ghost" onClick={skipInsurance}>Skip for now →</button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 5: Review & Activate */}
        {step === 5 && createdEmployee && (
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:64, marginBottom:16 }}>🎉</div>
            <h3 style={{ fontSize:20, fontWeight:800, marginBottom:8 }}>Profile Created!</h3>
            <p style={{ color:'var(--text-secondary)', marginBottom:24 }}>
              {existingEmp ? '🔄 Rejoining — ' : ''}<strong>{createdEmployee.first_name} {createdEmployee.last_name}</strong>{' '}
              <code style={{ background:'var(--accent-pale)', padding:'2px 8px', borderRadius:4 }}>{createdEmployee.employee_id}</code>
            </p>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:24, textAlign:'left', padding:20, background:'var(--bg)', borderRadius:10 }}>
              {[
                ['Company Email', createdEmployee.email],
                ['Department',   createdEmployee.department?.name||'—'],
                ['Role',         createdEmployee.role?.name||'—'],
                ['Joining Date', createdEmployee.joining_date||'—'],
                ['Type',         createdEmployee.employee_type],
                ['Docs',         `${pendingDocs.length} uploaded`],
              ].map(([l,v]) => (
                <div key={l}>
                  <div style={{ fontSize:11, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', marginBottom:2 }}>{l}</div>
                  <div style={{ fontSize:14, fontWeight:600 }}>{v}</div>
                </div>
              ))}
            </div>

            {/* Status chips */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:24 }}>
              {[
                { icon:'📧', label:'Welcome Email',  desc:'will be Sent to personal email',   done:true },
                { icon:'💻', label:'Email Setup',    desc:'Task → IT team',            done:true },
                { icon:'🏥', label:'Insurance',      desc: insuranceSaved ? 'Submitted — task → Insurance team' : insuranceSkipped ? 'Skipped — HR follow-up task created' : 'Pending', done:insuranceSaved, warn:insuranceSkipped },
              ].map(item => (
                <div key={item.label} style={{ padding:'14px 12px', background:item.done?'var(--success-bg)':item.warn?'var(--warning-bg)':'var(--bg)', border:`1px solid ${item.done?'var(--success)':item.warn?'var(--warning)':'var(--border)'}`, borderRadius:10, textAlign:'center' }}>
                  <div style={{ fontSize:24, marginBottom:4 }}>{item.icon}</div>
                  <div style={{ fontWeight:700, fontSize:13 }}>{item.label}</div>
                  <div style={{ fontSize:11, color:item.done?'var(--success)':item.warn?'var(--warning)':'var(--text-muted)', marginTop:2 }}>{item.desc}</div>
                </div>
              ))}
            </div>

            <TeamTasksSummary />

            <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
              <button className="btn btn-outline" onClick={()=>navigate('/tasks')}>📋 View Tasks</button>
              <button className="btn btn-ghost" onClick={()=>navigate('/employees')}>View All Employees</button>
              <LoadingButton loading={btnLoading('activate')} loadingText="Activating…" onClick={handleActivate}>
                🚀 Activate Employee
              </LoadingButton>
            </div>
          </div>
        )}

        {/* Footer Nav */}
        {step < 5 && (
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:32, paddingTop:20, borderTop:'1px solid var(--border-light)' }}>
            <button className="btn btn-ghost" onClick={()=>{ clearAll(); setStep(s=>s-1); }} disabled={step===0}>← Back</button>
            {step===4 && insuranceSaved
              ? <button className="btn btn-primary" onClick={()=>setStep(5)}>Continue to Review →</button>
              : step<4
                ? <LoadingButton loading={submitting} loadingText="Processing…" onClick={nextStep}>{step===3?'Create Profile →':'Next →'}</LoadingButton>
                : null
            }
          </div>
        )}
      </div>
    </>
  );
}