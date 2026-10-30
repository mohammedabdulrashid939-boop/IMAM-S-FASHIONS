import React, { useState } from 'react';
import { MapPin, Phone, MessageCircle, Clock, Send } from 'lucide-react';
import {
  BUSINESS_NAME,
  LOCATION_SHORT,
  WHATSAPP_LOCAL,
  WHATSAPP_DISPLAY_INTL,
  WHATSAPP_INTL,
  getGeneralWhatsAppUrl,
} from '../constants/brand.ts';

export const ContactPage: React.FC = () => {
  const [visitorName, setVisitorName] = useState('');
  const [categoryInterest, setCategoryInterest] = useState("Men's Fashion");
  const [inquiryNotes, setInquiryNotes] = useState('');

  const handleOpenWhatsAppCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const parts = [
      `Hello ${BUSINESS_NAME},`,
      visitorName.trim() ? `My name is ${visitorName.trim()}.` : '',
      `I am interested in ${categoryInterest}.`,
      inquiryNotes.trim() ? inquiryNotes.trim() : 'Please provide more information on your tailoring services.',
    ].filter(Boolean);

    const url = `https://wa.me/${WHATSAPP_INTL}?text=${encodeURIComponent(parts.join(' '))}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="bg-slate-50/70 min-h-screen pb-20">
      {/* Banner */}
      <section className="bg-[#071B49] text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl space-y-3">
            <span className="text-xs uppercase tracking-widest text-[#39D353] font-semibold">
              Get In Touch
            </span>
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-white">
              Contact {BUSINESS_NAME}
            </h1>
            <p className="text-base text-slate-300 leading-relaxed">
              Connect with our tailoring team in Accra or start a direct WhatsApp conversation for
              inquiries, fittings, and custom orders.
            </p>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left Column: Direct Business Info */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200/90 p-8 space-y-6 shadow-sm">
              <div className="space-y-2">
                <h2 className="font-display text-3xl font-bold text-[#071B49]">
                  {BUSINESS_NAME}
                </h2>
                <p className="text-sm text-slate-600">
                  Bespoke African &amp; Contemporary Tailoring Studio
                </p>
              </div>

              <div className="space-y-5 pt-2">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#071B49]/5 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5 text-[#39D353]" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                      Studio Location
                    </p>
                    <p className="text-base font-semibold text-[#071B49] mt-0.5">
                      Location: {LOCATION_SHORT}, Ghana.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#071B49]/5 flex items-center justify-center shrink-0">
                    <Phone className="w-5 h-5 text-[#39D353]" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                      WhatsApp &amp; Direct Line
                    </p>
                    <p className="text-base font-semibold text-[#071B49] font-mono-tabular mt-0.5">
                      WhatsApp: {WHATSAPP_LOCAL} ({WHATSAPP_DISPLAY_INTL})
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#071B49]/5 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5 text-[#39D353]" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                      Consultation Hours
                    </p>
                    <p className="text-sm font-medium text-[#071B49] mt-0.5">
                      Monday – Saturday: 8:30 AM – 7:00 PM
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <a
                  href={getGeneralWhatsAppUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2.5 px-6 py-4 rounded-xl bg-[#39D353] text-white text-base font-semibold hover:bg-[#2eb846] transition-colors shadow-sm"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span>Open WhatsApp Chat ({WHATSAPP_LOCAL})</span>
                </a>
              </div>
            </div>
          </div>

          {/* Right Column: Direct WhatsApp Message Composer */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-3xl border border-slate-200/90 p-8 sm:p-10 shadow-sm">
              <div className="space-y-2 mb-6">
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#071B49]">
                  Send a Tailoring Inquiry via WhatsApp
                </h2>
                <p className="text-sm text-slate-600">
                  Fill in your preferences below to open a pre-filled WhatsApp conversation with{' '}
                  {BUSINESS_NAME}.
                </p>
              </div>

              <form onSubmit={handleOpenWhatsAppCustom} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#071B49] mb-2">
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={visitorName}
                    onChange={(e) => setVisitorName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-[#071B49] focus:outline-none focus:border-[#071B49]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#071B49] mb-2">
                    Collection of Interest
                  </label>
                  <select
                    value={categoryInterest}
                    onChange={(e) => setCategoryInterest(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-[#071B49] bg-white focus:outline-none focus:border-[#071B49]"
                  >
                    <option value="Men's Fashion">Men&apos;s Fashion Styles</option>
                    <option value="Women's Fashion">Women&apos;s Fashion Styles</option>
                    <option value="Custom Wedding / Event Attire">
                      Custom Wedding / Event Attire
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#071B49] mb-2">
                    Style Details or Message
                  </label>
                  <textarea
                    rows={4}
                    value={inquiryNotes}
                    onChange={(e) => setInquiryNotes(e.target.value)}
                    placeholder="Tell us about the style, occasion, or fitting appointment you would like..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-[#071B49] focus:outline-none focus:border-[#071B49]"
                  />
                </div>

                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-xl bg-[#39D353] text-white text-base font-semibold hover:bg-[#2eb846] transition-colors shadow-sm cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Continue to WhatsApp</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
