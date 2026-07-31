import React, { useState } from 'react';
import { SavedReport, ReportStatus } from '../types';
import { 
  formatDateToPtBr, 
  STATUS_LABELS
} from '../utils/formatters';
import { WhatsAppShareModal } from './WhatsAppShareModal';
import { 
  Search, 
  Trash2, 
  ExternalLink, 
  FileText, 
  Download, 
  Upload, 
  Calendar, 
  User, 
  Building2, 
  Send, 
  Filter,
  RefreshCw,
  PlusCircle,
  Camera
} from 'lucide-react';

interface HistoryViewProps {
  reports: SavedReport[];
  onLoadReport: (report: SavedReport) => void;
  onDeleteReport: (id: string) => void;
  onClearAll: () => void;
  onImportReports: (imported: SavedReport[]) => void;
  onNewReport: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  reports,
  onLoadReport,
  onDeleteReport,
  onClearAll,
  onImportReports,
  onNewReport,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedReportForWhatsApp, setSelectedReportForWhatsApp] = useState<SavedReport | null>(null);

  // Filter reports
  const filteredReports = reports.filter((r) => {
    const matchesSearch =
      r.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.ticket.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.tecnico.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.cnpj.includes(searchTerm) ||
      r.fato.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.diagnostico.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL' ? true : r.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Export JSON file
  const handleExportJson = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(reports, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `historico_relatorios_${new Date().toISOString().slice(0, 10)}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import JSON file
  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], 'UTF-8');
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (Array.isArray(parsed)) {
            onImportReports(parsed);
          }
        } catch (err) {
          alert('Arquivo JSON inválido.');
        }
      };
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Controls Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center">
            <FileText className="w-5 h-5 text-emerald-400 mr-2" />
            Histórico de Atendimentos
          </h2>
          <p className="text-xs text-slate-400">
            {reports.length} relatório(s) salvo(s) localmente no navegador
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          
          <button
            onClick={onNewReport}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition-colors flex items-center shadow-md shadow-emerald-950"
          >
            <PlusCircle className="w-4 h-4 mr-1.5" />
            Novo Relatório
          </button>

          <button
            onClick={handleExportJson}
            disabled={reports.length === 0}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium border border-slate-700 transition-colors flex items-center disabled:opacity-50"
            title="Exportar backup em formato JSON"
          >
            <Download className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
            Exportar
          </button>

          <label className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium border border-slate-700 transition-colors flex items-center cursor-pointer">
            <Upload className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
            Importar
            <input
              type="file"
              accept=".json"
              onChange={handleImportJson}
              className="hidden"
            />
          </label>

          {reports.length > 0 && (
            <button
              onClick={onClearAll}
              className="px-3 py-2 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 rounded-xl text-xs font-medium border border-rose-800/50 transition-colors flex items-center"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5 text-rose-400" />
              Limpar
            </button>
          )}

        </div>

      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md flex flex-col sm:flex-row gap-3">
        
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por Cliente, Ticket, Técnico, CNPJ ou Conteúdo..."
            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
          />
        </div>

        {/* Status Filter Dropdown */}
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0 hidden sm:block" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          >
            <option value="ALL">Todos os Status</option>
            <option value="CONCLUIDO">Concluído</option>
            <option value="EM_ANDAMENTO">Em Andamento</option>
            <option value="PENDENTE">Pendente</option>
            <option value="AGUARDANDO_CLIENTE">Aguardando Cliente</option>
            <option value="AGUARDANDO_PECA">Aguardando Peça</option>
          </select>
        </div>

      </div>

      {/* Reports Grid */}
      {filteredReports.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <FileText className="w-12 h-12 text-slate-700 mx-auto" />
          <h3 className="text-base font-bold text-slate-300">
            Nenhum relatório encontrado
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {reports.length === 0
              ? 'Você ainda não salvou nenhum atendimento no histórico local. Preencha o formulário e clique em "Salvar Histórico".'
              : 'Nenhum relatório atende aos critérios da sua busca.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReports.map((report) => {
            const statusInfo = STATUS_LABELS[report.status] || {
              label: report.status,
              badgeClass: 'bg-slate-800 text-slate-300',
              icon: '📋',
            };

            return (
              <div
                key={report.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 shadow-lg transition-all flex flex-col justify-between space-y-4 group"
              >
                {/* Header Card */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded border border-emerald-800/40">
                      Ticket #{report.ticket || 'S/N'}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border ${statusInfo.badgeClass}`}
                    >
                      {statusInfo.icon} {statusInfo.label}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white line-clamp-1 group-hover:text-emerald-300 transition-colors">
                    {report.cliente || 'Cliente não informado'}
                  </h3>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
                    <span className="flex items-center">
                      <Calendar className="w-3 h-3 mr-1 text-slate-500" />
                      {formatDateToPtBr(report.data)}
                    </span>
                    <span className="flex items-center">
                      <User className="w-3 h-3 mr-1 text-slate-500" />
                      {report.tecnico || 'Luis Eduardo'}
                    </span>
                    {report.fotos && report.fotos.length > 0 && (
                      <span className="flex items-center text-teal-400 font-medium">
                        <Camera className="w-3 h-3 mr-1" />
                        {report.fotos.length} foto(s)
                      </span>
                    )}
                  </div>
                </div>

                {/* Excerpt */}
                <div className="bg-slate-950/60 rounded-xl p-3 text-xs text-slate-300 border border-slate-800/60 space-y-1.5">
                  <p className="line-clamp-2 text-slate-400">
                    <strong className="text-slate-200">Fato:</strong>{' '}
                    {report.fato || 'Sem registro'}
                  </p>
                  <p className="line-clamp-2 text-slate-400">
                    <strong className="text-slate-200">Ações:</strong>{' '}
                    {report.diagnostico || 'Sem registro'}
                  </p>
                </div>

                {/* Footer Card Actions */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <button
                    onClick={() => onLoadReport(report)}
                    className="flex-1 py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium border border-slate-700 transition-colors flex items-center justify-center"
                  >
                    <ExternalLink className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                    Carregar
                  </button>

                  <button
                    onClick={() => setSelectedReportForWhatsApp(report)}
                    className="py-1.5 px-3 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 rounded-xl text-xs font-semibold border border-emerald-500/30 transition-colors flex items-center justify-center"
                    title="Enviar via WhatsApp"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => onDeleteReport(report.id)}
                    className="py-1.5 px-2.5 bg-slate-800 hover:bg-rose-950/50 text-slate-400 hover:text-rose-400 rounded-xl text-xs border border-slate-700 hover:border-rose-800/50 transition-colors"
                    title="Excluir do Histórico"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* WhatsApp Share Modal */}
      <WhatsAppShareModal
        isOpen={!!selectedReportForWhatsApp}
        onClose={() => setSelectedReportForWhatsApp(null)}
        reportData={selectedReportForWhatsApp}
      />

    </div>
  );
};
