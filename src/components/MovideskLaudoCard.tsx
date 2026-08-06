import React from 'react';
import { ReportData, TechSettings } from '../types';
import { formatDateToPtBr, TIPO_ATENDIMENTO_LABELS } from '../utils/formatters';

interface MovideskLaudoCardProps {
  data: ReportData;
  settings?: TechSettings;
  id?: string;
}

export const MovideskLaudoCard: React.FC<MovideskLaudoCardProps> = ({
  data,
  settings,
  id = 'movidesk-laudo-card'
}) => {
  const tecnicoNome = data.tecnico || settings?.defaultTecnico || 'Eduardo Paiva';
  const acompanhanteNome = data.acompanhado || 'Não informado';
  const descricaoText = data.descricaoChamado || 'Informação';
  const fatoText = data.fato || 'SISTEMA FUNCIONANDO MAS POSSO MELHORAR';
  const diagnosticoText = data.diagnostico || 'DIAGNOSTICANDO O SISTEMA DE ATENDIMENTO';
  const obsText = data.observacoes || 'NADA A FALAR';
  const fotos = data.fotos || [];
  const tipoLabel = TIPO_ATENDIMENTO_LABELS[data.tipoAtendimento] || data.tipoAtendimento;

  return (
    <div
      id={id}
      className="bg-[#f2f6fa] text-slate-900 border border-[#cbd5e1] rounded-2xl p-4 sm:p-6 space-y-4 font-sans text-xs sm:text-sm max-w-xl mx-auto shadow-sm"
      style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
    >
      {/* Header Banner */}
      <div className="bg-[#0c182b] text-white rounded-xl p-3.5 sm:p-4 shadow-sm space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
          <h3 className="font-extrabold text-sm sm:text-base text-[#38bdf8] flex items-center tracking-wide">
            <span className="mr-2 text-base sm:text-lg">📋</span> LAUDO DE ATENDIMENTO TÉCNICO DE CAMPO
          </h3>
          {data.ticket && (
            <span className="bg-sky-950 text-sky-300 border border-sky-800/80 text-[11px] font-mono font-bold px-2 py-0.5 rounded-md">
              #{data.ticket}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs text-[#94a3b8]">
          <p>
            Técnico Responsável: <span className="text-slate-200 font-semibold">{tecnicoNome}</span>
          </p>
          {data.cliente && (
            <p>
              Cliente: <span className="text-slate-200 font-semibold">{data.cliente}</span>
            </p>
          )}
          {data.data && (
            <p>
              Data: <span className="text-slate-200 font-semibold">{formatDateToPtBr(data.data)}</span>
            </p>
          )}
          {data.tipoAtendimento && (
            <p>
              Tipo: <span className="text-slate-200 font-semibold">{tipoLabel}</span>
            </p>
          )}
        </div>
      </div>

      {/* Responsável no Cliente (Acompanhante) */}
      <div className="space-y-1">
        <p className="font-bold text-slate-900 flex items-center text-xs sm:text-sm">
          <span className="mr-1.5 text-sm">🥷</span> Responsável no Cliente (Acompanhante):
        </p>
        <p className="font-bold text-slate-800 text-xs sm:text-sm pl-6">
          {acompanhanteNome}
        </p>
      </div>

      {/* Descrição do Chamado / Atendimento */}
      <div className="space-y-1">
        <p className="font-bold text-slate-900 flex items-center text-xs sm:text-sm">
          <span className="mr-1.5 text-sm">📋</span> Descrição do Chamado / Atendimento:
        </p>
        <div className="bg-white border border-[#d1dbe5] rounded-xl p-3 text-slate-900 shadow-2xs min-h-[44px] uppercase text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
          {descricaoText}
        </div>
      </div>

      {/* Fato Constatado */}
      <div className="space-y-1">
        <p className="font-bold text-slate-900 flex items-center text-xs sm:text-sm">
          <span className="mr-1.5 text-sm">🔍</span> Fato Constatado:
        </p>
        <div className="bg-white border border-[#d1dbe5] rounded-xl p-3 text-slate-900 shadow-2xs min-h-[44px] uppercase text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
          {fatoText}
        </div>
      </div>

      {/* Diagnóstico e Ações Realizadas */}
      <div className="space-y-1">
        <p className="font-bold text-slate-900 flex items-center text-xs sm:text-sm">
          <span className="mr-1.5 text-sm">🛠️</span> Diagnóstico e Ações Realizadas:
        </p>
        <div className="bg-white border border-[#d1dbe5] rounded-xl p-3 text-slate-900 shadow-2xs min-h-[44px] uppercase text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
          {diagnosticoText}
        </div>
      </div>

      {/* Observações e Recomendações */}
      <div className="space-y-1">
        <p className="font-bold text-slate-900 flex items-center text-xs sm:text-sm">
          <span className="mr-1.5 text-sm">📝</span> Observações e Recomendações:
        </p>
        <div className="bg-white border border-[#d1dbe5] rounded-xl p-3 text-slate-900 shadow-2xs min-h-[44px] uppercase text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
          {obsText}
        </div>
      </div>

      {/* Fotos e Evidências */}
      {fotos.length > 0 && (
        <div className="space-y-2">
          <p className="font-bold text-slate-900 flex items-center text-xs sm:text-sm">
            <span className="mr-1.5 text-sm">💼</span> Fotos e Evidências ({fotos.length}):
          </p>
          <div className="space-y-3">
            {fotos.map((foto, index) => (
              <div key={index} className="space-y-1">
                <p className="text-xs text-slate-600 font-medium">Evidência #{index + 1}:</p>
                <div className="rounded-xl overflow-hidden border border-[#cbd5e1] bg-slate-900 max-h-72 flex items-center justify-center">
                  <img
                    src={foto}
                    alt={`Evidência ${index + 1}`}
                    className="w-full object-contain max-h-72"
                    crossOrigin="anonymous"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assinatura Digital do Cliente */}
      <div className="pt-3 border-t border-dashed border-[#cbd5e1] space-y-1.5">
        <p className="font-bold text-slate-900 flex items-center text-xs sm:text-sm">
          <span className="mr-1.5 text-sm">✍️</span> Assinatura Digital do Cliente:
        </p>
        <p className="text-xs text-slate-600">
          Coletada digitalmente no local por{' '}
          <span className="font-semibold text-slate-800">
            {data.acompanhado || data.cliente || 'Fabiano Nascimento'}
          </span>
        </p>
        {data.assinaturaCliente ? (
          <div className="bg-white border border-[#d1dbe5] rounded-xl p-2 w-48 h-24 flex items-center justify-center shadow-2xs">
            <img
              src={data.assinaturaCliente}
              alt="Assinatura Digital"
              className="max-h-full max-w-full object-contain"
            />
          </div>
        ) : (
          <div className="bg-white border border-[#d1dbe5] rounded-xl p-3 w-48 text-center text-slate-400 italic text-xs">
            Assinatura não coletada
          </div>
        )}
      </div>

      {/* Assinatura / Rodapé da Empresa */}
      {data.incluirAssinatura && (
        <div className="text-center pt-2 border-t border-[#cbd5e1] text-xs font-bold text-slate-700 uppercase tracking-wider">
          {data.empresaAssinatura || settings?.defaultEmpresa || 'ACS Informática & Tecnologia'}
        </div>
      )}
    </div>
  );
};
