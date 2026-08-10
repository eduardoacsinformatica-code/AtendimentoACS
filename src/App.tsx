import React, { useState, useEffect } from 'react';
import { ReportData, SavedReport, TechSettings, QuickSnippet } from './types';
import { DEFAULT_SNIPPETS } from './data/snippets';
import { getTodayInputDate, generateAutoTicketNumber } from './utils/formatters';
import { Header } from './components/Header';
import { ReportForm } from './components/ReportForm';
import { MovideskEmailPanel } from './components/MovideskEmailPanel';
import { ReportPreview } from './components/ReportPreview';
import { HistoryView } from './components/HistoryView';
import { SnippetSelectorModal } from './components/SnippetSelectorModal';
import { SettingsModal } from './components/SettingsModal';

const DEFAULT_SETTINGS: TechSettings = {
  defaultTecnico: 'Eduardo Paiva',
  defaultEmpresa: 'ACS Informática - Suporte Técnico',
  autoFormatCnpj: true,
  whatsappFormatStyle: 'atual',
  movideskToken: '',
  movideskDomain: 'acsautomacao.movidesk.com',
};

export default function App() {
  const [settings, setSettings] = useState<TechSettings>(() => {
    try {
      const saved = localStorage.getItem('tech_support_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.defaultTecnico === 'Luis Eduardo') parsed.defaultTecnico = 'Eduardo Paiva';
        return parsed;
      }
      return DEFAULT_SETTINGS;
    } catch (e) {
      return DEFAULT_SETTINGS;
    }
  });

  const [history, setHistory] = useState<SavedReport[]>(() => {
    try {
      const saved = localStorage.getItem('tech_support_history');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [snippets, setSnippets] = useState<QuickSnippet[]>(() => {
    try {
      const saved = localStorage.getItem('tech_support_snippets');
      return saved ? JSON.parse(saved) : DEFAULT_SNIPPETS;
    } catch (e) {
      return DEFAULT_SNIPPETS;
    }
  });

  const [activeTab, setActiveTab] = useState<'form' | 'history'>('form');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [snippetsCategory, setSnippetsCategory] = useState<'fato' | 'diagnostico' | 'observacoes' | null>(null);

  const initialFormState: ReportData = {
    ticket: '', cliente: '', cnpj: '', tecnico: '', acompanhado: '',
    data: getTodayInputDate(), status: 'CONCLUIDO', tipoAtendimento: 'PRESENCIAL',
    descricaoChamado: '', fato: '', diagnostico: '', observacoes: '',
    incluirAssinatura: true,
    empresaAssinatura: settings.defaultEmpresa || 'ACS Informática - Suporte Técnico',
    whatsappDestinatario: '', fotos: [], emailCliente: '', enviarEmailCliente: false,
  };

  const [formData, setFormData] = useState<ReportData>(() => {
    try {
      const draft = localStorage.getItem('tech_support_draft');
      return draft ? JSON.parse(draft) : initialFormState;
    } catch (e) {
      return initialFormState;
    }
  });

  const [isSavedSuccess, setIsSavedSuccess] = useState(false);

  useEffect(() => {
    try { localStorage.setItem('tech_support_draft', JSON.stringify(formData)); }
    catch (e) { console.error('Erro ao salvar rascunho:', e); }
  }, [formData]);

  useEffect(() => {
    try { localStorage.setItem('tech_support_history', JSON.stringify(history)); }
    catch (e) { console.error('Erro ao salvar histórico:', e); }
  }, [history]);

  useEffect(() => {
    try { localStorage.setItem('tech_support_snippets', JSON.stringify(snippets)); }
    catch (e) { console.error('Erro ao salvar modelos:', e); }
  }, [snippets]);

  const handleSaveSnippet = (snippetToSave: QuickSnippet) => {
    setSnippets((prev) => {
      const exists = prev.some((s) => s.id === snippetToSave.id);
      return exists ? prev.map((s) => (s.id === snippetToSave.id ? snippetToSave : s)) : [snippetToSave, ...prev];
    });
  };

  const handleDeleteSnippet = (snippetId: string) => setSnippets((prev) => prev.filter((s) => s.id !== snippetId));
  const handleResetSnippets = () => { setSnippets(DEFAULT_SNIPPETS); localStorage.removeItem('tech_support_snippets'); };
  const handleSaveSettings = (newSettings: TechSettings) => { setSettings(newSettings); localStorage.setItem('tech_support_settings', JSON.stringify(newSettings)); };

  const handleResetForm = () => {
    const fresh: ReportData = {
      ticket: '', cliente: '', cnpj: '', tecnico: '', acompanhado: '', data: getTodayInputDate(),
      status: 'CONCLUIDO', tipoAtendimento: 'PRESENCIAL', descricaoChamado: '', fato: '', diagnostico: '', observacoes: '',
      incluirAssinatura: true,
      empresaAssinatura: settings.defaultEmpresa || 'ACS Informática - Suporte Técnico',
      whatsappDestinatario: '', fotos: [], emailCliente: '', enviarEmailCliente: false,
    };
    setFormData(fresh);
    localStorage.removeItem('tech_support_draft');
  };

  const handleLoadDemo = () => {
    setFormData({
      ticket: '98421', cliente: 'Mercado & Cia Ltda', cnpj: '12.345.678/0001-90',
      tecnico: settings.defaultTecnico || 'Luis Eduardo', acompanhado: 'Carlos Alberto (Gerente de TI)',
      data: getTodayInputDate(), status: 'CONCLUIDO', tipoAtendimento: 'PRESENCIAL',
      fato: 'Servidor de banco de dados do sistema de caixa PDV travou ao iniciar. Impressoras não estavam imprimindo cupons de venda.',
      diagnostico: 'Realizada a reinicialização dos serviços SQL Server e Spooler de Impressão. Crimpado novo cabo de rede no caixa 02 e ajustadas as permissões do banco.',
      observacoes: 'Recomendado upgrade de Nobreak para evitar quedas bruscas de energia nos caixas.',
      incluirAssinatura: true,
      empresaAssinatura: settings.defaultEmpresa || 'ACS Informática - Suporte Técnico',
      whatsappDestinatario: '(11) 98765-4321', fotos: [], emailCliente: '', enviarEmailCliente: false,
    });
    setActiveTab('form');
  };

  const handleSaveReportToHistory = () => {
    const newReport: SavedReport = { ...formData, id: Date.now().toString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    setHistory((prev) => [newReport, ...prev]);
    setIsSavedSuccess(true);
    setTimeout(() => setIsSavedSuccess(false), 2000);
  };

  const handleLoadFromHistory = (report: SavedReport) => {
    const { id, createdAt, updatedAt, ...cleanReport } = report;
    setFormData(cleanReport);
    setActiveTab('form');
  };

  const handleDeleteFromHistory = (id: string) => setHistory((prev) => prev.filter((item) => item.id !== id));
  const handleClearAllHistory = () => {
    if (confirm('Tem certeza que deseja apagar todo o histórico de relatórios salvação?')) {
      setHistory([]); localStorage.removeItem('tech_support_history');
    }
  };
  const handleImportReports = (imported: SavedReport[]) => { setHistory(imported); alert(`${imported.length} relatórios importados com sucesso!`); };

  const handleInsertSnippet = (snippetText: string) => {
    if (!snippetsCategory) return;
    setFormData((prev) => {
      const currentVal = prev[snippetsCategory];
      return { ...prev, [snippetsCategory]: currentVal ? `${currentVal}\n${snippetText}` : snippetText };
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col selection:bg-emerald-500 selection:text-slate-950">
      <Header
        activeTab={activeTab} setActiveTab={setActiveTab} savedCount={history.length}
        onOpenSettings={() => setIsSettingsOpen(true)} onNewReport={handleResetForm}
        onLoadDemo={handleLoadDemo} onOpenSnippets={() => setSnippetsCategory('fato')}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === 'form' ? (
          <div className="max-w-4xl mx-auto w-full">
            <MovideskEmailPanel formData={formData} setFormData={setFormData} />
            <ReportForm
              formData={formData} setFormData={setFormData} settings={settings}
              onOpenSnippets={(category) => setSnippetsCategory(category)}
              onSaveReport={handleSaveReportToHistory} isSavedSuccess={isSavedSuccess} onResetForm={handleResetForm}
            />
          </div>
        ) : (
          <HistoryView
            reports={history} onLoadReport={handleLoadFromHistory} onDeleteReport={handleDeleteFromHistory}
            onClearAll={handleClearAllHistory} onImportReports={handleImportReports}
            onNewReport={() => { handleResetForm(); setActiveTab('form'); }}
          />
        )}
      </main>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} settings={settings} onSaveSettings={handleSaveSettings} />
      <SnippetSelectorModal
        isOpen={snippetsCategory !== null} onClose={() => setSnippetsCategory(null)} category={snippetsCategory || 'fato'}
        onSelectSnippet={handleInsertSnippet} snippets={snippets} onSaveSnippet={handleSaveSnippet}
        onDeleteSnippet={handleDeleteSnippet} onResetSnippets={handleResetSnippets}
      />

      <footer className="border-t border-slate-800 bg-slate-950 py-4 text-center text-xs text-slate-500 print:hidden">
        <p>Gerador de Relatórios de Atendimento - Suporte Técnico em TI &bull; Envio direto via WhatsApp</p>
      </footer>
    </div>
  );
}
