import React, { useState } from 'react';
import { MessageCircle, Maximize2, Scissors } from 'lucide-react';
import { FashionStyleItem, getStyleWhatsAppUrl } from '../constants/brand.ts';

interface StyleCardProps {
  style: FashionStyleItem;
  onPreview: (style: FashionStyleItem) => void;
}

export const StyleCard: React.FC<StyleCardProps> = ({ style, onPreview }) => {
  const [imgError, setImgError] = useState(false);
  const whatsappLink = getStyleWhatsAppUrl(style);
  const categoryLabel = style.category === 'men' ? "Men's Collection" : "Women's Collection";

  return (
    <article className="group disco-card-wrapper flex flex-col h-full">
      <div className="disco-card-inner flex-1 flex flex-col">
        {/* Animated 4-Color LED Frame Around Uploaded Fashion Style Image */}
        <div className="disco-image-frame rounded-t-[16px]">
          <div className="relative h-[360px] sm:h-[400px] md:h-[420px] lg:h-[440px] w-full bg-gradient-to-b from-slate-50 via-slate-100/90 to-slate-200/60 overflow-hidden rounded-t-[13px] flex items-center justify-center p-2 sm:p-3">
            {!imgError ? (
              <img
                src={style.imageUrl}
                alt={style.title}
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                onClick={() => onPreview(style)}
                className="w-full h-full object-contain object-center cursor-pointer transition-transform duration-300 sm:group-hover:scale-[1.02]"
              />
            ) : (
              <div
                onClick={() => onPreview(style)}
                className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#071B49] to-[#0e2d73] text-white p-6 text-center cursor-pointer rounded-lg"
              >
                <Scissors className="w-10 h-10 text-[#39D353] mb-3" />
                <span className="font-display text-xl font-semibold">{style.title}</span>
              </div>
            )}

            {/* Enlarge Preview Affordance — Always Accessible on Mobile & Laptop */}
            <button
              type="button"
              onClick={() => onPreview(style)}
              aria-label={`Preview larger image of ${style.title}`}
              title="View full image"
              className="absolute top-3 right-3 inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-[#071B49]/85 text-white text-xs font-medium backdrop-blur-sm opacity-95 group-hover:opacity-100 transition-all hover:bg-[#071B49] shadow-sm cursor-pointer"
            >
              <Maximize2 className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Enlarge</span>
            </button>
          </div>
        </div>

        {/* Flowing 4-Color LED Accent Strip Between Image and Details */}
        <div className="disco-led-strip shrink-0" aria-hidden="true" />

        {/* Content Container — Uncovered & Crystal Clear */}
        <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-5 bg-white">
          <div className="space-y-2">
            {/* Clean Unboxed Metadata */}
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="uppercase tracking-wider font-medium text-[#071B49]/75">
                {categoryLabel}
              </span>
              <span aria-hidden="true">·</span>
              <span>Bespoke Tailoring</span>
            </div>

            <h3 className="font-display text-2xl font-bold text-[#071B49] leading-snug">
              {style.title}
            </h3>

            <p className="text-sm text-slate-600 leading-relaxed">
              {style.description}
            </p>
          </div>

          {/* Direct WhatsApp Contact Button */}
          <div className="pt-2">
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#39D353] text-white text-sm font-semibold hover:bg-[#2eb846] transition-colors shadow-sm whitespace-nowrap shrink-0"
            >
              <MessageCircle className="w-4 h-4 shrink-0" />
              <span>Inquire on WhatsApp</span>
            </a>
          </div>
        </div>
      </div>
    </article>
  );
};
