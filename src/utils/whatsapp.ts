import { ReportData, TechSettings } from '../types';
import { buildWhatsAppMessage } from './formatters';

/**
 * Converts a base64 Data URL to a File object
 */
export async function dataUrlToFile(dataUrl: string, fileName: string): Promise<File> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], fileName, { type: blob.type || 'image/jpeg' });
}

/**
 * Converts a base64 Data URL to a PNG Blob for clipboard copy
 */
export async function dataUrlToPngBlob(dataUrl: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Canvas toBlob failed'));
        }, 'image/png');
      } else {
        reject(new Error('Context 2d failed'));
      }
    };
    img.onerror = (err) => reject(err);
    img.src = dataUrl;
  });
}

export interface ShareResult {
  success: boolean;
  method: 'web-share' | 'clipboard-and-url' | 'url-only' | 'cancelled';
  copiedPhoto?: boolean;
  message?: string;
}

/**
 * Main helper to share a report via WhatsApp with photos and recipient choice
 */
export async function shareReportToWhatsApp(
  data: ReportData,
  settings?: TechSettings,
  overridePhone?: string
): Promise<ShareResult> {
  const messageText = buildWhatsAppMessage(data, settings);
  const phoneToUse = overridePhone !== undefined ? overridePhone : (data.whatsappDestinatario || '');
  
  let cleanPhone = phoneToUse.replace(/\D/g, '');
  if (cleanPhone.length === 10 || cleanPhone.length === 11) {
    cleanPhone = '55' + cleanPhone;
  }

  const hasPhotos = data.fotos && data.fotos.length > 0;

  // 1. Try Native Web Share API Level 2 (Supported on Mobile Browsers & native share)
  if (hasPhotos && typeof navigator !== 'undefined' && navigator.share) {
    try {
      const filesToShare: File[] = [];
      for (let i = 0; i < data.fotos.length; i++) {
        const file = await dataUrlToFile(data.fotos[i], `evidencia_${i + 1}.jpg`);
        filesToShare.push(file);
      }

      if (navigator.canShare && navigator.canShare({ files: filesToShare })) {
        await navigator.share({
          title: `Relatório Técnico #${data.ticket || 'S/N'} - ${data.cliente || ''}`,
          text: messageText,
          files: filesToShare,
        });
        return {
          success: true,
          method: 'web-share',
          message: 'Relatório e foto(s) compartilhados diretamente no WhatsApp!',
        };
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { success: false, method: 'cancelled', message: 'Compartilhamento cancelado.' };
      }
      console.warn('Web Share com arquivos não suportado ou falhou. Usando fallback:', err);
    }
  }

  // 2. Fallback for Desktop or browsers without Web Share file support:
  // Copy the primary photo to clipboard so user can press Ctrl+V / Paste in WhatsApp Web
  let copiedPhotoSuccess = false;
  if (hasPhotos && typeof navigator !== 'undefined' && navigator.clipboard && typeof ClipboardItem !== 'undefined') {
    try {
      const pngBlob = await dataUrlToPngBlob(data.fotos[0]);
      await navigator.clipboard.write([
        new ClipboardItem({
          [pngBlob.type]: pngBlob,
        }),
      ]);
      copiedPhotoSuccess = true;
    } catch (clipErr) {
      console.warn('Não foi possível copiar foto para área de transferência:', clipErr);
    }
  }

  // 3. Open WhatsApp Web or Mobile App link
  const encodedText = encodeURIComponent(messageText);
  let whatsappUrl = '';

  if (cleanPhone) {
    whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
  } else {
    whatsappUrl = `https://api.whatsapp.com/send?text=${encodedText}`;
  }

  window.open(whatsappUrl, '_blank');

  return {
    success: true,
    method: 'clipboard-and-url',
    copiedPhoto: copiedPhotoSuccess,
    message: copiedPhotoSuccess
      ? 'WhatsApp aberto! A foto foi copiada para sua Área de Transferência (Ctrl+V para colar no WhatsApp).'
      : 'WhatsApp aberto com a mensagem formatada!',
  };
}
