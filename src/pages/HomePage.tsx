import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  MessageCircle,
  MapPin,
  Phone,
  Scissors,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import {
  LOGO_URL,
  MENS_COVER_URL,
  WOMENS_COVER_URL,
  BUSINESS_NAME,
  LOCATION_SHORT,
  WHATSAPP_LOCAL,
  FOUNDER_NAME,
  getGeneralWhatsAppUrl,
} from '../constants/brand.ts';

export const HomePage: React.FC = () => {
  const scrollToCategories = () => {
    const el = document.getElementById('fashion-categories');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="bg-white">
      {/* =====================================================================
          HERO SECTION
         ===================================================================== */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#071B49] via-[#092158] to-[#071B49] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 lg:py-28">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Hero Copy */}
            <div className="lg:col-span-7 space-y-6">
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#39D353] font-semibold">
                <span>Accra Zongo Lane, Ghana</span>
                <span aria-hidden="true">·</span>
                <span>Bespoke African Tailoring</span>
              </div>

              <h1
                className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.12]"
                style={{ textWrap: 'balance' }}
              >
                Discover Your Perfect Style
              </h1>

              <p className="text-base sm:text-lg text-slate-200 max-w-2xl leading-relaxed">
                Explore elegant men&apos;s and women&apos;s fashion designs crafted with creativity,
                passion, and attention to detail.
              </p>

              <div className="pt-3 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={scrollToCategories}
                  className="inline-flex items-center gap-2.5 px-7 py-4 rounded-xl bg-[#39D353] text-white text-base font-semibold hover:bg-[#2eb846] transition-all shadow-lg hover:shadow-xl cursor-pointer whitespace-nowrap shrink-0"
                >
                  <span>Explore Our Styles</span>
                  <ArrowRight className="w-5 h-5" />
                </button>

                <a
                  href={getGeneralWhatsAppUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-4 rounded-xl border border-white/25 text-white text-base font-medium hover:bg-white/10 transition-colors whitespace-nowrap shrink-0"
                >
                  <MessageCircle className="w-5 h-5 text-[#39D353]" />
                  <span>Contact via WhatsApp</span>
                </a>
              </div>
            </div>

            {/* Hero Brand Showcase Card */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="w-full max-w-md bg-white rounded-3xl p-8 sm:p-10 shadow-2xl border border-white/20 text-center space-y-6">
                <img
                  src={LOGO_URL}
                  alt="Imam's Fashion Crest Logo"
                  referrerPolicy="no-referrer"
                  className="w-56 h-56 sm:w-64 sm:h-64 mx-auto object-contain"
                />
                <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-3 text-xs text-slate-500">
                  <span>Custom Measurements</span>
                  <span aria-hidden="true">·</span>
                  <span>Luxury Fabrics</span>
                  <span aria-hidden="true">·</span>
                  <span>GH₵ Pricing</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          FASHION CATEGORIES SECTION (MEN'S & WOMEN'S COVER CARDS)
         ===================================================================== */}
      <section id="fashion-categories" className="py-20 sm:py-24 bg-slate-50/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center mb-14 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#39D353]">
              Signature Collections
            </p>
            <h2
              className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-[#071B49]"
              style={{ textWrap: 'balance' }}
            >
              Explore Our Fashion Categories
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              Select a category below to browse our latest bespoke designs for men and women.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 items-stretch">
            {/* MEN'S FASHION CARD */}
            <div className="group bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col">
              <div className="relative h-[480px] sm:h-[540px] w-full bg-slate-100 overflow-hidden">
                <img
                  src={MENS_COVER_URL}
                  alt="Men's Fashion Styles — Navy-blue bespoke suit with gold buttons"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#071B49]/75 via-transparent to-transparent" />
                <div className="absolute bottom-5 left-6 right-6 text-white">
                  <span className="text-xs uppercase tracking-widest text-[#39D353] font-semibold">
                    Bespoke Menswear
                  </span>
                </div>
              </div>

              <div className="p-8 sm:p-10 flex-1 flex flex-col justify-between space-y-6">
                <div className="space-y-3">
                  <h3 className="font-display text-3xl sm:text-4xl font-bold text-[#071B49]">
                    Men&apos;s Fashion Styles
                  </h3>
                  <p className="text-base text-slate-600 leading-relaxed">
                    Discover elegant men&apos;s fashion, classic suits, traditional outfits, and
                    unique designs tailored to your style.
                  </p>
                </div>

                <div>
                  <Link
                    to="/men"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-xl bg-[#39D353] text-white text-base font-semibold hover:bg-[#2eb846] transition-colors shadow-sm whitespace-nowrap shrink-0"
                  >
                    <span>Explore Men&apos;s Styles</span>
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </div>
              </div>
            </div>

            {/* WOMEN'S FASHION CARD */}
            <div className="group bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col">
              <div className="relative h-[480px] sm:h-[540px] w-full bg-slate-100 overflow-hidden">
                <img
                  src={WOMENS_COVER_URL}
                  alt="Women's Fashion Styles — Colorful African-print dress"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#071B49]/75 via-transparent to-transparent" />
                <div className="absolute bottom-5 left-6 right-6 text-white">
                  <span className="text-xs uppercase tracking-widest text-[#39D353] font-semibold">
                    Bespoke Womenswear
                  </span>
                </div>
              </div>

              <div className="p-8 sm:p-10 flex-1 flex flex-col justify-between space-y-6">
                <div className="space-y-3">
                  <h3 className="font-display text-3xl sm:text-4xl font-bold text-[#071B49]">
                    Women&apos;s Fashion Styles
                  </h3>
                  <p className="text-base text-slate-600 leading-relaxed">
                    Explore beautiful African prints, elegant dresses, and stunning designs for
                    every occasion.
                  </p>
                </div>

                <div>
                  <Link
                    to="/women"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-xl bg-[#39D353] text-white text-base font-semibold hover:bg-[#2eb846] transition-colors shadow-sm whitespace-nowrap shrink-0"
                  >
                    <span>Explore Women&apos;s Styles</span>
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          ABOUT US SECTION
         ===================================================================== */}
      <section className="py-20 sm:py-24 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 space-y-6">
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#39D353] font-semibold">
                <span>Our Heritage &amp; Craft</span>
                <span aria-hidden="true">·</span>
                <span>Founded by {FOUNDER_NAME}</span>
              </div>

              <h2
                className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-[#071B49]"
                style={{ textWrap: 'balance' }}
              >
                About Imam&apos;s Fashion
              </h2>

              <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
                Imam&apos;s Fashion is dedicated to creating and showcasing elegant fashion styles
                for men and women. We celebrate creativity, African fashion, quality craftsmanship,
                and unique designs.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4">
                <div className="space-y-2">
                  <Scissors className="w-6 h-6 text-[#39D353]" />
                  <h3 className="text-base font-bold text-[#071B49]">Precision Tailoring</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Every garment is cut and stitched to complement your individual posture and
                    measurements.
                  </p>
                </div>
                <div className="space-y-2">
                  <Sparkles className="w-6 h-6 text-[#39D353]" />
                  <h3 className="text-base font-bold text-[#071B49]">Authentic Fabrics</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Rich African prints, fine suiting wools, and hand-selected embellishments.
                  </p>
                </div>
                <div className="space-y-2">
                  <CheckCircle2 className="w-6 h-6 text-[#39D353]" />
                  <h3 className="text-base font-bold text-[#071B49]">Every Occasion</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Distinguished attire for weddings, executive events, celebrations, and everyday
                    elegance.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  to="/about"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[#071B49] hover:text-[#39D353] transition-colors"
                >
                  <span>Read more about Imam&apos;s Fashion</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="bg-[#071B49] rounded-3xl p-8 sm:p-12 text-white space-y-6">
                <div className="flex items-center gap-4">
                  <div className="bg-white p-3 rounded-2xl shrink-0">
                    <img
                      src={LOGO_URL}
                      alt="Imam's Fashion Logo"
                      referrerPolicy="no-referrer"
                      className="w-16 h-16 object-contain"
                    />
                  </div>
                  <div>
                    <h3 className="font-display text-2xl sm:text-3xl font-bold text-white">
                      {BUSINESS_NAME}
                    </h3>
                    <p className="text-xs uppercase tracking-widest text-[#39D353]">
                      Style For Every Occasion
                    </p>
                  </div>
                </div>

                <blockquote className="font-display text-xl sm:text-2xl italic text-slate-100 leading-relaxed">
                  &ldquo;Our mission in Accra is to blend timeless African artistry with modern
                  tailoring precision—giving every gentleman and lady confidence in what they
                  wear.&rdquo;
                </blockquote>

                <div className="pt-4 border-t border-white/15 flex flex-wrap items-center justify-between gap-4 text-sm text-slate-300">
                  <span>{FOUNDER_NAME}, Founder &amp; Master Tailor</span>
                  <span>{LOCATION_SHORT}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          CONTACT SECTION
         ===================================================================== */}
      <section className="py-20 sm:py-24 bg-slate-50 border-t border-slate-200/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-3xl border border-slate-200/90 p-8 sm:p-12 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
              <div className="md:col-span-7 space-y-4">
                <span className="text-xs font-semibold uppercase tracking-widest text-[#39D353]">
                  Direct Consultation
                </span>
                <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#071B49]">
                  {BUSINESS_NAME}
                </h2>
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                  Visit our tailoring studio or message us directly on WhatsApp to discuss your
                  preferred design, measurements, and fabric options.
                </p>

                <div className="pt-2 space-y-3 text-sm sm:text-base text-[#071B49] font-medium">
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-[#39D353] shrink-0" />
                    <span>Location: {LOCATION_SHORT}.</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-[#39D353] shrink-0" />
                    <span className="font-mono-tabular">WhatsApp: {WHATSAPP_LOCAL}.</span>
                  </div>
                </div>
              </div>

              <div className="md:col-span-5 flex flex-col sm:flex-row md:flex-col gap-4 md:items-end">
                <a
                  href={getGeneralWhatsAppUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-xl bg-[#39D353] text-white text-base font-semibold hover:bg-[#2eb846] transition-colors shadow-md whitespace-nowrap shrink-0"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span>Message on WhatsApp</span>
                </a>
                <Link
                  to="/contact"
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border border-slate-300 text-[#071B49] text-sm font-semibold hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
                >
                  <span>View Full Contact Details</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
