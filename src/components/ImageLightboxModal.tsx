import React, { useEffect } from 'react';
import { X, MessageCircle, MapPin } from 'lucide-react';
import { FashionStyleItem, getStyleWhatsAppUrl, LOCATION_SHORT } from '../constants/brand.ts';

interface ImageLightboxModalProps {
  style: FashionStyleItem | null;
  onClose: () => void;
}

export const ImageLightboxModal: React.FC<ImageLightboxModalProps> = ({ style, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (style) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [style, onClose]);

  if (!style) return null;

  const whatsappUrl = getStyleWhatsAppUrl(style.title);
  const categoryLabel = style.category === 'men' ? "Men's Fashion Style" : "Women's Fashion Style";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#071B49]/85 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl max-w-4xl w-full overflow-hidden shadow-2xl grid grid-cols-1 md:grid-cols-12 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close preview"
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-[#071B49]/80 text-white hover:bg-[#071B49] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Full Image View */}
        <div className="md:col-span-7 bg-slate-950 flex items-center justify-center max-h-[75vh]">
          <img
            src={style.imageUrl}
            alt={style.title}
            referrerPolicy="no-referrer"
            className="max-h-[75vh] w-full object-contain"
          />
        </div>

        {/* Details & WhatsApp CTA */}
        <div className="md:col-span-5 p-6 sm:p-8 flex flex-col justify-between bg-white">
          <div className="space-y-4">
            <div className="text-xs text-slate-500 flex items-center gap-2">
              <span className="uppercase tracking-wider font-semibold text-[#071B49]">
                {categoryLabel}
              </span>
              <span aria-hidden="true">·</span>
              <span>Imam&apos;s Fashion</span>
            </div>

            <h2 className="font-display text-3xl font-bold text-[#071B49] leading-tight">
              {style.title}
            </h2>

            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
              {style.description}
            </p>
          </div>

          <div className="pt-8 mt-8 border-t border-slate-100 space-y-4">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <MapPin className="w-4 h-4 text-[#39D353] shrink-0" />
              <span>Tailored at {LOCATION_SHORT}, Ghana</span>
            </div>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-[#39D353] text-white text-sm font-semibold hover:bg-[#2eb846] transition-colors shadow-sm"
            >
              <MessageCircle className="w-5 h-5" />
              <span>Order / Inquire via WhatsApp</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
