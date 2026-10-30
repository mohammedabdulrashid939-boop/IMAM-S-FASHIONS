export const LOGO_URL = '/assets/aistudio/Imam_s_Fashion_Crest_Logo_74895f44.png';
export const MENS_COVER_URL =
  '/assets/aistudio/African_Suits_for_Men_Single_Breasted_Blazer_and__b8c7b0e9.jpg';
export const WOMENS_COVER_URL = '/assets/aistudio/luxury___ff2eab6e.jpg';

export const BUSINESS_NAME = "Imam's Fashion";
export const FOUNDER_NAME = 'Mohammed Abdul Rashid';
export const LOCATION_TEXT = 'Accra Zongo Lane, opposite K-F-M, Ghana';
export const LOCATION_SHORT = 'Accra Zongo Lane, opposite K-F-M';
export const WHATSAPP_LOCAL = '0245198198';
export const WHATSAPP_INTL = '233245198198';
export const WHATSAPP_DISPLAY_INTL = '+233245198198';
export const CURRENCY = 'GH₵';

export function getStyleWhatsAppUrl(styleTitle: string): string {
  const message = `Hello Imam's Fashion, I am interested in your ${styleTitle}. Please provide more information.`;
  return `https://wa.me/${WHATSAPP_INTL}?text=${encodeURIComponent(message)}`;
}

export function getGeneralWhatsAppUrl(customMessage?: string): string {
  const message =
    customMessage ||
    "Hello Imam's Fashion, I would like to inquire about your fashion styles and tailoring services.";
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
          const maxDim = 1400;
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
              mimeType: fileType || 'image/jpeg',
              fileName: file.name,
            });
          }

          ctx.drawImage(img, 0, 0, width, height);
          const outputMime = fileType === 'image/png' ? 'image/png' : 'image/webp';
          const compressedDataUrl = canvas.toDataURL(outputMime, 0.86);
          if (onProgress) onProgress(85);
          resolve({
            dataUrl: compressedDataUrl,
            mimeType: outputMime,
            fileName: file.name,
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
