import React, { useState, useEffect } from 'react';
import { ReportData, TechSettings } from '../types';
import { shareReportToWhatsApp, ShareResult } from '../utils/whatsapp';
import { buildWhatsAppMessage } from '../utils/formatters';
import { MovideskLaudoCard } from './MovideskLaudoCard';
import { generateElementBlob, downloadElementImage, copyElementImageToClipboard } from '../utils/imageExport';
import { 
  Send, 
  X, 
  Smartphone, 
  Users, 
  Camera, 
  Info, 
  CheckCircle2, 
  Phone,
  MessageSquare,
  Sparkles,
  ClipboardCheck,
  Loader2,
  FileText,
  Copy,
  Check,
  Download,
  Image as ImageIcon
} from 'lucide-react';

interface WhatsAppShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportData: ReportData | null;
  settings?: TechSettings;
}

export const WhatsAppShareModal: React.FC<WhatsAppShareModalProps> = ({
  isOpen,
  onClose,
  reportData,
  settings,
}) => {
  if (!isOpen || !reportData) return null;

  const [sendMode, setSendMode] = useState<'picker' | 'number'>(
    reportData.whatsappDestinatario && reportData.whatsappDestinatario.trim().length > 0
      ? 'number'
      : 'picker'
  );
  
  const [phoneNumber, setPhoneNumber] = useState(
    reportData.whatsappDestinatario || ''
  );

  const [formatStyle, setFormatStyle] = useState<'atual' | 'movidesk'>(
    settings?.whatsappFormatStyle === 'movidesk' ? 'movidesk' : 'atual'
  );

  const [isSending, setIsSending] = useState(false);
  const [shareResult, setShareResult] = useState<ShareResult | null>(null);
  const [copiedTextSuccess, setCopiedTextSuccess] = useState(false);
  const [copiedImageSuccess, setCopiedImageSuccess] = useState(false);
  const [showTextPreview, setShowTextPreview] = useState(false);

  useEffect(() => {
    setPhoneNumber(reportData.whatsappDestinatario || '');
    setSendMode(
      reportData.whatsappDestinatario && reportData.whatsappDestinatario.trim().length > 0
        ? 'number'
        : 'picker'
    );
    setFormatStyle(settings?.whatsappFormatStyle === 'movidesk' ? 'movidesk' : 'atual');
    setShareResult(null);
  }, [reportData, settings]);

  const previewMessage = buildWhatsAppMessage(reportData, settings, formatStyle);

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(previewMessage);
      setCopiedTextSuccess(true);
      setTimeout(() => setCopiedTextSuccess(false), 2000);
    } catch (e) {
      console.error('Erro ao copiar texto:', e);
    }
  };

  const handleCopyCardImage = async () => {
    const success = await copyElementImageToClipboard('movidesk-laudo-card-modal');
    if (success) {
      setCopiedImageSuccess(true);
      setTimeout(() => setCopiedImageSuccess(false), 2500);
    }
  };

  const handleDownloadCardImage = async () => {
    await downloadElementImage('movidesk-laudo-card-modal', `Laudo_Movidesk_${reportData.ticket || 'chamado'}.png`);
  };

  const handleSend = async () => {
    setIsSending(true);
    setShareResult(null);

    // Pre-open popup synchronously during click event handler to bypass browser popup blockers
    let targetWindow: Window | null = null;
    try {
      targetWindow = window.open('about:blank', '_blank');
      if (targetWindow) {
        targetWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head><title>Abrindo WhatsApp...</title></head>
            <body style="font-family: system-ui, -apple-system, sans-serif; background: #0b141a; color: #e9edef; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; padding: 20px; box-sizing: border-box;">
              <div style="text-align: center; max-width: 400px; background: #111b21; padding: 30px; border-radius: 16px; border: 1px solid #222d34; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
                <div style="font-size: 32px; margin-bottom: 12px;">💬</div>
                <p style="font-size: 16px; font-weight: 700; margin: 0 0 8px 0; color: #25d366;">Gerando Laudo do Atendimento...</p>
                <p style="font-size: 13px; color: #8696a0; margin: 0; line-height: 1.5;">Aguarde alguns segundos. A conversa no WhatsApp será aberta automaticamente.</p>
              </div>
            </body>
          </html>
        `);
      }
    } catch (e) {
      console.warn('Não foi possível pré-abrir janela:', e);
    }

    const targetPhone = sendMode === 'number' ? phoneNumber : '';

    try {
      let cardBlob: Blob | null = null;
      if (formatStyle === 'movidesk') {
        cardBlob = await generateElementBlob('movidesk-laudo-card-modal');
      }

      const result = await shareReportToWhatsApp(
        reportData, 
        settings, 
        targetPhone, 
        formatStyle, 
        cardBlob, 
        targetWindow
      );

      setShareResult(result);
      if (result.success) {
        if (result.method === 'web-share') {
          setTimeout(() => {
            onClose();
          }, 1500);
        }
      }
    } catch (err) {
      console.error('Erro ao compartilhar no WhatsApp:', err);
      if (targetWindow && !targetWindow.closed) {
        try {
          targetWindow.close();
        } catch (e) {}
      }
    } finally {
      setIsSending(false);
    }
  };

  const hasPhotos = reportData.fotos && reportData.fotos.length > 0;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm p-4 flex items-center justify-center overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-5 text-slate-100 animate-in fade-in zoom-in-95 duration-150 my-auto max-h-[92vh] overflow-y-auto">
        
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-colors border border-slate-700"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3 pb-3 border-b border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold text-lg shadow-sm">
            <MessageSquare className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center">
              Enviar Laudo no WhatsApp
            </h3>
            <p className="text-xs text-slate-400">
              Ticket #{reportData.ticket || 'S/N'} • {reportData.cliente || 'Cliente S/N'}
            </p>
          </div>
        </div>

        {/* Format Selector Section */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
            1. Escolha o Estilo de Envio
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Option A: Formato Texto Atual */}
            <button
              type="button"
              onClick={() => setFormatStyle('atual')}
              className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between space-y-1 ${
                formatStyle === 'atual'
                  ? 'bg-emerald-950/50 border-emerald-500 text-emerald-200 ring-1 ring-emerald-500/50'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-400 flex items-center">
                  🛠️ Formato Texto Atual
                </span>
                <span className={`w-3 h-3 rounded-full border ${formatStyle === 'atual' ? 'bg-emerald-500 border-emerald-400' : 'border-slate-600'}`} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-200">Mensagem Formatada em Texto</p>
                <p className="text-[10px] text-slate-400">Texto padrão com marcadores, fatos e fotos em anexo</p>
              </div>
            </button>

            {/* Option B: Estilo Movidesk (Imagem) */}
            <button
              type="button"
              onClick={() => setFormatStyle('movidesk')}
              className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between space-y-1 ${
                formatStyle === 'movidesk'
                  ? 'bg-emerald-950/50 border-emerald-500 text-emerald-200 ring-1 ring-emerald-500/50'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-sky-400 flex items-center">
                  🖼️ Imagem Estilo Movidesk
                </span>
                <span className={`w-3 h-3 rounded-full border ${formatStyle === 'movidesk' ? 'bg-emerald-500 border-emerald-400' : 'border-slate-600'}`} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-200">Laudo Técnico em Imagem</p>
                <p className="text-[10px] text-slate-400">Card gráfico completo com cabeçalho azul, fotos e assinatura</p>
              </div>
            </button>
          </div>

          {/* Movidesk Image Card Preview & Quick Controls */}
          {formatStyle === 'movidesk' ? (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-sky-300 flex items-center">
                  <ImageIcon className="w-3.5 h-3.5 mr-1 text-sky-400" />
                  Prévia da Imagem do Laudo:
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleCopyCardImage}
                    className="text-[11px] text-slate-200 hover:text-white font-medium flex items-center bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-lg border border-slate-700 transition-colors"
                  >
                    {copiedImageSuccess ? (
                      <>
                        <Check className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                        Imagem Copiada!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 mr-1 text-sky-400" />
                        Copiar Imagem
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadCardImage}
                    className="text-[11px] text-slate-200 hover:text-white font-medium flex items-center bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-lg border border-slate-700 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                    Baixar (.png)
                  </button>
                </div>
              </div>

              {/* Movidesk Visual Card Wrapper */}
              <div className="max-h-80 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 p-2 shadow-inner">
                <MovideskLaudoCard
                  id="movidesk-laudo-card-modal"
                  data={reportData}
                  settings={settings}
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => setShowTextPreview(!showTextPreview)}
                className="text-[11px] text-emerald-400 hover:underline font-medium flex items-center"
              >
                <FileText className="w-3.5 h-3.5 mr-1" />
                {showTextPreview ? 'Ocultar Prévia do Texto' : 'Ver Prévia do Texto'}
              </button>

              <button
                type="button"
                onClick={handleCopyText}
                className="text-[11px] text-slate-300 hover:text-white font-medium flex items-center bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700 transition-colors"
              >
                {copiedTextSuccess ? (
                  <>
                    <Check className="w-3 h-3 mr-1 text-emerald-400" />
                    Texto Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 mr-1 text-slate-400" />
                    Copiar Texto
                  </>
                )}
              </button>
            </div>
          )}

          {/* Text Box Preview if toggled */}
          {showTextPreview && formatStyle === 'atual' && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-[11px] font-mono text-slate-300 whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
              {previewMessage}
            </div>
          )}
        </div>

        {/* Recipient Selection Section */}
        <div className="space-y-3 pt-2 border-t border-slate-800">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
            2. Destinatário da Mensagem
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Option A: Picker inside WhatsApp */}
            <button
              type="button"
              onClick={() => setSendMode('picker')}
              className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between space-y-1 ${
                sendMode === 'picker'
                  ? 'bg-emerald-950/50 border-emerald-500 text-emerald-200 ring-1 ring-emerald-500/50'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <Users className="w-4 h-4 text-emerald-400" />
                <span className={`w-3 h-3 rounded-full border ${sendMode === 'picker' ? 'bg-emerald-500 border-emerald-400' : 'border-slate-600'}`} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-200">Escolher no WhatsApp</p>
                <p className="text-[10px] text-slate-400">Abre a lista de contatos/grupos no aplicativo</p>
              </div>
            </button>

            {/* Option B: Specific Number */}
            <button
              type="button"
              onClick={() => setSendMode('number')}
              className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between space-y-1 ${
                sendMode === 'number'
                  ? 'bg-emerald-950/50 border-emerald-500 text-emerald-200 ring-1 ring-emerald-500/50'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <Phone className="w-4 h-4 text-emerald-400" />
                <span className={`w-3 h-3 rounded-full border ${sendMode === 'number' ? 'bg-emerald-500 border-emerald-400' : 'border-slate-600'}`} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-200">Número Específico</p>
                <p className="text-[10px] text-slate-400">Inicia conversa diretamente com o número</p>
              </div>
            </button>
          </div>

          {/* Number Input Field */}
          {sendMode === 'number' && (
            <div className="space-y-1.5 pt-1 animate-in fade-in duration-150">
              <div className="relative">
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Ex: 11999998888 ou 47999998888"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 text-white rounded-xl py-2.5 pl-9 pr-3 text-xs placeholder:text-slate-600 focus:outline-hidden font-mono"
                />
                <Smartphone className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              </div>
              <p className="text-[10px] text-slate-400 flex items-center pl-1">
                <Info className="w-3 h-3 text-emerald-400 mr-1 shrink-0" />
                Digite o número com DDD. O código do país (+55) será incluído automaticamente.
              </p>
            </div>
          )}
        </div>

        {/* Feedback / Result Message */}
        {shareResult && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-start space-x-2.5 ${
              shareResult.success
                ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-200'
                : 'bg-rose-950/60 border-rose-800/80 text-rose-200'
            }`}
          >
            {shareResult.copiedPhoto ? (
              <ClipboardCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <p className="font-bold">{shareResult.message}</p>
              {shareResult.copiedPhoto && (
                <p className="text-[10px] text-emerald-300/80">
                  💡 Pressione <span className="font-bold underline">Ctrl + V</span> (ou Colar) no WhatsApp para incluir a imagem!
                </p>
              )}
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div className="pt-2 flex items-center justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
          >
            Fechar
          </button>

          <button
            type="button"
            onClick={handleSend}
            disabled={isSending}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-lg shadow-emerald-950 flex items-center disabled:opacity-50"
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                Gerando Imagem...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-1.5" />
                {formatStyle === 'movidesk' ? 'Enviar Imagem no WhatsApp' : 'Abrir WhatsApp e Enviar'}
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
