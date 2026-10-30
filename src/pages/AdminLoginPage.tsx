import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Loader2, ShieldCheck, ArrowLeft } from 'lucide-react';
import { LOGO_URL, BUSINESS_NAME, FOUNDER_NAME } from '../constants/brand.ts';
import { useAuth } from '../context/AuthContext.tsx';

export const AdminLoginPage: React.FC = () => {
  const { role, loading, loginAdmin, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasExistingAdmin, setHasExistingAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (!loading && role === 'admin') {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [loading, role, navigate]);

  useEffect(() => {
    fetch('/api/auth/admin-status')
      .then((r) => r.json())
      .then((data) => {
        if (typeof data.hasAdmin === 'boolean') {
          setHasExistingAdmin(data.hasAdmin);
        }
      })
      .catch(() => {
        setHasExistingAdmin(true);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await loginAdmin(email, password, FOUNDER_NAME);
      navigate('/admin/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Invalid administrator credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleAdmin = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const assignedRole = await signInWithGoogle({ isAdminLoginAttempt: true });
      if (assignedRole === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else {
        setError('This account is not authorized for administrator access.');
      }
    } catch (err: any) {
      setError(err.message || 'Administrator sign-in failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#071B49] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white rounded-3xl shadow-2xl p-8 sm:p-10 space-y-6">
          <div className="text-center space-y-3">
            <img
              src={LOGO_URL}
              alt={`${BUSINESS_NAME} Logo`}
              referrerPolicy="no-referrer"
              className="w-24 h-24 mx-auto object-contain"
            />
            <div className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-[#39D353] font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>Private Administrator Portal</span>
            </div>
            <h1 className="font-display text-3xl font-bold text-[#071B49]">
              {BUSINESS_NAME} Admin
            </h1>
            <p className="text-xs text-slate-500">
              {hasExistingAdmin === false
                ? 'First-time administrator setup: sign in with your administrator email and password to initialize the master admin account.'
                : 'Restricted to authorized Imam’s Fashion administrators only.'}
            </p>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs font-medium text-red-700 leading-relaxed">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#071B49] mb-1.5">
                Administrator Email Address
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter administrator email"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-[#071B49] focus:outline-none focus:border-[#071B49]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#071B49] mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full pl-4 pr-11 py-3 rounded-xl border border-slate-200 text-sm text-[#071B49] focus:outline-none focus:border-[#071B49]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#071B49] cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#39D353] text-white text-sm font-semibold hover:bg-[#2eb846] transition-colors shadow-sm disabled:opacity-60 cursor-pointer"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{hasExistingAdmin === false ? 'Initialize & Enter Dashboard' : 'Login to Dashboard'}</span>
            </button>
          </form>

          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-slate-400">Or verify via Google</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleAdmin}
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold text-[#071B49] hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <span>Sign In with Authorized Google Account</span>
          </button>

          <div className="pt-2 text-center">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-[#071B49]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Public Website</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
