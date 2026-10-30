import React, { useState } from 'react';
import { MessageCircle, Maximize2, Scissors } from 'lucide-react';
import { FashionStyleItem, getStyleWhatsAppUrl } from '../constants/brand.ts';

interface StyleCardProps {
  style: FashionStyleItem;
  onPreview: (style: FashionStyleItem) => void;
}

export const StyleCard: React.FC<StyleCardProps> = ({ style, onPreview }) => {
  const [imgError, setImgError] = useState(false);
  const whatsappLink = getStyleWhatsAppUrl(style.title);
  const categoryLabel = style.category === 'men' ? "Men's Collection" : "Women's Collection";

  return (
    <article className="group bg-white rounded-2xl border border-slate-200/90 overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg flex flex-col">
      {/* Image Container (70% height emphasis) */}
      <div className="relative aspect-[3/4] w-full bg-slate-100 overflow-hidden">
        {!imgError ? (
          <img
            src={style.imageUrl}
            alt={style.title}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            onClick={() => onPreview(style)}
            className="w-full h-full object-cover object-top cursor-pointer transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div
            onClick={() => onPreview(style)}
            className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#071B49] to-[#0e2d73] text-white p-6 text-center cursor-pointer"
          >
            <Scissors className="w-10 h-10 text-[#39D353] mb-3" />
            <span className="font-display text-xl font-semibold">{style.title}</span>
          </div>
        )}

        {/* Enlarge Preview Affordance */}
        <button
          type="button"
          onClick={() => onPreview(style)}
          aria-label={`Preview larger image of ${style.title}`}
          className="absolute top-3 right-3 p-2.5 rounded-lg bg-[#071B49]/80 text-white backdrop-blur-sm opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:bg-[#071B49]"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* Content Container */}
      <div className="p-6 flex-1 flex flex-col justify-between space-y-5">
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

          <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">
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
    </article>
  );
};
