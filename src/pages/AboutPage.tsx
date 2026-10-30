import React from 'react';
import { Link } from 'react-router-dom';
import { Scissors, Award, HeartHandshake, MapPin, MessageCircle, ArrowRight } from 'lucide-react';
import {
  LOGO_URL,
  BUSINESS_NAME,
  FOUNDER_NAME,
  LOCATION_TEXT,
  WHATSAPP_LOCAL,
  getGeneralWhatsAppUrl,
} from '../constants/brand.ts';

export const AboutPage: React.FC = () => {
  return (
    <div className="bg-white">
      {/* Header Banner */}
      <section className="bg-[#071B49] text-white py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl space-y-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#39D353] font-semibold">
              <span>Accra Zongo Lane</span>
              <span aria-hidden="true">·</span>
              <span>Est. by {FOUNDER_NAME}</span>
            </div>
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-white">
              About {BUSINESS_NAME}
            </h1>
            <p className="text-base sm:text-lg text-slate-200 leading-relaxed">
              Imam&apos;s Fashion is dedicated to creating and showcasing elegant fashion styles for
              men and women. We celebrate creativity, African fashion, quality craftsmanship, and
              unique designs.
            </p>
          </div>
        </div>
      </section>

      {/* Main Story & Values */}
      <section className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-5 flex justify-center">
              <div className="bg-slate-50 border border-slate-200 rounded-3xl p-10 text-center space-y-6 w-full max-w-md">
                <img
                  src={LOGO_URL}
                  alt="Imam's Fashion Crest"
                  referrerPolicy="no-referrer"
                  className="w-56 h-56 mx-auto object-contain"
                />
                <div className="space-y-1">
                  <h2 className="font-display text-2xl font-bold text-[#071B49]">
                    {FOUNDER_NAME}
                  </h2>
                  <p className="text-xs uppercase tracking-widest text-slate-500">
                    Founder &amp; Creative Director
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 space-y-6">
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#071B49]">
                Crafting Confidence for Every Occasion
              </h2>
              <p className="text-base text-slate-600 leading-relaxed">
                Located in the heart of Accra at Zongo Lane, opposite K-F-M, {BUSINESS_NAME}{' '}
                combines traditional Ghanaian tailoring heritage with contemporary design
                sensibilities. Whether you are preparing for a royal wedding, a corporate milestone,
                Friday Jummah prayers, or a special celebration, every piece is tailored to honour
                your individuality.
              </p>
              <p className="text-base text-slate-600 leading-relaxed">
                Under the leadership of founder {FOUNDER_NAME}, our atelier specializes in both
                distinguished menswear—including single-breasted blazers, kaftans, agbadas, and
                ceremonial suits—and vibrant womenswear featuring intricate African-print silhouettes
                and bespoke evening gowns.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4">
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <Scissors className="w-6 h-6 text-[#39D353]" />
                  <h3 className="text-base font-bold text-[#071B49]">Bespoke Fit</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Tailored measurements and personal fittings for an impeccable silhouette.
                  </p>
                </div>
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <Award className="w-6 h-6 text-[#39D353]" />
                  <h3 className="text-base font-bold text-[#071B49]">Finest Materials</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Curated textiles, premium suiting fabrics, and authentic African wax prints.
                  </p>
                </div>
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <HeartHandshake className="w-6 h-6 text-[#39D353]" />
                  <h3 className="text-base font-bold text-[#071B49]">Personal Service</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Direct WhatsApp consultation from style selection through final fitting.
                  </p>
                </div>
              </div>

              <div className="pt-4 flex flex-wrap items-center gap-4">
                <Link
                  to="/men"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#071B49] text-white text-sm font-semibold hover:bg-[#0c296b] transition-colors"
                >
                  <span>Explore Men&apos;s Styles</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/women"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#39D353] text-white text-sm font-semibold hover:bg-[#2eb846] transition-colors"
                >
                  <span>Explore Women&apos;s Styles</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Studio Visit Strip */}
      <section className="py-16 bg-slate-50 border-t border-slate-200/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-5">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#071B49]">
            <MapPin className="w-4 h-4 text-[#39D353]" />
            <span>{LOCATION_TEXT}</span>
          </div>
          <h2 className="font-display text-3xl font-bold text-[#071B49]">
            Ready to Commission Your Next Outfit?
          </h2>
          <p className="text-sm sm:text-base text-slate-600 max-w-xl mx-auto">
            Reach out directly on WhatsApp ({WHATSAPP_LOCAL}) to schedule a measurement session or
            inquire about any style in our catalog.
          </p>
          <div className="pt-2">
            <a
              href={getGeneralWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-7 py-4 rounded-xl bg-[#39D353] text-white text-base font-semibold hover:bg-[#2eb846] transition-colors shadow-sm"
            >
              <MessageCircle className="w-5 h-5" />
              <span>Chat with Imam&apos;s Fashion</span>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};
