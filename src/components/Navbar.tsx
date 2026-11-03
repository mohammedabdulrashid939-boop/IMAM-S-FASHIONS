import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, User, LayoutDashboard } from 'lucide-react';
import { LOGO_URL, BUSINESS_NAME, isFounderEmail } from '../constants/brand.ts';
import { useAuth } from '../context/AuthContext.tsx';

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { profile, role } = useAuth();

  const isAdmin =
    role === 'admin' ||
    profile?.role === 'admin' ||
    isFounderEmail(profile?.email);

  const navLinks = [
    { label: 'Home', path: '/' },
    { label: "Men's Styles", path: '/men' },
    { label: "Women's Styles", path: '/women' },
    { label: 'About Us', path: '/about' },
    { label: 'Contact Us', path: '/contact' },
  ];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-8 h-12 sm:h-14 lg:h-16 flex items-center justify-between gap-2 sm:gap-4 lg:gap-6">
        {/* Zone 1: Brand Logo & Wordmark */}
        <Link
          to="/"
          className="flex items-center gap-2 sm:gap-2.5 whitespace-nowrap shrink-0 group focus:outline-none"
        >
          <img
            src={LOGO_URL}
            alt="Imam's Fashion Logo"
            referrerPolicy="no-referrer"
            className="h-8 w-8 sm:h-9 sm:w-9 lg:h-11 lg:w-11 object-contain transition-transform duration-200 group-hover:scale-105"
          />
          <span className="font-display text-base sm:text-lg lg:text-xl font-bold tracking-tight text-[#071B49] whitespace-nowrap shrink-0">
            {BUSINESS_NAME}
          </span>
        </Link>

        {/* Zone 2: Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-3.5 lg:gap-6 text-xs lg:text-sm font-medium">
          {navLinks.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`whitespace-nowrap shrink-0 py-1 transition-colors relative ${
                  active
                    ? 'text-[#071B49] font-semibold after:content-[""] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#39D353]'
                    : 'text-slate-600 hover:text-[#071B49]'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Zone 3: Primary Customer Account Action */}
        <div className="hidden md:flex items-center gap-2 lg:gap-2.5 shrink-0">
          {isAdmin && (
            <Link
              to="/admin/dashboard"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 lg:px-3.5 lg:py-2 rounded-md lg:rounded-lg bg-[#39D353] text-white text-xs lg:text-sm font-semibold shadow-sm hover:bg-[#2eb846] transition-colors whitespace-nowrap shrink-0"
            >
              <LayoutDashboard className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
              <span>Admin Dashboard</span>
            </Link>
          )}
          {profile ? (
            <Link
              to={isAdmin ? '/login?view=profile' : '/login'}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 lg:px-3.5 lg:py-2 rounded-md lg:rounded-lg bg-[#071B49] text-white text-xs lg:text-sm font-semibold hover:bg-[#0c296b] transition-colors whitespace-nowrap shrink-0"
            >
              <User className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-[#39D353]" />
              <span className="truncate max-w-[100px] lg:max-w-[140px]">{profile.fullName.split(' ')[0]}</span>
            </Link>
          ) : (
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 lg:px-4 lg:py-2 rounded-md lg:rounded-lg bg-[#39D353] text-white text-xs lg:text-sm font-semibold shadow-sm hover:bg-[#2eb846] transition-colors whitespace-nowrap shrink-0"
            >
              <User className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
              <span>Account / Sign In</span>
            </Link>
          )}
        </div>

        {/* Mobile Actions & Menu Button */}
        <div className="flex md:hidden items-center gap-1.5">
          {isAdmin && (
            <Link
              to="/admin/dashboard"
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[#39D353] text-white text-[11px] font-semibold shadow-sm"
            >
              <LayoutDashboard className="w-3 h-3" />
              <span>Admin</span>
            </Link>
          )}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
            className="inline-flex items-center justify-center p-1.5 rounded-md text-[#071B49] hover:bg-slate-100 transition-colors"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Responsive Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 px-3 pt-2 pb-4 space-y-1 shadow-lg">
          {navLinks.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  active
                    ? 'bg-[#071B49]/5 text-[#071B49] font-semibold'
                    : 'text-slate-700 hover:bg-slate-50 hover:text-[#071B49]'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <div className="pt-2 border-t border-slate-100 flex flex-col gap-1.5">
            {isAdmin && (
              <Link
                to="/admin/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-[#39D353] text-white text-xs font-semibold shadow-sm"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Admin Dashboard</span>
              </Link>
            )}
            {profile ? (
              <Link
                to={isAdmin ? '/login?view=profile' : '/login'}
                onClick={() => setMobileMenuOpen(false)}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-[#071B49] text-white text-xs font-semibold"
              >
                <User className="w-3.5 h-3.5 text-[#39D353]" />
                <span>My Account ({profile.fullName})</span>
              </Link>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="inline-flex items-center justify-center px-3 py-2 rounded-md border border-[#071B49] text-[#071B49] text-xs font-semibold hover:bg-slate-50"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="inline-flex items-center justify-center px-3 py-2 rounded-md bg-[#39D353] text-white text-xs font-semibold hover:bg-[#2eb846]"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
