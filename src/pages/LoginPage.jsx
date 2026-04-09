import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useAsync } from '../hooks/useAsync';
import LoadingButton from '../components/ui/LoadingButton';
import { toast } from 'react-toastify';

export default function LoginPage() {
  const [form, setForm] = useState({ username: '', password: '' });
  const { run, loading } = useAsync();
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Grab ?redirect= from the URL — e.g. /login?redirect=/joining-details
  const params = new URLSearchParams(location.search);
  const redirectTo = params.get('redirect') || '/dashboard';

  const handle = (e) => {
    e.preventDefault();
    run(async () => {
      try {
        await login(form.username, form.password);
        navigate(redirectTo, { replace: true });
      } catch (err) {
        toast.error(err?.response?.data?.detail || 'Invalid credentials');
      }
    });
  };

  return (
    <div className="login-page">
      {/* Left panel */}
      <div className="login-left">
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{
            width: 80, height: 80, borderRadius: 20,
            background: 'rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.2)',
          }}>
            <span style={{ fontSize: 40, fontWeight: 900, color: '#fff' }}>I</span>
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: '#fff', marginBottom: 12 }}>
            Intellativ
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 16, lineHeight: 1.6 }}>
            HR Onboarding & Identity Access Management Platform
          </p>
          <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {['Employee Onboarding', 'Role-Based Access Control', 'Document Management', 'Asset Tracking'].map((f) => (
              <div key={f} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: 'rgba(255,255,255,0.1)', padding: '12px 16px',
                borderRadius: 10, backdropFilter: 'blur(6px)',
              }}>
                <span style={{ color: '#29b6e0', fontSize: 18 }}>✓</span>
                <span style={{ color: '#fff', fontSize: 14, fontWeight: 500 }}>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="login-right">
        <div className="login-box">
          <div style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>
              Welcome back 👋
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>
              Sign in to your HR portal
            </p>
          </div>

          {redirectTo !== '/dashboard' && (
            <div style={{
              background: '#e8f5e9', border: '1px solid #4caf50', borderRadius: 8,
              padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#2e7d32',
            }}>
              📋 <strong>You'll be taken directly to your Joining Details</strong> after login to complete your documents &amp; insurance.
            </div>
          )}

          <form onSubmit={handle}>
            <div className="form-group">
              <label className="form-label required">Email / Username</label>
              <input
                className="form-control"
                type="text"
                placeholder=""
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label required">Password</label>
              <input
                className="form-control"
                type="password"
                placeholder="Enter your password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>

            <LoadingButton
              type="submit"
              className="btn btn-primary btn-lg"
              loading={loading}
              loadingText="Signing in…"
              style={{ width: '100%', marginTop: 8, justifyContent: 'center' }}
            >
              Sign In
            </LoadingButton>
          </form>

          <p style={{ marginTop: 24, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
            Default: <code style={{ background: 'var(--bg)', padding: '2px 6px', borderRadius: 4 }}>
              superadmin / Admin@1234
            </code>
          </p>
        </div>
      </div>
    </div>
  );
}
