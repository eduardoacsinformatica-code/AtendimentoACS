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

export const isMobileDevice = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

/**
 * Main helper to share a report via WhatsApp with photos and recipient choice
 */
export async function shareReportToWhatsApp(
  data: ReportData,
  settings?: TechSettings,
  overridePhone?: string,
  formatStyle: 'atual' | 'movidesk' = 'atual',
  cardImageBlob?: Blob | null,
  targetWindow?: Window | null
): Promise<ShareResult> {
  const messageText = buildWhatsAppMessage(data, settings, formatStyle);
  const phoneToUse = overridePhone !== undefined ? overridePhone : (data.whatsappDestinatario || '');
  
  let cleanPhone = phoneToUse.replace(/\D/g, '');
  if (cleanPhone.length === 10 || cleanPhone.length === 11) {
    cleanPhone = '55' + cleanPhone;
  }

  const isMobile = isMobileDevice();
  const encodedText = encodeURIComponent(messageText);

  let whatsappUrl = '';
  if (isMobile) {
    whatsappUrl = cleanPhone
      ? `whatsapp://send?phone=${cleanPhone}&text=${encodedText}`
      : `whatsapp://send?text=${encodedText}`;
  } else {
    whatsappUrl = cleanPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`
      : `https://api.whatsapp.com/send?text=${encodedText}`;
  }

  const openWhatsApp = () => {
    if (isMobile) {
      // On mobile, trigger direct app deep link
      window.location.href = whatsappUrl;
      // Fallback to wa.me universal link if custom scheme fails
      setTimeout(() => {
        const waMeUrl = cleanPhone
          ? `https://wa.me/${cleanPhone}?text=${encodedText}`
          : `https://wa.me/?text=${encodedText}`;
        window.location.href = waMeUrl;
      }, 500);
    } else {
      if (targetWindow && !targetWindow.closed) {
        targetWindow.location.href = whatsappUrl;
      } else {
        const win = window.open(whatsappUrl, '_blank');
        if (!win) {
          window.location.href = whatsappUrl;
        }
      }
    }
  };

  const closeTargetWindow = () => {
    if (targetWindow && !targetWindow.closed) {
      try {
        targetWindow.close();
      } catch (e) {
        console.warn('Could not close target window:', e);
      }
    }
  };

  const hasPhotos = data.fotos && data.fotos.length > 0;
  const hasSignature = !!(data.assinaturaCliente && data.assinaturaCliente.trim().length > 0);

  // 1. If formatStyle is 'movidesk' and cardImageBlob exists, prioritize sharing the Movidesk Card image
  if (formatStyle === 'movidesk' && cardImageBlob) {
    const cardFile = new File([cardImageBlob], `Laudo_Movidesk_${data.ticket || 'chamado'}.png`, { type: 'image/png' });

    let sharedViaWebShare = false;
    if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare && navigator.canShare({ files: [cardFile] })) {
      try {
        await navigator.share({
          title: `Laudo Técnico #${data.ticket || 'S/N'} - ${data.cliente || ''}`,
          text: messageText,
          files: [cardFile],
        });
        sharedViaWebShare = true;
      } catch (err: any) {
        if (err.name === 'AbortError') {
          closeTargetWindow();
          return { success: false, method: 'cancelled', message: 'Compartilhamento cancelado.' };
        }
        console.warn('Web Share de imagem falhou. Usando fallback de cópia e redirecionamento:', err);
      }
    }

    if (sharedViaWebShare) {
      closeTargetWindow();
      return {
        success: true,
        method: 'web-share',
        message: 'Imagem do Laudo Movidesk compartilhada com sucesso no WhatsApp!',
      };
    }

    // Fallback: Copy image to Clipboard & open WhatsApp
    let copiedImageSuccess = false;
    if (typeof navigator !== 'undefined' && navigator.clipboard && typeof ClipboardItem !== 'undefined') {
      try {
        await navigator.clipboard.write([
          new ClipboardItem({
            ['image/png']: cardImageBlob,
          }),
        ]);
        copiedImageSuccess = true;
      } catch (clipErr) {
        console.warn('Falha ao copiar imagem do laudo para a área de transferência:', clipErr);
      }
    }

    openWhatsApp();

    return {
      success: true,
      method: 'clipboard-and-url',
      copiedPhoto: copiedImageSuccess,
      message: copiedImageSuccess
        ? 'WhatsApp aberto! A imagem do Laudo (Estilo Movidesk) foi copiada. Pressione Ctrl+V para colar a imagem na conversa do WhatsApp!'
        : 'WhatsApp aberto com o texto do Laudo Movidesk!',
    };
  }

  // Standard sharing logic (Format 'atual' or fallback)
  if ((hasPhotos || hasSignature) && typeof navigator !== 'undefined' && navigator.share) {
    let sharedViaWebShare = false;
    try {
      const filesToShare: File[] = [];

      // Add attached evidence photos
      if (hasPhotos) {
        for (let i = 0; i < data.fotos.length; i++) {
          const file = await dataUrlToFile(data.fotos[i], `evidencia_${i + 1}.jpg`);
          filesToShare.push(file);
        }
      }

      // Add digital signature image as attachment file
      if (hasSignature && data.assinaturaCliente) {
        const sigFile = await dataUrlToFile(
          data.assinaturaCliente,
          `assinatura_cliente_${data.ticket || 'chamado'}.png`
        );
        filesToShare.push(sigFile);
      }

      if (navigator.canShare && navigator.canShare({ files: filesToShare })) {
        await navigator.share({
          title: `Relatório Técnico #${data.ticket || 'S/N'} - ${data.cliente || ''}`,
          text: messageText,
          files: filesToShare,
        });
        sharedViaWebShare = true;
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        closeTargetWindow();
        return { success: false, method: 'cancelled', message: 'Compartilhamento cancelado.' };
      }
      console.warn('Web Share com arquivos não suportado ou falhou. Usando fallback:', err);
    }

    if (sharedViaWebShare) {
      closeTargetWindow();
      return {
        success: true,
        method: 'web-share',
        message: hasSignature && hasPhotos
          ? 'Relatório, fotos e imagem da assinatura compartilhados no WhatsApp!'
          : hasSignature
          ? 'Relatório e imagem da assinatura compartilhados no WhatsApp!'
          : 'Relatório e foto(s) de evidência compartilhados no WhatsApp!',
      };
    }
  }

  // 2. Fallback for Desktop or browsers without Web Share file support:
  let copiedPhotoSuccess = false;
  if ((hasPhotos || hasSignature) && typeof navigator !== 'undefined' && navigator.clipboard && typeof ClipboardItem !== 'undefined') {
    try {
      const imageToCopy = hasSignature && data.assinaturaCliente ? data.assinaturaCliente : data.fotos[0];
      const pngBlob = await dataUrlToPngBlob(imageToCopy);
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

  openWhatsApp();

  return {
    success: true,
    method: 'clipboard-and-url',
    copiedPhoto: copiedPhotoSuccess,
    message: copiedPhotoSuccess
      ? 'WhatsApp aberto! A foto foi copiada para sua Área de Transferência (Ctrl+V para colar no WhatsApp).'
      : 'WhatsApp aberto com a mensagem formatada!',
  };
}
