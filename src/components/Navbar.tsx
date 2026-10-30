import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, User } from 'lucide-react';
import { LOGO_URL, BUSINESS_NAME } from '../constants/brand.ts';
import { useAuth } from '../context/AuthContext.tsx';

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { profile, role } = useAuth();

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Logo & Wordmark */}
        <Link
          to="/"
          className="flex items-center gap-3 whitespace-nowrap shrink-0 group focus:outline-none"
        >
          <img
            src={LOGO_URL}
            alt="Imam's Fashion Logo"
            referrerPolicy="no-referrer"
            className="h-14 w-14 object-contain transition-transform duration-200 group-hover:scale-105"
          />
          <span className="font-display text-2xl font-bold tracking-tight text-[#071B49] whitespace-nowrap shrink-0">
            {BUSINESS_NAME}
          </span>
        </Link>

        {/* Zone 2: Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium">
          {navLinks.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`whitespace-nowrap shrink-0 py-1.5 transition-colors relative ${
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

        {/* Zone 3: Primary Account / Admin Action */}
        <div className="hidden md:flex items-center gap-3 shrink-0">
          {profile ? (
            <>
              {role === 'admin' && (
                <Link
                  to="/admin/dashboard"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#39D353] text-white text-sm font-semibold hover:bg-[#2eb846] transition-colors whitespace-nowrap shrink-0 shadow-xs"
                >
                  <span>Admin Dashboard</span>
                </Link>
              )}
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#071B49] text-white text-sm font-semibold hover:bg-[#0c296b] transition-colors whitespace-nowrap shrink-0"
              >
                <User className="w-4 h-4 text-[#39D353]" />
                <span className="truncate max-w-[140px]">{profile.fullName.split(' ')[0]}</span>
              </Link>
            </>
          ) : (
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#39D353] text-white text-sm font-semibold shadow-sm hover:bg-[#2eb846] transition-colors whitespace-nowrap shrink-0"
            >
              <User className="w-4 h-4" />
              <span>Account / Sign In</span>
            </Link>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          aria-label="Toggle navigation menu"
          className="md:hidden inline-flex items-center justify-center p-2.5 rounded-lg text-[#071B49] hover:bg-slate-100 transition-colors"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Responsive Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 px-4 pt-3 pb-6 space-y-2 shadow-lg">
          {navLinks.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                  active
                    ? 'bg-[#071B49]/5 text-[#071B49] font-semibold'
                    : 'text-slate-700 hover:bg-slate-50 hover:text-[#071B49]'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
            {profile ? (
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[#071B49] text-white text-sm font-semibold"
              >
                <User className="w-4 h-4 text-[#39D353]" />
                <span>My Account ({profile.fullName})</span>
              </Link>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg border border-[#071B49] text-[#071B49] text-sm font-semibold hover:bg-slate-50"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-[#39D353] text-white text-sm font-semibold hover:bg-[#2eb846]"
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
