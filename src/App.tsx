import React, { useState, useEffect } from 'react';
import { ReportData, SavedReport, TechSettings } from './types';
import { getTodayInputDate } from './utils/formatters';
import { Header } from './components/Header';
import { ReportForm } from './components/ReportForm';
import { ReportPreview } from './components/ReportPreview';
import { HistoryView } from './components/HistoryView';
import { SnippetSelectorModal } from './components/SnippetSelectorModal';
import { SettingsModal } from './components/SettingsModal';

const DEFAULT_SETTINGS: TechSettings = {
  defaultTecnico: 'Luis Eduardo',
  defaultEmpresa: 'ACS Informática - Suporte Técnico',
  autoFormatCnpj: true,
  whatsappFormatStyle: 'padrao',
};

export default function App() {
  // Settings State
  const [settings, setSettings] = useState<TechSettings>(() => {
    try {
      const saved = localStorage.getItem('tech_support_settings');
      return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
    } catch (e) {
      return DEFAULT_SETTINGS;
    }
  });

  // Saved Reports History State
  const [history, setHistory] = useState<SavedReport[]>(() => {
    try {
      const saved = localStorage.getItem('tech_support_history');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Active Tab
  const [activeTab, setActiveTab] = useState<'form' | 'history'>('form');

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [snippetsCategory, setSnippetsCategory] = useState<
    'fato' | 'diagnostico' | 'observacoes' | null
  >(null);

  // Initial Form State
  const initialFormState: ReportData = {
    ticket: '12345',
    cliente: '',
    cnpj: '',
    tecnico: settings.defaultTecnico || 'Luis Eduardo',
    acompanhado: '',
    data: getTodayInputDate(),
    status: 'CONCLUIDO',
    tipoAtendimento: 'PRESENCIAL',
    fato: '',
    diagnostico: '',
    observacoes: '',
    incluirAssinatura: true,
    empresaAssinatura: settings.defaultEmpresa || 'ACS Informática - Suporte Técnico',
    whatsappDestinatario: '',
    fotos: [],
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

  // Sync draft to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('tech_support_draft', JSON.stringify(formData));
    } catch (e) {
      console.error('Erro ao salvar rascunho:', e);
    }
  }, [formData]);

  // Sync history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('tech_support_history', JSON.stringify(history));
    } catch (e) {
      console.error('Erro ao salvar histórico:', e);
    }
  }, [history]);

  // Save Settings
  const handleSaveSettings = (newSettings: TechSettings) => {
    setSettings(newSettings);
    localStorage.setItem('tech_support_settings', JSON.stringify(newSettings));
  };

  // Reset Form
  const handleResetForm = () => {
    const fresh: ReportData = {
      ...initialFormState,
      tecnico: settings.defaultTecnico || 'Luis Eduardo',
      empresaAssinatura: settings.defaultEmpresa || 'ACS Informática - Suporte Técnico',
      data: getTodayInputDate(),
    };
    setFormData(fresh);
    localStorage.removeItem('tech_support_draft');
  };

  // Load Demo Data
  const handleLoadDemo = () => {
    setFormData({
      ticket: '98421',
      cliente: 'Mercado & Cia Ltda',
      cnpj: '12.345.678/0001-90',
      tecnico: settings.defaultTecnico || 'Luis Eduardo',
      acompanhado: 'Carlos Alberto (Gerente de TI)',
      data: getTodayInputDate(),
      status: 'CONCLUIDO',
      tipoAtendimento: 'PRESENCIAL',
      fato: 'Servidor de banco de dados do sistema de caixa PDV travou ao iniciar. Impressoras não estavam imprimindo cupons de venda.',
      diagnostico: 'Realizada a reinicialização dos serviços SQL Server e Spooler de Impressão. Crimpado novo cabo de rede no caixa 02 e ajustadas as permissões do banco.',
      observacoes: 'Recomendado upgrade de Nobreak para evitar quedas bruscas de energia nos caixas.',
      incluirAssinatura: true,
      empresaAssinatura: settings.defaultEmpresa || 'ACS Informática - Suporte Técnico',
      whatsappDestinatario: '(11) 98765-4321',
      fotos: [],
    });
    setActiveTab('form');
  };

  // Save Report to History
  const handleSaveReportToHistory = () => {
    const newReport: SavedReport = {
      ...formData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setHistory((prev) => [newReport, ...prev]);
    setIsSavedSuccess(true);
    setTimeout(() => setIsSavedSuccess(false), 2000);
  };

  // Load Report from History
  const handleLoadFromHistory = (report: SavedReport) => {
    const { id, createdAt, updatedAt, ...cleanReport } = report;
    setFormData(cleanReport);
    setActiveTab('form');
  };

  // Delete Report from History
  const handleDeleteFromHistory = (id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
  };

  // Clear All History
  const handleClearAllHistory = () => {
    if (confirm('Tem certeza que deseja apagar todo o histórico de relatórios salvação?')) {
      setHistory([]);
      localStorage.removeItem('tech_support_history');
    }
  };

  // Import Reports
  const handleImportReports = (imported: SavedReport[]) => {
    setHistory(imported);
    alert(`${imported.length} relatórios importados com sucesso!`);
  };

  // Insert Snippet Text
  const handleInsertSnippet = (snippetText: string) => {
    if (!snippetsCategory) return;

    setFormData((prev) => {
      const currentVal = prev[snippetsCategory];
      const newVal = currentVal
        ? `${currentVal}\n${snippetText}`
        : snippetText;

      return {
        ...prev,
        [snippetsCategory]: newVal,
      };
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col selection:bg-emerald-500 selection:text-slate-950">
      
      {/* Header Bar */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        savedCount={history.length}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onNewReport={handleResetForm}
        onLoadDemo={handleLoadDemo}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        
        {activeTab === 'form' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left Column: Input Form (7 cols) */}
            <div className="lg:col-span-7">
              <ReportForm
                formData={formData}
                setFormData={setFormData}
                settings={settings}
                onOpenSnippets={(category) => setSnippetsCategory(category)}
                onSaveReport={handleSaveReportToHistory}
                isSavedSuccess={isSavedSuccess}
                onResetForm={handleResetForm}
              />
            </div>

            {/* Right Column: Live WhatsApp & Document Preview (5 cols) */}
            <div className="lg:col-span-5">
              <ReportPreview formData={formData} settings={settings} />
            </div>

          </div>
        ) : (
          /* History View Tab */
          <HistoryView
            reports={history}
            onLoadReport={handleLoadFromHistory}
            onDeleteReport={handleDeleteFromHistory}
            onClearAll={handleClearAllHistory}
            onImportReports={handleImportReports}
            onNewReport={() => {
              handleResetForm();
              setActiveTab('form');
            }}
          />
        )}

      </main>

      {/* Modals */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
      />

      <SnippetSelectorModal
        isOpen={snippetsCategory !== null}
        onClose={() => setSnippetsCategory(null)}
        category={snippetsCategory || 'fato'}
        onSelectSnippet={handleInsertSnippet}
      />

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-4 text-center text-xs text-slate-500 print:hidden">
        <p>
          Gerador de Relatórios de Atendimento - Suporte Técnico em TI &bull; Envio direto via WhatsApp
        </p>
      </footer>

    </div>
  );
}
