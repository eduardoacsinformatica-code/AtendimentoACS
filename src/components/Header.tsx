import React from 'react';
import { 
  FileText, 
  History, 
  Settings, 
  Sparkles, 
  PlusCircle, 
  BookOpen,
  ShieldCheck
} from 'lucide-react';

interface HeaderProps {
  activeTab: 'form' | 'history';
  setActiveTab: (tab: 'form' | 'history') => void;
  savedCount: number;
  onOpenSettings: () => void;
  onNewReport: () => void;
  onLoadDemo: () => void;
  onOpenSnippets?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  savedCount,
  onOpenSettings,
  onNewReport,
  onLoadDemo,
  onOpenSnippets,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-emerald-500/20">
              <FileText className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-bold tracking-tight text-white">
                  Relatório de Suporte
                </h1>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="w-3 h-3 mr-1" />
                  WhatsApp Ready
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Gerador de comprovantes e laudos de atendimento técnico
              </p>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center space-x-2">
            
            {/* New Report Button */}
            <button
              onClick={onNewReport}
              className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
              title="Novo Relatório Limpo"
            >
              <PlusCircle className="w-4 h-4 mr-1.5 text-emerald-400" />
              <span className="hidden sm:inline">Novo</span>
            </button>

            {/* Load Demo Button */}
            <button
              onClick={onLoadDemo}
              className="hidden md:inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/80 transition-colors"
              title="Preencher com Dados de Exemplo"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
              <span>Exemplo</span>
            </button>

            {/* Manage Snippets Button */}
            {onOpenSnippets && (
              <button
                onClick={onOpenSnippets}
                className="inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                title="Gerenciar Modelos de Texto Rápidos"
              >
                <BookOpen className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                <span className="hidden sm:inline">Modelos</span>
              </button>
            )}

            {/* Tab Switcher: Form vs History */}
            <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center space-x-1">
              <button
                onClick={() => setActiveTab('form')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === 'form'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                Página inicial
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center ${
                  activeTab === 'history'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <History className="w-3.5 h-3.5 mr-1" />
                <span>Histórico</span>
                {savedCount > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-500/30 text-emerald-300">
                    {savedCount}
                  </span>
                )}
              </button>
            </div>

            {/* Settings Button */}
            <button
              onClick={onOpenSettings}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent hover:border-slate-700 transition-colors"
              title="Configurações do Técnico"
            >
              <Settings className="w-4 h-4" />
            </button>

          </div>
        </div>
      </div>
    </header>
  );
};
