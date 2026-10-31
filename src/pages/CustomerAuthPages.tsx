import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, LogOut, CheckCircle2, User, Mail, Phone, Calendar } from 'lucide-react';
import { LOGO_URL, BUSINESS_NAME } from '../constants/brand.ts';
import { useAuth } from '../context/AuthContext.tsx';

export const CustomerLoginPage: React.FC = () => {
  const { profile, role, loginCustomer, signInWithGoogle, updateProfile, logout } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Profile edit state when customer is logged in
  const [editName, setEditName] = useState(profile?.fullName || '');
  const [editPhone, setEditPhone] = useState(profile?.phoneNumber || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSavedMsg, setProfileSavedMsg] = useState<string | null>(null);

  React.useEffect(() => {
    if (profile) {
      setEditName(profile.fullName);
      setEditPhone(profile.phoneNumber);
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await loginCustomer(email, password);
    } catch (err: any) {
      setError(err.message || 'Sign in failed. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await signInWithGoogle({ isAdminLoginAttempt: false });
    } catch (err: any) {
      setError(err.message || 'Google sign-in could not be completed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileSavedMsg(null);
    setError(null);
    try {
      await updateProfile({ fullName: editName, phoneNumber: editPhone });
      setProfileSavedMsg('Your profile information has been updated.');
    } catch (err: any) {
      setError(err.message || 'Could not update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  if (profile) {
    return (
      <div className="min-h-[80vh] bg-slate-50 py-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto bg-white rounded-3xl border border-slate-200/90 p-8 sm:p-10 shadow-sm space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div className="flex items-center gap-4">
              <img
                src={LOGO_URL}
                alt={BUSINESS_NAME}
                referrerPolicy="no-referrer"
                className="w-14 h-14 object-contain"
              />
              <div>
                <span className="text-xs uppercase tracking-widest text-[#39D353] font-semibold">
                  Customer Profile
                </span>
                <h1 className="font-display text-3xl font-bold text-[#071B49]">
                  Welcome, {profile.fullName}
                </h1>
              </div>
            </div>

            <button
              type="button"
              onClick={() => logout()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer self-start"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>

          {role === 'admin' && (
            <div className="p-5 rounded-2xl bg-[#071B49] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-[#39D353] font-semibold">
                  Administrator Access Verified
                </p>
                <p className="text-sm text-slate-200 mt-0.5">
                  Manage fashion styles, upload new designs, and view registered users.
                </p>
              </div>
              <Link
                to="/admin/dashboard"
                className="inline-flex items-center justify-center px-5 py-3 rounded-xl bg-[#39D353] text-white text-xs sm:text-sm font-semibold hover:bg-[#2eb846] transition-colors whitespace-nowrap shrink-0"
              >
                Open Admin &amp; Users Dashboard &rarr;
              </Link>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm bg-slate-50 p-5 rounded-2xl border border-slate-200/60">
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-[#39D353] shrink-0" />
              <div>
                <p className="text-xs text-slate-400">Email Address</p>
                <p className="font-medium text-[#071B49]">{profile.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-[#39D353] shrink-0" />
              <div>
                <p className="text-xs text-slate-400">Member Since</p>
                <p className="font-medium text-[#071B49] font-mono-tabular">
                  {new Date(profile.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {profileSavedMsg && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2.5 text-sm text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-[#39D353] shrink-0" />
              <span>{profileSavedMsg}</span>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleProfileSave} className="space-y-5">
            <h2 className="font-display text-2xl font-bold text-[#071B49]">
              Update Profile Details
            </h2>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#071B49] mb-2">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm text-[#071B49] focus:outline-none focus:border-[#071B49]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#071B49] mb-2">
                Phone / WhatsApp Number
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="e.g. 0245198198"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm text-[#071B49] focus:outline-none focus:border-[#071B49]"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                type="submit"
                disabled={savingProfile}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#39D353] text-white text-sm font-semibold hover:bg-[#2eb846] transition-colors disabled:opacity-60 cursor-pointer"
              >
                {savingProfile && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Save Changes</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/men')}
                className="px-5 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-[#071B49] hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Browse Styles
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[82vh] bg-slate-50 flex items-center justify-center py-14 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200/90 p-8 sm:p-10 shadow-sm space-y-6">
        <div className="text-center space-y-3">
          <img
            src={LOGO_URL}
            alt={BUSINESS_NAME}
            referrerPolicy="no-referrer"
            className="w-20 h-20 mx-auto object-contain"
          />
          <h1 className="font-display text-3xl font-bold text-[#071B49]">Customer Sign In</h1>
          <p className="text-sm text-slate-600">
            Sign in to your {BUSINESS_NAME} account to manage your profile.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-medium text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#071B49] mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full pl-4 pr-11 py-3 rounded-xl border border-slate-200 text-sm text-[#071B49] focus:outline-none focus:border-[#071B49]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#071B49]"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#39D353] text-white text-sm font-semibold hover:bg-[#2eb846] transition-colors disabled:opacity-60 cursor-pointer"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Sign In</span>
          </button>
        </form>

        <div className="relative py-1">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-3 text-slate-400">Or continue with</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={submitting}
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-slate-300 text-sm font-semibold text-[#071B49] hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <span>Continue with Google</span>
        </button>

        <div className="text-center text-xs text-slate-600 pt-2">
          <p>
            Don&apos;t have an account yet?{' '}
            <Link to="/register" className="font-semibold text-[#071B49] hover:text-[#39D353]">
              Create a Customer Account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export const CustomerRegisterPage: React.FC = () => {
  const { registerCustomer, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await registerCustomer({
        fullName,
        email,
        phoneNumber,
        password,
      });
      navigate('/login');
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleRegister = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await signInWithGoogle({ isAdminLoginAttempt: false });
      navigate('/login');
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[85vh] bg-slate-50 flex items-center justify-center py-14 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200/90 p-8 sm:p-10 shadow-sm space-y-6">
        <div className="text-center space-y-3">
          <img
            src={LOGO_URL}
            alt={BUSINESS_NAME}
            referrerPolicy="no-referrer"
            className="w-20 h-20 mx-auto object-contain"
          />
          <h1 className="font-display text-3xl font-bold text-[#071B49]">
            Customer Registration
          </h1>
          <p className="text-sm text-slate-600">
            Create your {BUSINESS_NAME} profile to stay connected with our latest collections.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-medium text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#071B49] mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Kwame Mensah"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-[#071B49] focus:outline-none focus:border-[#071B49]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#071B49] mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-[#071B49] focus:outline-none focus:border-[#071B49]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#071B49] mb-1.5">
              Phone / WhatsApp Number
            </label>
            <input
              type="tel"
              required
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="e.g. 0245198198"
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
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full pl-4 pr-11 py-3 rounded-xl border border-slate-200 text-sm text-[#071B49] focus:outline-none focus:border-[#071B49]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#071B49]"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#39D353] text-white text-sm font-semibold hover:bg-[#2eb846] transition-colors disabled:opacity-60 cursor-pointer"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Create Account</span>
          </button>
        </form>

        <div className="relative py-1">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-3 text-slate-400">Or register with</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGoogleRegister}
          disabled={submitting}
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-slate-300 text-sm font-semibold text-[#071B49] hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <span>Continue with Google</span>
        </button>

        <p className="text-center text-xs text-slate-600 pt-2">
          Already registered?{' '}
          <Link to="/login" className="font-semibold text-[#071B49] hover:text-[#39D353]">
            Sign In Here
          </Link>
        </p>
      </div>
    </div>
  );
};
