import React, { useState } from 'react';
import { ReportData, TechSettings } from '../types';
import { 
  buildWhatsAppMessage, 
  STATUS_LABELS, 
  TIPO_ATENDIMENTO_LABELS, 
  formatDateToPtBr 
} from '../utils/formatters';
import { WhatsAppShareModal } from './WhatsAppShareModal';
import { 
  Copy, 
  Send, 
  Check, 
  Printer, 
  Smartphone, 
  FileCheck2, 
  MessageSquare,
  Share2,
  ExternalLink,
  Camera
} from 'lucide-react';

interface ReportPreviewProps {
  formData: ReportData;
  settings: TechSettings;
}

export const ReportPreview: React.FC<ReportPreviewProps> = ({
  formData,
  settings,
}) => {
  const [viewMode, setViewMode] = useState<'whatsapp' | 'document'>('whatsapp');
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const formattedWhatsAppText = buildWhatsAppMessage(formData, settings);

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(formattedWhatsAppText);
      setCopiedSuccess(true);
      setTimeout(() => setCopiedSuccess(false), 2000);
    } catch (err) {
      console.error('Erro ao copiar texto:', err);
    }
  };

  const handleSendWhatsApp = () => {
    setIsShareModalOpen(true);
  };

  const handlePrint = () => {
    window.print();
  };

  const statusObj = STATUS_LABELS[formData.status] || {
    label: formData.status,
    badgeClass: 'bg-slate-800 text-slate-300',
    icon: '📋',
  };

  const tipoLabel =
    TIPO_ATENDIMENTO_LABELS[formData.tipoAtendimento] || formData.tipoAtendimento;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl flex flex-col h-full sticky top-20">
      
      {/* Header & View Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <FileCheck2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Pré-visualização</h3>
            <p className="text-xs text-slate-400">
              Veja exatamente como o relatório será enviado
            </p>
          </div>
        </div>

        {/* View Mode Buttons */}
        <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center space-x-1 self-start sm:self-auto">
          <button
            onClick={() => setViewMode('whatsapp')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center ${
              viewMode === 'whatsapp'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 mr-1.5" />
            WhatsApp
          </button>
          <button
            onClick={() => setViewMode('document')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center ${
              viewMode === 'document'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Printer className="w-3.5 h-3.5 mr-1.5" />
            Laudo PDF/Impresso
          </button>
        </div>
      </div>

      {/* Main Preview Container */}
      <div className="py-4 flex-1 overflow-y-auto">
        
        {/* WHATSAPP VIEW MODE */}
        {viewMode === 'whatsapp' && (
          <div className="bg-[#0b141a] border border-[#1f2c34] rounded-2xl p-4 font-sans text-sm shadow-inner relative overflow-hidden min-h-[380px]">
            
            {/* WhatsApp Header Mockup */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#1f2c34] text-slate-400 text-xs">
              <div className="flex items-center space-x-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-semibold text-slate-300">
                  Formatação para WhatsApp Chat
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">
                {formData.whatsappDestinatario ? formData.whatsappDestinatario : 'Destinatário'}
              </span>
            </div>

            {/* Chat Bubble */}
            <div className="bg-[#005c4b]/30 border border-[#005c4b]/50 rounded-2xl rounded-tr-none p-4 text-emerald-50 max-w-full font-mono text-xs whitespace-pre-wrap leading-relaxed shadow-lg">
              {formattedWhatsAppText}
            </div>

            <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
              <span>*Texto formatado para o aplicativo*</span>
              <span className="flex items-center">
                <MessageSquare className="w-3 h-3 mr-1 text-emerald-500" />
                Pronto para envio
              </span>
            </div>

          </div>
        )}

        {/* DOCUMENT / PRINTABLE VIEW MODE */}
        {viewMode === 'document' && (
          <div 
            id="printable-report"
            className="bg-white text-slate-900 rounded-xl p-6 sm:p-8 shadow-2xl border border-slate-200 text-xs font-sans space-y-6 print:p-0 print:border-none print:shadow-none"
          >
            {/* Header Document */}
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
              <div>
                <h1 className="text-xl font-bold uppercase tracking-tight text-slate-900">
                  Relatório de Atendimento Técnico
                </h1>
                <p className="text-xs text-slate-600 font-medium mt-0.5">
                  {formData.empresaAssinatura || settings.defaultEmpresa || 'Suporte Técnico em TI'}
                </p>
              </div>
              <div className="text-right">
                <span className="inline-block px-3 py-1 bg-slate-100 border border-slate-300 rounded font-bold text-sm font-mono text-slate-800">
                  Nº #{formData.ticket || '0000'}
                </span>
                <p className="text-[11px] text-slate-500 mt-1">
                  Data: {formatDateToPtBr(formData.data)}
                </p>
              </div>
            </div>

            {/* Metadata Table */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Cliente</span>
                <span className="font-semibold text-slate-900">{formData.cliente || 'Não informado'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">CNPJ</span>
                <span className="font-mono text-slate-800">{formData.cnpj || 'Não informado'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Técnico</span>
                <span className="font-semibold text-slate-900">{formData.tecnico || 'Não informado'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Acompanhado por</span>
                <span className="text-slate-800">{formData.acompanhado || 'Não informado'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Modalidade</span>
                <span className="text-slate-800">{tipoLabel}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Status</span>
                <span className="font-bold text-slate-900 flex items-center">
                  <span className="mr-1">{statusObj.icon}</span> {statusObj.label}
                </span>
              </div>
            </div>

            {/* Fato Constatado Box */}
            <div className="space-y-1">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1">
                1. Fato Constatado
              </h4>
              <p className="text-slate-700 leading-relaxed whitespace-pre-wrap bg-slate-50/50 p-2.5 rounded border border-slate-100">
                {formData.fato || 'Sem registros.'}
              </p>
            </div>

            {/* Diagnóstico Box */}
            <div className="space-y-1">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1">
                2. Diagnóstico e Ações Realizadas
              </h4>
              <p className="text-slate-700 leading-relaxed whitespace-pre-wrap bg-slate-50/50 p-2.5 rounded border border-slate-100">
                {formData.diagnostico || 'Sem registros.'}
              </p>
            </div>

            {/* Observações Box */}
            {formData.observacoes && (
              <div className="space-y-1">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1">
                  3. Observações e Recomendações
                </h4>
                <p className="text-slate-700 leading-relaxed whitespace-pre-wrap bg-slate-50/50 p-2.5 rounded border border-slate-100">
                  {formData.observacoes}
                </p>
              </div>
            )}

            {/* Photos & Evidence Box */}
            {formData.fotos && formData.fotos.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1 flex items-center justify-between">
                  <span>{formData.observacoes ? '4' : '3'}. Evidências Fotográficas ({formData.fotos.length})</span>
                  <Camera className="w-3.5 h-3.5 text-slate-500" />
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                  {formData.fotos.map((photo, idx) => (
                    <div
                      key={idx}
                      className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50 aspect-video flex items-center justify-center relative shadow-sm"
                    >
                      <img
                        src={photo}
                        alt={`Evidência ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-slate-900/80 text-white text-[9px] font-mono rounded">
                        #{idx + 1}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Signature Area */}
            <div className="pt-8 grid grid-cols-2 gap-8 text-center border-t border-slate-200 mt-8">
              <div>
                <div className="border-b border-slate-400 mb-1 w-3/4 mx-auto" />
                <p className="font-bold text-slate-800">{formData.tecnico || 'Técnico Responsável'}</p>
                <p className="text-[10px] text-slate-500">Assinatura do Técnico</p>
              </div>
              <div>
                <div className="border-b border-slate-400 mb-1 w-3/4 mx-auto" />
                <p className="font-bold text-slate-800">{formData.acompanhado || 'Responsável no Cliente'}</p>
                <p className="text-[10px] text-slate-500">De Acordo / Recebido</p>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* Action Buttons Bar */}
      <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        
        {/* Copy Text Button */}
        <button
          type="button"
          onClick={handleCopyText}
          className="w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-colors flex items-center justify-center"
        >
          {copiedSuccess ? (
            <>
              <Check className="w-4 h-4 mr-1.5 text-emerald-400" />
              Copiado!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 mr-1.5 text-slate-400" />
              Copiar Texto WhatsApp
            </>
          )}
        </button>

        {/* Print Button (If Document Mode) */}
        {viewMode === 'document' ? (
          <button
            type="button"
            onClick={handlePrint}
            className="w-full sm:w-auto px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-950 flex items-center justify-center"
          >
            <Printer className="w-4 h-4 mr-1.5" />
            Imprimir / Gerar PDF
          </button>
        ) : (
          /* Send WhatsApp Button */
          <button
            type="button"
            onClick={handleSendWhatsApp}
            className="w-full sm:w-auto px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-950 flex items-center justify-center"
          >
            <Send className="w-4 h-4 mr-1.5" />
            Enviar via WhatsApp
          </button>
        )}

      </div>

      {/* WhatsApp Share Modal */}
      <WhatsAppShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        reportData={formData}
        settings={settings}
      />

    </div>
  );
};
