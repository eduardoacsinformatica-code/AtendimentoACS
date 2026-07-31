import React, { useState, useEffect } from 'react';
import { ReportData, TechSettings } from '../types';
import { shareReportToWhatsApp, ShareResult } from '../utils/whatsapp';
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
  Loader2
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

  const [isSending, setIsSending] = useState(false);
  const [shareResult, setShareResult] = useState<ShareResult | null>(null);

  useEffect(() => {
    setPhoneNumber(reportData.whatsappDestinatario || '');
    setSendMode(
      reportData.whatsappDestinatario && reportData.whatsappDestinatario.trim().length > 0
        ? 'number'
        : 'picker'
    );
    setShareResult(null);
  }, [reportData]);

  const handleSend = async () => {
    setIsSending(true);
    setShareResult(null);

    const targetPhone = sendMode === 'number' ? phoneNumber : '';

    try {
      const result = await shareReportToWhatsApp(reportData, settings, targetPhone);
      setShareResult(result);
      if (result.success) {
        // Automatically close modal after brief delay if web-share was triggered, or keep feedback on screen
        if (result.method === 'web-share') {
          setTimeout(() => {
            onClose();
          }, 1500);
        }
      }
    } catch (err) {
      console.error('Erro ao compartilhar no WhatsApp:', err);
    } finally {
      setIsSending(false);
    }
  };

  const hasPhotos = reportData.fotos && reportData.fotos.length > 0;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm p-4 flex items-center justify-center overflow-y-auto">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-5 text-slate-100 animate-in fade-in zoom-in-95 duration-150">
        
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

        {/* Recipient Selection Section */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
            1. Destinatário da Mensagem
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
                <p className="text-[10px] text-slate-400">Digitar telefone com DDD</p>
              </div>
            </button>
          </div>

          {/* Number Input Field if 'number' mode selected */}
          {sendMode === 'number' && (
            <div className="pt-1">
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="(11) 98765-4321"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 text-white text-xs rounded-xl pl-9 pr-3 py-2 outline-none"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Insira o número com DDD (exemplo: 11987654321)
              </p>
            </div>
          )}
        </div>

        {/* Photos & Evidences Info Banner */}
        <div className="space-y-2 pt-2 border-t border-slate-800">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center">
              <Camera className="w-4 h-4 text-emerald-400 mr-1.5" />
              2. Evidências Fotográficas ({reportData.fotos?.length || 0})
            </span>
            {hasPhotos && (
              <span className="text-[10px] bg-emerald-950 text-emerald-300 font-bold px-2 py-0.5 rounded border border-emerald-800/60">
                Inclusas no envio
              </span>
            )}
          </label>

          {hasPhotos ? (
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-2">
              {/* Photo Thumbnails */}
              <div className="flex items-center space-x-2 overflow-x-auto pb-1">
                {reportData.fotos?.map((photo, idx) => (
                  <div key={idx} className="w-12 h-12 rounded-lg border border-slate-700 overflow-hidden shrink-0 bg-slate-900 relative">
                    <img src={photo} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                    <span className="absolute bottom-0 right-0 bg-slate-950/90 text-white text-[8px] font-mono px-1">
                      #{idx + 1}
                    </span>
                  </div>
                ))}
              </div>

              {/* Explanatory Box */}
              <div className="bg-emerald-950/40 border border-emerald-800/50 rounded-lg p-2.5 text-[11px] text-emerald-200 space-y-1">
                <p className="font-semibold flex items-center text-emerald-300">
                  <Sparkles className="w-3.5 h-3.5 mr-1 text-emerald-400 shrink-0" />
                  Como a foto será anexada:
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-slate-300 text-[10px]">
                  <li>
                    <strong className="text-white">No Celular:</strong> Abre o compartilhamento do WhatsApp com fotos e texto juntos.
                  </li>
                  <li>
                    <strong className="text-white">No Computador (WhatsApp Web):</strong> A foto é copiada para a área de transferência. Ao abrir o WhatsApp, pressione <kbd className="px-1 py-0.5 bg-slate-800 text-emerald-300 rounded border border-slate-700 font-mono text-[9px]">Ctrl + V</kbd> para colar a foto no chat!
                  </li>
                </ul>
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-slate-500 bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
              Nenhuma foto anexada a este laudo. Apenas a mensagem de texto formatada será enviada.
            </p>
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
                  💡 Pressione <span className="font-bold underline">Ctrl + V</span> (ou Colar) no WhatsApp para incluir a foto!
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
                Iniciando...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-1.5" />
                Abrir WhatsApp e Enviar
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
