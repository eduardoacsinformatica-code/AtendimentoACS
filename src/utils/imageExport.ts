import { toPng, toBlob } from 'html-to-image';

/**
 * Generates a PNG Blob from a DOM element
 */
export async function generateElementBlob(elementId: string): Promise<Blob | null> {
  const node = document.getElementById(elementId);
  if (!node) {
    console.error(`Element with id ${elementId} not found.`);
    return null;
  }

  try {
    const blob = await toBlob(node, {
      quality: 0.95,
      pixelRatio: 2,
      backgroundColor: '#f2f6fa',
      cacheBust: true,
    });
    return blob;
  } catch (error) {
    console.error('Error converting HTML element to image blob:', error);
    return null;
  }
}

/**
 * Generates a PNG Data URL from a DOM element
 */
export async function generateElementDataUrl(elementId: string): Promise<string | null> {
  const node = document.getElementById(elementId);
  if (!node) return null;

  try {
    const dataUrl = await toPng(node, {
      quality: 0.95,
      pixelRatio: 2,
      backgroundColor: '#f2f6fa',
      cacheBust: true,
    });
    return dataUrl;
  } catch (error) {
    console.error('Error converting HTML element to PNG:', error);
    return null;
  }
}

/**
 * Downloads the card as a PNG image file
 */
export async function downloadElementImage(elementId: string, filename = 'Laudo_Movidesk.png'): Promise<boolean> {
  const dataUrl = await generateElementDataUrl(elementId);
  if (!dataUrl) return false;

  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  return true;
}

/**
 * Copies the card PNG image directly to the system clipboard
 */
export async function copyElementImageToClipboard(elementId: string): Promise<boolean> {
  const blob = await generateElementBlob(elementId);
  if (!blob) return false;

  try {
    if (navigator.clipboard && window.ClipboardItem) {
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob,
        }),
      ]);
      return true;
    }
  } catch (err) {
    console.error('Failed to copy image to clipboard:', err);
  }
  return false;
}
