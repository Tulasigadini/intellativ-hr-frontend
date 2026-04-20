import React, { useState } from 'react';

export default function ParsedFieldReview({ data, currentData, onAccept, onClose }) {
  const [selections, setSelections] = useState(() => {
    const init = { personal: {}, salary: {}, bank: {}, tax: {}, work_history: 'new' };
    ['personal', 'salary', 'bank', 'tax'].forEach(cat => {
      if (data[cat]) {
        Object.keys(data[cat]).forEach(k => {
          if (data[cat][k]) {
            const hasOld = currentData[cat] && currentData[cat][k] && String(currentData[cat][k]).trim() !== '';
            init[cat][k] = hasOld ? 'old' : 'new';
          }
        });
      }
    });
    return init;
  });

  const [editableWH, setEditableWH] = useState(data.work_history || []);

  const LABELS = {
    first_name: 'First Name', last_name: 'Last Name', phone: 'Phone',
    personal_email: 'Personal Email', date_of_birth: 'Date of Birth', gender: 'Gender',
    city: 'City', state: 'State', pincode: 'Pincode', pan_number: 'PAN Number',
    uan_number: 'UAN Number', pf_number: 'PF Number',
    ctc: 'Annual CTC', basic: 'Basic Salary', hra: 'HRA', special_allowance: 'Special Allowance',
    pf_contribution: 'PF Contribution', gross_salary: 'Gross Salary', tds_deducted: 'TDS Deducted',
    net_taxable_income: 'Net Taxable Income', employer_name: 'Employer Name',
    financial_year: 'Financial Year', assessment_year: 'Assessment Year',
    account_number: 'Account Number', ifsc_code: 'IFSC Code',
  };

  const fmtVal = (k, v) => {
    if (['ctc', 'basic', 'hra', 'special_allowance', 'pf_contribution', 'tds_deducted'].includes(k) && v)
      return `₹${Number(v).toLocaleString('en-IN')}`;
    return String(v || 'N/A');
  };

  const toggleField = (cat, k, toVal) => {
    setSelections(s => ({ ...s, [cat]: { ...s[cat], [k]: toVal } }));
  };

  const applyChanges = () => {
    const final = { personal: {}, salary: {}, bank: {}, tax: {}, work_history: [] };
    ['personal', 'salary', 'bank', 'tax'].forEach(cat => {
      if (data[cat]) {
        Object.keys(data[cat]).forEach(k => {
          if (data[cat][k]) {
            const sel = selections[cat][k];
            if (sel === 'new') {
              final[cat][k] = data[cat][k];
            }
          }
        });
      }
    });
    if (selections.work_history === 'new' && editableWH.length > 0) {
      final.work_history = editableWH;
    }
    onAccept(final);
  };

  const updateWH = (idx, field, val) => {
    const arr = [...editableWH];
    arr[idx] = { ...arr[idx], [field]: val };
    setEditableWH(arr);
  };

  const categories = [
    { title: '👤 Personal Details', key: 'personal' },
    { title: '💰 Salary Details', key: 'salary' },
    { title: '🏦 Bank Details', key: 'bank' },
    { title: '📅 Tax Details', key: 'tax' },
  ].filter(c => data[c.key] && Object.values(data[c.key]).some(v => v));

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-card,#fff)', borderRadius: 20, padding: '32px 28px', width: '100%', maxWidth: 700, maxHeight: '85vh', overflow: 'auto', boxShadow: '0 25px 70px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--primary)' }}>⚡ Unified Data Extraction</h3>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6b7280' }}>Review extracted information against existing data.</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#9ca3af' }}>×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 30 }}>
          {categories.map(cat => (
            <div key={cat.key} style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', background: 'var(--bg)' }}>
              <div style={{ padding: '12px 16px', background: 'var(--bg-header,#f9fafb)', borderBottom: '1px solid var(--border)', fontSize: 14, fontWeight: 700 }}>
                {cat.title}
              </div>
              <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {Object.entries(data[cat.key]).filter(([_, v]) => v).map(([k, newV]) => {
                  const oldV = currentData[cat.key]?.[k];
                  const hasOld = !!oldV && String(oldV).trim() !== '';
                  const diff = hasOld && String(oldV).toLowerCase() !== String(newV).toLowerCase();
                  const sel = selections[cat.key][k];
                  return (
                    <div key={k} style={{ display: 'flex', gap: 16, alignItems: 'center', borderBottom: '1px dashed var(--border-light)', paddingBottom: 10 }}>
                      <div style={{ width: 140, fontSize: 12, color: '#4b5563', fontWeight: 600 }}>{LABELS[k] || k}</div>
                      
                      <div style={{ flex: 1, display: 'flex', gap: 20 }}>
                        {hasOld && diff && (
                          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', opacity: sel === 'old' ? 1 : 0.6 }}>
                            <input type="radio" checked={sel === 'old'} onChange={() => toggleField(cat.key, k, 'old')} />
                            <div style={{ fontSize: 12 }}>
                              <span style={{ color: '#9ca3af', display: 'block', fontSize: 10 }}>Existing ({sel === 'old' ? 'Keeping' : 'Discarding'})</span>
                              <span style={{ fontWeight: sel === 'old' ? 700 : 500 }}>{fmtVal(k, oldV)}</span>
                            </div>
                          </label>
                        )}
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', opacity: sel === 'new' ? 1 : (hasOld && diff ? 0.6 : 1) }}>
                          <input type="radio" checked={sel === 'new'} onChange={() => toggleField(cat.key, k, 'new')} />
                          <div style={{ fontSize: 12 }}>
                            <span style={{ color: '#0ea5e9', display: 'block', fontSize: 10 }}>Extracted ({sel === 'new' ? 'Applying' : 'Ignoring'})</span>
                            <span style={{ fontWeight: sel === 'new' ? 700 : 500 }}>{fmtVal(k, newV)}</span>
                          </div>
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {editableWH.length > 0 && (
            <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', background: 'var(--bg)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'var(--bg-header,#f9fafb)', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
                <input type="checkbox" checked={selections.work_history === 'new'} onChange={e => setSelections(s => ({ ...s, work_history: e.target.checked ? 'new' : 'old' }))} />
                <span style={{ fontSize: 14, fontWeight: 700 }}>💼 Work History (Extracted)</span>
              </label>
              {selections.work_history === 'new' && (
                <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {editableWH.map((item, idx) => (
                    <div key={idx} style={{ padding: '10px', background: 'var(--bg-card)', borderRadius: 8, border: '1px solid var(--border-light)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div>
                        <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600 }}>Company</div>
                        <input value={item.company_name || ''} onChange={e => updateWH(idx, 'company_name', e.target.value)} style={{ width: '100%', padding: 6, fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 4 }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600 }}>Designation</div>
                        <input value={item.designation || ''} onChange={e => updateWH(idx, 'designation', e.target.value)} style={{ width: '100%', padding: 6, fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 4 }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600 }}>From Date</div>
                        <input type="date" value={item.from_date || ''} onChange={e => updateWH(idx, 'from_date', e.target.value)} style={{ width: '100%', padding: 6, fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 4 }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600 }}>To Date</div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <input type="date" disabled={item.is_current} value={item.to_date || ''} onChange={e => updateWH(idx, 'to_date', e.target.value)} style={{ width: '100%', padding: 6, fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 4, opacity: item.is_current ? 0.5 : 1 }} />
                          <label style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
                            <input type="checkbox" checked={item.is_current || false} onChange={e => updateWH(idx, 'is_current', e.target.checked)} /> Present
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '9px 20px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Cancel</button>
          <button
            onClick={applyChanges}
            style={{ padding: '12px 24px', background: '#0d5c7a', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
            ✅ Apply Selected Data
          </button>
        </div>
      </div>
    </div>
  );
}
