import { activeSupabaseUrl } from '../lib/supabase.ts';

export const LOGO_URL = '/assets/aistudio/Imam_s_Fashion_Crest_Logo_74895f44.png';
export const MENS_COVER_URL =
  '/assets/aistudio/African_Suits_for_Men_Single_Breasted_Blazer_and__b8c7b0e9.jpg';
export const WOMENS_COVER_URL = '/assets/aistudio/luxury___ff2eab6e.jpg';

export const BUSINESS_NAME = "Imam's Fashion";
export const FOUNDER_NAME = 'Mohammed Abdul Rashid';
export const FOUNDER_EMAILS = [
  'mohammedabdulrashid@gmail.com',
  'mohammedabdulrashid939@gmail.com',
];

export function isFounderEmail(email?: string | null): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  return (
    FOUNDER_EMAILS.includes(clean) ||
    /^mohammedabdulrashid\d*@gmail\.com$/.test(clean)
  );
}

export const LOCATION_TEXT = 'Accra Zongo Lane, opposite K-F-M, Ghana';
export const LOCATION_SHORT = 'Accra Zongo Lane, opposite K-F-M';
export const WHATSAPP_LOCAL = '0245198198';
export const WHATSAPP_INTL = '233245198198';
export const WHATSAPP_DISPLAY_INTL = '+233245198198';
export const CURRENCY = 'GH₵';

export function getPublicStyleImageUrl(
  styleOrImageUrl?:
    | Pick<FashionStyleItem, 'imageUrl' | 'storagePath' | 'category' | 'id'>
    | string,
  storagePath?: string
): string {
  const rawUrl =
    typeof styleOrImageUrl === 'string'
      ? styleOrImageUrl.trim()
      : (styleOrImageUrl?.imageUrl || '').trim();
  const rawStoragePath =
    typeof styleOrImageUrl === 'string'
      ? (storagePath || '').trim()
      : (styleOrImageUrl?.storagePath || storagePath || '').trim();

  // 1. Direct public HTTP/HTTPS URL (e.g., Supabase Storage public URL)
  if (/^https?:\/\//i.test(rawUrl)) {
    return rawUrl;
  }

  // 2. Construct Supabase Storage public URL from storagePath if available
  if (
    rawStoragePath &&
    (rawStoragePath.startsWith('product-images/') ||
      rawStoragePath.startsWith('fashion-styles/'))
  ) {
    const cleanPath = rawStoragePath.replace(/^\/+/, '');
    return `${activeSupabaseUrl}/storage/v1/object/public/${cleanPath}`;
  }

  // 3. Resolve root-relative asset URLs against current site origin
  if (rawUrl.startsWith('/') && typeof window !== 'undefined') {
    return `${window.location.origin}${rawUrl}`;
  }

  // 4. Fallback to direct style deep link if image is an inline data URL without storage path
  if (
    typeof styleOrImageUrl === 'object' &&
    styleOrImageUrl !== null &&
    'category' in styleOrImageUrl &&
    styleOrImageUrl.category &&
    typeof window !== 'undefined'
  ) {
    const catPath = styleOrImageUrl.category === 'women' ? '/women' : '/men';
    const idParam = styleOrImageUrl.id ? `?style=${styleOrImageUrl.id}` : '';
    return `${window.location.origin}${catPath}${idParam}`;
  }

  return typeof window !== 'undefined' ? window.location.origin : '';
}

export function getStyleWhatsAppUrl(
  styleOrTitle:
    | Pick<FashionStyleItem, 'title' | 'imageUrl' | 'storagePath' | 'category' | 'id'>
    | string,
  imageUrl?: string,
  storagePath?: string
): string {
  const designName =
    typeof styleOrTitle === 'string'
      ? styleOrTitle.trim()
      : (styleOrTitle.title || 'Fashion Design').trim();

  const designImageUrl =
    typeof styleOrTitle === 'string'
      ? getPublicStyleImageUrl(imageUrl, storagePath)
      : getPublicStyleImageUrl(styleOrTitle);

  const lines = [
    "Hello Imam's Fashion!",
    '',
    'I am interested in this fashion design:',
    '',
    `Design Name: ${designName}`,
    '',
    `Design Image: ${designImageUrl}`,
    '',
    'Please provide more information about this outfit.',
    '',
    'Thank you!',
  ];

  const message = lines.join('\n');
  return `https://wa.me/${WHATSAPP_INTL}?text=${encodeURIComponent(message)}`;
}

export function getGeneralWhatsAppUrl(customMessage?: string): string {
  const message =
    customMessage ||
    "Hello Imam's Fashion! I would like to inquire about your fashion styles and tailoring services.";
  return `https://wa.me/${WHATSAPP_INTL}?text=${encodeURIComponent(message)}`;
}

export interface FashionStyleItem {
  id: number;
  title: string;
  description: string;
  category: 'men' | 'women';
  imageUrl: string;
  storagePath: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfileRecord {
  id: number;
  uid: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  accountStatus: string;
  createdAt: string;
  role?: 'admin' | 'customer';
}

export async function compressAndReadImageFile(
  file: File,
  onProgress?: (percent: number) => void
): Promise<{ dataUrl: string; mimeType: string; fileName: string }> {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const fileType = file.type.toLowerCase();
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const validExt = ['jpg', 'jpeg', 'png', 'webp'].includes(ext);

  if (!allowedTypes.includes(fileType) && !validExt) {
    throw new Error('Please select a valid JPG, JPEG, PNG, or WebP image file.');
  }

  if (onProgress) onProgress(15);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read the selected image file.'));
    reader.onload = () => {
      if (onProgress) onProgress(45);
      const rawDataUrl = reader.result as string;
      const img = new Image();
      img.onerror = () => reject(new Error('Selected file could not be decoded as an image.'));
      img.onload = () => {
        try {
          const maxDim = 1100;
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            if (onProgress) onProgress(100);
            return resolve({
              dataUrl: rawDataUrl,
              mimeType: 'image/jpeg',
              fileName: file.name,
            });
          }

          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          const outputMime = 'image/jpeg';
          const compressedDataUrl = canvas.toDataURL(outputMime, 0.84);
          if (onProgress) onProgress(85);
          resolve({
            dataUrl: compressedDataUrl,
            mimeType: outputMime,
            fileName: file.name.replace(/\.[^.]+$/, '') + '.jpg',
          });
        } catch {
          if (onProgress) onProgress(100);
          resolve({
            dataUrl: rawDataUrl,
            mimeType: fileType || 'image/jpeg',
            fileName: file.name,
          });
        }
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  });
}
