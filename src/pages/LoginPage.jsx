import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useAsync } from '../hooks/useAsync';
import LoadingButton from '../components/ui/LoadingButton';
import { toast } from 'react-toastify';
import { authAPI } from '../services/api';

const EyeIcon = <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
const EyeOffIcon = <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>;

const overlayStyle = {
  position: 'fixed', inset: 0,
  background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
};
const modalStyle = {
  background: 'var(--bg-card, #fff)', borderRadius: 16, padding: '36px 32px',
  width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', position: 'relative',
};

function ForgotPasswordModal({ onClose }) {
  const [username, setUsername] = useState('');
  const [sent, setSent] = useState(false);
  const { run, loading } = useAsync();

  const handle = (e) => {
    e.preventDefault();
    if (!username.trim()) return;
    run(async () => {
      try {
        await authAPI.forgotPassword(username.trim());
        setSent(true);
      } catch (err) {
        toast.error(err?.response?.data?.detail || 'Something went wrong. Please try again.');
      }
    });
  };

  return (
    <div style={overlayStyle} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={modalStyle}>
        <button onClick={onClose} style={{ position:'absolute', top:14, right:16, background:'none', border:'none', fontSize:22, cursor:'pointer', color:'#9ca3af' }}>×</button>
        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>📧</div>
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary, #111)' }}>Check your email</h3>
            <p style={{ color: '#6b7280', lineHeight: 1.6, marginBottom: 20 }}>
              If a matching account with a personal email is found, a reset link has been sent.
              <br /><strong>The link expires in 30 minutes.</strong>
            </p>
            <button className="btn btn-outline" onClick={onClose} style={{ width: '100%' }}>Back to Login</button>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>🔐</div>
              <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6, color: 'var(--text-primary, #111)' }}>Forgot Password?</h3>
              <p style={{ color: '#6b7280', fontSize: 14, lineHeight: 1.5 }}>
                Enter your company email. A reset link will be sent to your registered personal email address.
              </p>
            </div>
            <form onSubmit={handle}>
              <div className="form-group">
                <label className="form-label required">Company Email / Username</label>
                <input className="form-control" type="text" placeholder="you@intellativ.com" value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus />
              </div>
              <LoadingButton type="submit" className="btn btn-primary" loading={loading} loadingText="Sending…" style={{ width: '100%', marginTop: 8, justifyContent: 'center' }}>
                Send Reset Link
              </LoadingButton>
              <button type="button" onClick={onClose} style={{ width:'100%', marginTop:10, background:'none', border:'none', color:'#6b7280', cursor:'pointer', fontSize:14, padding:'8px 0' }}>
                ← Back to Login
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function ResetPasswordView({ token }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [valid, setValid] = useState(null);
  const { run, loading } = useAsync();

  useEffect(() => {
    authAPI.verifyResetToken(token).then(res => setValid(res.data.valid)).catch(() => setValid(false));
  }, [token]);

  const handle = (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) { toast.error('Passwords do not match'); return; }
    if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    run(async () => {
      try {
        await authAPI.resetPassword(token, form.password);
        toast.success('Password reset successfully! Please log in.');
        navigate('/login', { replace: true });
      } catch (err) {
        toast.error(err?.response?.data?.detail || 'Reset failed. Token may have expired.');
      }
    });
  };

  if (valid === null) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh' }}><div className="spinner" style={{ width:40, height:40 }} /></div>;

  return (
    <div className="login-page">
      <div className="login-left">
        <div style={{ textAlign:'center', maxWidth:400 }}>
          <div style={{ fontSize:64, marginBottom:20 }}>🔐</div>
          <h2 style={{ color:'#fff', fontSize:24, marginBottom:12 }}>Reset Your Password</h2>
          <p style={{ color:'rgba(255,255,255,0.7)', fontSize:15, lineHeight:1.6 }}>Choose a strong password you haven't used before.</p>
        </div>
      </div>
      <div className="login-right">
        <div className="login-box">
          {!valid ? (
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:52, marginBottom:16 }}>⏰</div>
              <h3 style={{ fontSize:22, fontWeight:700, marginBottom:10, color:'var(--text-primary)' }}>Link Expired</h3>
              <p style={{ color:'#6b7280', marginBottom:24 }}>This reset link is invalid or has expired (links expire after 30 minutes).</p>
              <button className="btn btn-primary" style={{ width:'100%', justifyContent:'center' }} onClick={() => navigate('/login')}>Back to Login</button>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 30 }}>
                <h2 style={{ fontSize:26, fontWeight:800, color:'var(--text-primary)', marginBottom:6 }}>Set New Password</h2>
                <p style={{ color:'var(--text-secondary)', fontSize:14 }}>Enter and confirm your new password below.</p>
              </div>
              <form onSubmit={handle}>
                <div className="form-group">
                  <label className="form-label required">New Password</label>
                  <div style={{ position:'relative' }}>
                    <input className="form-control" type={showPwd ? 'text' : 'password'} placeholder="At least 6 characters" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required autoFocus style={{ paddingRight:42 }} />
                    <button type="button" onClick={() => setShowPwd(v => !v)} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#9ca3af', padding:0 }} tabIndex={-1}>{showPwd ? EyeOffIcon : EyeIcon}</button>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label required">Confirm Password</label>
                  <input className="form-control" type={showPwd ? 'text' : 'password'} placeholder="Re-enter your password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} required />
                  {form.confirm && form.password !== form.confirm && <p style={{ color:'#ef4444', fontSize:12, marginTop:4 }}>Passwords do not match</p>}
                </div>
                <LoadingButton type="submit" className="btn btn-primary btn-lg" loading={loading} loadingText="Resetting…" style={{ width:'100%', marginTop:8, justifyContent:'center' }}>Reset Password</LoadingButton>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const { run, loading } = useAsync();
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const resetToken = searchParams.get('token');
  const redirectTo = new URLSearchParams(location.search).get('redirect') || '/dashboard';

  if (resetToken) return <ResetPasswordView token={resetToken} />;

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
    <>
      {showForgot && <ForgotPasswordModal onClose={() => setShowForgot(false)} />}
      <div className="login-page">
        <div className="login-left">
          <div style={{ textAlign:'center', maxWidth:400 }}>
            <div style={{ width:80, height:80, borderRadius:20, background:'rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 24px', backdropFilter:'blur(10px)', border:'1px solid rgba(255,255,255,0.2)' }}>
              <span style={{ fontSize:40, fontWeight:900, color:'#fff' }}>I</span>
            </div>
            <div className="sidebar-logo">
              <img src="https://www.intellativ.com/logo.png" alt="Intellativ HR" className="sidebar-logo-image" style={{ height:'100%', width:'100%', objectFit:'contain' }} />
            </div>
            <p style={{ color:'rgba(255,255,255,0.7)', fontSize:16, lineHeight:1.6 }}>HR Onboarding & Identity Access Management Platform</p>
            <div style={{ marginTop:40, display:'flex', flexDirection:'column', gap:16 }}>
              {['Employee Onboarding','Role-Based Access Control','Document Management','Asset Tracking'].map((f) => (
                <div key={f} style={{ display:'flex', alignItems:'center', gap:12, background:'rgba(255,255,255,0.1)', padding:'12px 16px', borderRadius:10, backdropFilter:'blur(6px)' }}>
                  <span style={{ color:'#29b6e0', fontSize:18 }}>✓</span>
                  <span style={{ color:'#fff', fontSize:14, fontWeight:500 }}>{f}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="login-right">
          <div className="login-box">
            <div style={{ marginBottom:36 }}>
              <h2 style={{ fontSize:28, fontWeight:800, color:'var(--text-primary)', marginBottom:6 }}>Welcome back 👋</h2>
              <p style={{ color:'var(--text-secondary)', fontSize:15 }}>Sign in to your HR portal</p>
            </div>
            {redirectTo !== '/dashboard' && (
              <div style={{ background:'#e8f5e9', border:'1px solid #4caf50', borderRadius:8, padding:'12px 16px', marginBottom:20, fontSize:13, color:'#2e7d32' }}>
                📋 <strong>You'll be taken directly to your Joining Details</strong> after login to complete your documents &amp; insurance.
              </div>
            )}
            <form onSubmit={handle}>
              <div className="form-group">
                <label className="form-label required">Email / Username</label>
                <input className="form-control" type="text" placeholder="admin@intellativ.com" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required autoFocus />
              </div>
              <div className="form-group">
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                  <label className="form-label required" style={{ margin:0 }}>Password</label>
                  <button type="button" onClick={() => setShowForgot(true)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--primary, #1a8cad)', fontSize:13, fontWeight:500, padding:0, textDecoration:'underline' }}>
                    Forgot password?
                  </button>
                </div>
                <div style={{ position:'relative' }}>
                  <input className="form-control" type={showPassword ? 'text' : 'password'} placeholder="Enter your password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required style={{ paddingRight:42 }} />
                  <button type="button" onClick={() => setShowPassword(v => !v)} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:16, color:'#9ca3af', padding:0, lineHeight:1 }} tabIndex={-1}>
                    {showPassword ? EyeOffIcon : EyeIcon}
                  </button>
                </div>
              </div>
              <LoadingButton type="submit" className="btn btn-primary btn-lg" loading={loading} loadingText="Signing in…" style={{ width:'100%', marginTop:8, justifyContent:'center' }}>Sign In</LoadingButton>
            </form>
            <p style={{ marginTop:24, textAlign:'center', fontSize:13, color:'var(--text-muted)' }}>
              Default: <code style={{ background:'var(--bg)', padding:'2px 6px', borderRadius:4 }}>admin@intellativ.com / Admin@123</code>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}