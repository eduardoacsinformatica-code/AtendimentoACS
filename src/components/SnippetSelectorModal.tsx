import React, { useState } from 'react';
import { DEFAULT_SNIPPETS } from '../data/snippets';
import { QuickSnippet } from '../types';
import { Search, Plus, X, Sparkles, Check } from 'lucide-react';

interface SnippetSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: 'fato' | 'diagnostico' | 'observacoes';
  onSelectSnippet: (snippetText: string) => void;
}

export const SnippetSelectorModal: React.FC<SnippetSelectorModalProps> = ({
  isOpen,
  onClose,
  category,
  onSelectSnippet,
}) => {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const categoryTitle = 
    category === 'fato' 
      ? 'Fato Constatado' 
      : category === 'diagnostico' 
      ? 'Diagnóstico e Ações' 
      : 'Observações';

  const categorySnippets = DEFAULT_SNIPPETS.filter(
    (s) => s.category === category
  );

  const filteredSnippets = categorySnippets.filter(
    (s) =>
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.text.toLowerCase().includes(search.toLowerCase())
  );

  const handleApply = (snippet: QuickSnippet) => {
    onSelectSnippet(snippet.text);
    setSelectedId(snippet.id);
    setTimeout(() => {
      setSelectedId(null);
      onClose();
    }, 200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Modelos de Texto Rápidos
              </h3>
              <p className="text-xs text-slate-400">
                Anotações frequentes para {categoryTitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/50">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Buscar modelo para ${categoryTitle}...`}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Snippets List */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          {filteredSnippets.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-sm">
              Nenhum modelo encontrado para "{search}".
            </div>
          ) : (
            filteredSnippets.map((snippet) => (
              <div
                key={snippet.id}
                onClick={() => handleApply(snippet)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer group ${
                  selectedId === snippet.id
                    ? 'bg-emerald-950/40 border-emerald-500/50 text-white'
                    : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600 text-slate-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <h4 className="text-sm font-semibold text-emerald-400 group-hover:text-emerald-300 transition-colors">
                    {snippet.title}
                  </h4>
                  {selectedId === snippet.id ? (
                    <span className="flex items-center text-xs text-emerald-400 font-medium bg-emerald-500/20 px-2 py-0.5 rounded">
                      <Check className="w-3 h-3 mr-1" />
                      Inserido
                    </span>
                  ) : (
                    <span className="opacity-0 group-hover:opacity-100 flex items-center text-xs text-slate-400 font-medium bg-slate-700/50 px-2 py-0.5 rounded transition-opacity">
                      <Plus className="w-3 h-3 mr-1" />
                      Inserir
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  {snippet.text}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-colors"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
