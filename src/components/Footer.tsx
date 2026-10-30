import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Phone, MessageCircle } from 'lucide-react';
import {
  LOGO_URL,
  BUSINESS_NAME,
  FOUNDER_NAME,
  LOCATION_SHORT,
  WHATSAPP_LOCAL,
  getGeneralWhatsAppUrl,
} from '../constants/brand.ts';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#071B49] text-white border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Column 1: Brand & Logo */}
          <div className="space-y-4">
            <Link to="/" className="inline-flex items-center gap-3 group">
              <div className="bg-white p-2 rounded-xl shadow-sm">
                <img
                  src={LOGO_URL}
                  alt="Imam's Fashion Logo"
                  referrerPolicy="no-referrer"
                  className="h-12 w-12 object-contain"
                />
              </div>
              <div>
                <span className="font-display text-2xl font-bold tracking-wide text-white block">
                  {BUSINESS_NAME}
                </span>
                <span className="text-xs tracking-widest uppercase text-[#39D353]">
                  Style For Every Occasion
                </span>
              </div>
            </Link>
            <p className="text-sm text-slate-300 leading-relaxed">
              Dedicated to creating and showcasing bespoke African fashion styles, classic suits, and
              elegant outfits for men and women in Accra, Ghana.
            </p>
          </div>

          {/* Column 2: Quick Navigation Links */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[#39D353] mb-4">
              Quick Navigation
            </h3>
            <ul className="space-y-2.5 text-sm text-slate-300">
              <li>
                <Link to="/" className="hover:text-white transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/men" className="hover:text-white transition-colors">
                  Men&apos;s Fashion
                </Link>
              </li>
              <li>
                <Link to="/women" className="hover:text-white transition-colors">
                  Women&apos;s Fashion
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-white transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-white transition-colors">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Collections & Customer Portal */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[#39D353] mb-4">
              Collections &amp; Account
            </h3>
            <ul className="space-y-2.5 text-sm text-slate-300">
              <li>
                <Link to="/men" className="hover:text-white transition-colors">
                  Bespoke Men&apos;s Suits &amp; Traditional Wear
                </Link>
              </li>
              <li>
                <Link to="/women" className="hover:text-white transition-colors">
                  Women&apos;s African Prints &amp; Gowns
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-white transition-colors">
                  Customer Registration
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-white transition-colors">
                  Customer Sign In
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Contact & WhatsApp */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[#39D353] mb-4">
              Contact Information
            </h3>
            <div className="space-y-3 text-sm text-slate-300">
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-[#39D353] shrink-0 mt-1" />
                <span>Location: {LOCATION_SHORT}, Ghana.</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-[#39D353] shrink-0" />
                <span>WhatsApp: {WHATSAPP_LOCAL}</span>
              </div>
            </div>
            <div className="pt-2">
              <a
                href={getGeneralWhatsAppUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-2.5 rounded-lg bg-[#39D353] text-white text-sm font-semibold hover:bg-[#2eb846] transition-colors shadow-sm whitespace-nowrap shrink-0"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Chat on WhatsApp</span>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar with Copyright & Founder Attribution */}
        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-300">
          <p>
            &copy; {currentYear} {BUSINESS_NAME}. All rights reserved. Currency: Ghana Cedis (GH₵).
          </p>
          <Link
            to="/admin/login"
            title="Administrator Portal"
            className="font-display text-base italic tracking-wide text-white/95 hover:text-[#39D353] transition-colors"
          >
            Founded by {FOUNDER_NAME}
          </Link>
        </div>
      </div>
    </footer>
  );
};
