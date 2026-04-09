/**
 * Validation rules for all HR forms
 */

export const VALIDATORS = {
  required: (val) => (!val || String(val).trim() === '') ? 'This field is required' : null,

  email: (val) => {
    if (!val) return null;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) ? null : 'Enter a valid email address';
  },

  phone: (val) => {
    if (!val) return null;
    return /^[6-9]\d{9}$/.test(val.replace(/\s/g,''))
      ? null : 'Enter valid 10-digit mobile number (starts with 6-9)';
  },

  pincode: (val) => {
    if (!val) return null;
    return /^\d{6}$/.test(val) ? null : 'Pincode must be exactly 6 digits';
  },

  dob: (val) => {
    if (!val) return null;
    const d = new Date(val);
    const now = new Date();
    const age = (now - d) / (1000 * 60 * 60 * 24 * 365);
    if (age < 18) return 'Employee must be at least 18 years old';
    if (age > 70) return 'Please check the date of birth';
    return null;
  },

  joiningDate: (val) => {
    if (!val) return null;
    const d = new Date(val);
    const now = new Date();
    const diffDays = (d - now) / (1000 * 60 * 60 * 24);
    if (diffDays < -365 * 2) return 'Joining date seems too far in the past';
    return null;
  },

  name: (val) => {
    if (!val) return null;
    if (val.trim().length < 2) return 'Name must be at least 2 characters';
    if (!/^[a-zA-Z\s'.,-]+$/.test(val)) return 'Name contains invalid characters';
    return null;
  },

  password: (val) => {
    if (!val) return null;
    if (val.length < 6) return 'Password must be at least 6 characters';
    return null;
  },

  altPhone: (val) => {
    if (!val) return null;
    return /^\d{10}$/.test(val.replace(/\s/g,''))
      ? null : 'Enter valid 10-digit phone number';
  },
};

/**
 * Validate a form object against a rules map
 * rules: { fieldName: [validator1, validator2] }
 * Returns: { fieldName: 'error message' } — empty obj means valid
 */
export function validateForm(values, rules) {
  const errors = {};
  for (const [field, validators] of Object.entries(rules)) {
    for (const validator of validators) {
      const err = validator(values[field]);
      if (err) { errors[field] = err; break; }
    }
  }
  return errors;
}

/**
 * Hook: manage field errors
 */
import { useState, useCallback } from 'react';

export function useFormErrors() {
  const [errors, setErrors] = useState({});

  const setFieldError = useCallback((field, msg) => {
    setErrors(e => ({ ...e, [field]: msg }));
  }, []);

  const clearFieldError = useCallback((field) => {
    setErrors(e => { const n = { ...e }; delete n[field]; return n; });
  }, []);

  const setAllErrors = useCallback((errs) => setErrors(errs), []);
  const clearAll = useCallback(() => setErrors({}), []);
  const hasErrors = Object.keys(errors).length > 0;

  return { errors, setFieldError, clearFieldError, setAllErrors, clearAll, hasErrors };
}
