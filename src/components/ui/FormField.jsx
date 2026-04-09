import React from 'react';

export default function FormField({ label, required, error, hint, children, style }) {
  return (
    <div className="form-group" style={style}>
      {label && <label className={`form-label ${required ? 'required' : ''}`}>{label}</label>}
      {children}
      {error && <div className="form-error">⚠ {error}</div>}
      {!error && hint && <div className="form-hint">{hint}</div>}
    </div>
  );
}

export function ValidatedInput({ label, required, error, hint, type = 'text', value, onChange, onBlur, placeholder, disabled, maxLength, style, inputStyle, ...rest }) {
  return (
    <FormField label={label} required={required} error={error} hint={hint} style={style}>
      <input
        type={type}
        className={`form-control ${error ? 'input-error' : ''}`}
        value={value || ''}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={maxLength}
        style={inputStyle}
        {...rest}
      />
    </FormField>
  );
}

export function ValidatedSelect({ label, required, error, hint, value, onChange, disabled, children, style }) {
  return (
    <FormField label={label} required={required} error={error} hint={hint} style={style}>
      <select
        className={`form-control ${error ? 'input-error' : ''}`}
        value={value || ''}
        onChange={onChange}
        disabled={disabled}
      >
        {children}
      </select>
    </FormField>
  );
}
