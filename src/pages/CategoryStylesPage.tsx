import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search, ArrowLeft, RefreshCw, MessageCircle, Scissors } from 'lucide-react';
import {
  FashionStyleItem,
  getGeneralWhatsAppUrl,
} from '../constants/brand.ts';
import { supabase, isSupabaseConfigured } from '../lib/supabase.ts';
import { StyleCard } from '../components/StyleCard.tsx';
import { ImageLightboxModal } from '../components/ImageLightboxModal.tsx';

interface CategoryStylesPageProps {
  category: 'men' | 'women';
}

export const CategoryStylesPage: React.FC<CategoryStylesPageProps> = ({ category }) => {
  const [styles, setStyles] = useState<FashionStyleItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [previewStyle, setPreviewStyle] = useState<FashionStyleItem | null>(null);

  const isMen = category === 'men';
  const pageTitle = isMen ? "Men's Fashion Styles" : "Women's Fashion Styles";
  const pageDescription = isMen
    ? "Discover elegant men's fashion, classic suits, traditional outfits, and unique designs tailored to your style."
    : 'Explore beautiful African prints, elegant dresses, and stunning designs for every occasion.';
  const emptyStateMessage = isMen
    ? "No men's fashion styles available yet. Please check back soon."
    : "No women's fashion styles available yet. Please check back soon.";

  const fetchStyles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error: sbError } = await supabase
          .from('fashion_styles')
          .select('*')
          .eq('category', category)
          .eq('is_published', true)
          .order('created_at', { ascending: false });

        if (!sbError && data) {
          const mapped: FashionStyleItem[] = data.map((row: any) => ({
            id: row.id,
            title: row.title,
            description: row.description,
            category: row.category,
            imageUrl: row.image_url,
            storagePath: row.storage_path,
            isPublished: row.is_published,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
          }));
          setStyles(mapped);
          return;
        }

        // If Supabase table is not yet in PostgREST schema cache, try API fallback or show empty state cleanly
        if (
          sbError &&
          (sbError.message.includes('schema cache') ||
            sbError.message.includes('does not exist') ||
            sbError.code === 'PGRST205' ||
            sbError.code === '42P01')
        ) {
          try {
            const fallbackRes = await fetch(`/api/styles?category=${category}`);
            if (fallbackRes.ok) {
              const fallbackData = await fallbackRes.json();
              setStyles(Array.isArray(fallbackData.styles) ? fallbackData.styles : []);
              return;
            }
          } catch {
            // Static host without /api/styles
          }
          setStyles([]);
          return;
        }

        if (sbError) {
          throw new Error(sbError.message);
        }
      }

      const res = await fetch(`/api/styles?category=${category}`);
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        setStyles([]);
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load styles.');
      }
      setStyles(Array.isArray(data.styles) ? data.styles : []);
    } catch (err: any) {
      setError(err.message || 'Unable to load fashion styles right now.');
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    setSearchQuery('');
    fetchStyles();
  }, [fetchStyles]);

  const filteredStyles = styles.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-slate-50/60 pb-20">
      {/* Category Header Banner */}
      <section className="bg-[#071B49] text-white py-14 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-3">
              <Link
                to="/"
                className="inline-flex items-center gap-2 text-xs font-medium text-[#39D353] hover:underline"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Homepage</span>
              </Link>
              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white">
                {pageTitle}
              </h1>
              <p className="text-sm sm:text-base text-slate-300 max-w-2xl">
                {pageDescription}
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <Link
                to={isMen ? '/women' : '/men'}
                className="px-4 py-2.5 rounded-xl border border-white/20 text-xs sm:text-sm font-medium text-white hover:bg-white/10 transition-colors whitespace-nowrap shrink-0"
              >
                {isMen ? "Switch to Women's Styles" : "Switch to Men's Styles"}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        {/* Search Bar when styles exist */}
        {styles.length > 0 && (
          <div className="mb-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="relative max-w-md w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search ${isMen ? "men's" : "women's"} styles...`}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-[#071B49] placeholder:text-slate-400 focus:outline-none focus:border-[#071B49]"
              />
            </div>

            <div className="text-xs text-slate-500 font-mono-tabular">
              Showing {filteredStyles.length} of {styles.length} published{' '}
              {styles.length === 1 ? 'style' : 'styles'}
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden animate-pulse"
              >
                <div className="aspect-[3/4] bg-slate-200" />
                <div className="p-6 space-y-3">
                  <div className="h-3 w-24 bg-slate-200 rounded" />
                  <div className="h-6 w-3/4 bg-slate-200 rounded" />
                  <div className="h-4 w-full bg-slate-200 rounded" />
                  <div className="h-11 w-full bg-slate-200 rounded-xl mt-4" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="bg-white rounded-2xl border border-red-200 p-8 text-center max-w-lg mx-auto my-8 space-y-4">
            <p className="text-sm font-medium text-red-700">{error}</p>
            <button
              type="button"
              onClick={fetchStyles}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#071B49] text-white text-sm font-semibold hover:bg-[#0c296b] transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Try Again</span>
            </button>
          </div>
        )}

        {/* Empty State (Required exact copy when no styles are uploaded) */}
        {!loading && !error && styles.length === 0 && (
          <div className="bg-white rounded-3xl border border-slate-200/90 p-10 sm:p-16 text-center max-w-2xl mx-auto my-8 space-y-6 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-[#071B49]/5 text-[#071B49] flex items-center justify-center mx-auto">
              <Scissors className="w-8 h-8 text-[#39D353]" />
            </div>

            <div className="space-y-2">
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#071B49]">
                {emptyStateMessage}
              </h2>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                Have a custom outfit in mind? You can message our tailoring team directly on
                WhatsApp to discuss your bespoke design.
              </p>
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
              <a
                href={getGeneralWhatsAppUrl(
                  `Hello Imam's Fashion, I am browsing your ${
                    isMen ? "Men's" : "Women's"
                  } Fashion page and would like to inquire about a custom outfit.`
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#39D353] text-white text-sm font-semibold hover:bg-[#2eb846] transition-colors shadow-sm"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Inquire on WhatsApp</span>
              </a>
              <Link
                to="/"
                className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl border border-slate-300 text-[#071B49] text-sm font-semibold hover:bg-slate-50 transition-colors"
              >
                <span>Return to Homepage</span>
              </Link>
            </div>
          </div>
        )}

        {/* Search No-Match State */}
        {!loading && !error && styles.length > 0 && filteredStyles.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center max-w-lg mx-auto my-8 space-y-3">
            <p className="text-base font-semibold text-[#071B49]">
              No styles matched &ldquo;{searchQuery}&rdquo;
            </p>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-sm font-semibold text-[#39D353] hover:underline"
            >
              Clear search filter
            </button>
          </div>
        )}

        {/* Styles Grid */}
        {!loading && !error && filteredStyles.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredStyles.map((style) => (
              <StyleCard
                key={style.id}
                style={style}
                onPreview={(selected) => setPreviewStyle(selected)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Lightbox Image Preview Modal */}
      <ImageLightboxModal style={previewStyle} onClose={() => setPreviewStyle(null)} />
    </div>
  );
};
