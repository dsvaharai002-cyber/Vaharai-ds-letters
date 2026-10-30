import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';

export const renderBarcodeSvg = (element: SVGSVGElement | null, value: string, options?: { height?: number; displayValue?: boolean; fontSize?: number }) => {
  if (!element || !value) return;
  try {
    JsBarcode(element, value, {
      format: 'CODE128',
      lineColor: '#000000',
      width: 1.8,
      height: options?.height || 45,
      displayValue: options?.displayValue ?? true,
      fontSize: options?.fontSize || 12,
      font: 'monospace',
      margin: 4,
      background: '#ffffff',
    });
  } catch (err) {
    console.error('Barcode generation error:', err);
  }
};

export const generateQrDataUrl = async (text: string): Promise<string> => {
  try {
    return await QRCode.toDataURL(text, {
      width: 180,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.error('QR code generation error:', err);
    return '';
  }
};
