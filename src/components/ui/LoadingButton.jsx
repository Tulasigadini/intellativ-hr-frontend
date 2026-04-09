import React from 'react';

export default function LoadingButton({
  loading = false,
  disabled = false,
  onClick,
  children,
  className = 'btn btn-primary',
  loadingText,
  type = 'button',
  style,
}) {
  return (
    <button
      type={type}
      className={className}
      disabled={loading || disabled}
      onClick={onClick}
      style={style}
    >
      {loading ? (
        <>
          <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2, flexShrink: 0 }} />
          {loadingText || 'Loading…'}
        </>
      ) : children}
    </button>
  );
}
