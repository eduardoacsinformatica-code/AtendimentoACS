import React, { useState, useEffect } from 'react';
import { QuickSnippet } from '../types';
import { 
  Search, 
  Plus, 
  X, 
  Sparkles, 
  Check, 
  Pencil, 
  Trash2, 
  RotateCcw, 
  BookOpen,
  Save,
  ArrowLeft,
  AlertCircle
} from 'lucide-react';

interface SnippetSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: 'fato' | 'diagnostico' | 'observacoes';
  onSelectSnippet: (snippetText: string) => void;
  snippets: QuickSnippet[];
  onSaveSnippet: (snippet: QuickSnippet) => void;
  onDeleteSnippet: (snippetId: string) => void;
  onResetSnippets: () => void;
}

export const SnippetSelectorModal: React.FC<SnippetSelectorModalProps> = ({
  isOpen,
  onClose,
  category,
  onSelectSnippet,
  snippets,
  onSaveSnippet,
  onDeleteSnippet,
  onResetSnippets,
}) => {
  const [activeCategory, setActiveCategory] = useState<'all' | 'fato' | 'diagnostico' | 'observacoes'>('fato');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Form mode for creating or editing a model
  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
  const [editingSnippet, setEditingSnippet] = useState<QuickSnippet | null>(null);

  // Form fields
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<'fato' | 'diagnostico' | 'observacoes'>('fato');
  const [formText, setFormText] = useState('');
  const [formError, setFormError] = useState('');

  // Synchronize initial category when opened
  useEffect(() => {
    if (isOpen) {
      setActiveCategory(category);
      setViewMode('list');
      setSearch('');
      setFormError('');
    }
  }, [isOpen, category]);

  if (!isOpen) return null;

  // Filter snippets by active tab and search text
  const filteredSnippets = snippets.filter((s) => {
    const matchesCategory = activeCategory === 'all' || s.category === activeCategory;
    const matchesSearch =
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.text.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleApply = (snippet: QuickSnippet) => {
    onSelectSnippet(snippet.text);
    setSelectedId(snippet.id);
    setTimeout(() => {
      setSelectedId(null);
      onClose();
    }, 200);
  };

  const handleStartCreate = () => {
    setEditingSnippet(null);
    setFormTitle('');
    setFormCategory(activeCategory === 'all' ? 'fato' : activeCategory);
    setFormText('');
    setFormError('');
    setViewMode('form');
  };

  const handleStartEdit = (e: React.MouseEvent, snippet: QuickSnippet) => {
    e.stopPropagation();
    setEditingSnippet(snippet);
    setFormTitle(snippet.title);
    setFormCategory(snippet.category);
    setFormText(snippet.text);
    setFormError('');
    setViewMode('form');
  };

  const handleDelete = (e: React.MouseEvent, snippetId: string) => {
    e.stopPropagation();
    if (confirm('Tem certeza que deseja excluir este modelo de texto?')) {
      onDeleteSnippet(snippetId);
    }
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError('Informe o título do modelo.');
      return;
    }
    if (!formText.trim()) {
      setFormError('Informe o texto do modelo.');
      return;
    }

    const snippetToSave: QuickSnippet = {
      id: editingSnippet ? editingSnippet.id : `custom_${Date.now()}`,
      title: formTitle.trim(),
      category: formCategory,
      text: formText.trim(),
    };

    onSaveSnippet(snippetToSave);
    setViewMode('list');
    setActiveCategory(formCategory);
  };

  const handleConfirmReset = () => {
    if (confirm('Deseja restaurar todos os modelos para o padrão inicial? Suas alterações personalizadas serão redefinidas.')) {
      onResetSnippets();
    }
  };

  const getCategoryLabel = (cat: 'fato' | 'diagnostico' | 'observacoes') => {
    switch (cat) {
      case 'fato':
        return 'Fato Constatado';
      case 'diagnostico':
        return 'Diagnóstico e Ações';
      case 'observacoes':
        return 'Observações';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/95">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center">
                Modelos de Texto Rápidos
              </h3>
              <p className="text-xs text-slate-400">
                {viewMode === 'form'
                  ? editingSnippet ? 'Editar Modelo de Texto' : 'Criar Novo Modelo de Texto'
                  : 'Selecione, altere ou crie seus modelos de atendimento'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {viewMode === 'list' && (
              <button
                type="button"
                onClick={handleStartCreate}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs transition-colors flex items-center shadow-md shadow-emerald-950/40"
              >
                <Plus className="w-3.5 h-3.5 mr-1 stroke-[3]" />
                Novo Modelo
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {viewMode === 'list' ? (
          <>
            {/* Category Tabs & Search Bar */}
            <div className="p-4 border-b border-slate-800 bg-slate-950/60 space-y-3">
              {/* Category Filter Pills */}
              <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveCategory('fato')}
                  className={`px-3 py-1.5 rounded-xl font-medium transition-all shrink-0 ${
                    activeCategory === 'fato'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  Fato Constatado
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCategory('diagnostico')}
                  className={`px-3 py-1.5 rounded-xl font-medium transition-all shrink-0 ${
                    activeCategory === 'diagnostico'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  Diagnóstico e Ações
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCategory('observacoes')}
                  className={`px-3 py-1.5 rounded-xl font-medium transition-all shrink-0 ${
                    activeCategory === 'observacoes'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  Observações
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCategory('all')}
                  className={`px-3 py-1.5 rounded-xl font-medium transition-all shrink-0 ${
                    activeCategory === 'all'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  Todos ({snippets.length})
                </button>
              </div>

              {/* Search Box */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar modelo por título ou conteúdo..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Snippets Cards List */}
            <div className="p-4 overflow-y-auto space-y-3 flex-1">
              {filteredSnippets.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <Sparkles className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-slate-400 text-xs">
                    Nenhum modelo encontrado para "{search}".
                  </p>
                  <button
                    type="button"
                    onClick={handleStartCreate}
                    className="inline-flex items-center px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Criar Modelo Agora
                  </button>
                </div>
              ) : (
                filteredSnippets.map((snippet) => (
                  <div
                    key={snippet.id}
                    onClick={() => handleApply(snippet)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer group relative ${
                      selectedId === snippet.id
                        ? 'bg-emerald-950/50 border-emerald-500 text-white'
                        : 'bg-slate-800/50 border-slate-800 hover:bg-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 pr-16">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">
                            {snippet.title}
                          </h4>
                          {activeCategory === 'all' && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                              {getCategoryLabel(snippet.category)}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                          {snippet.text}
                        </p>
                      </div>

                      {/* Action buttons (Insert, Edit, Delete) */}
                      <div className="flex items-center space-x-1 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => handleStartEdit(e, snippet)}
                          className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700/80 transition-colors"
                          title="Editar este modelo"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleDelete(e, snippet.id)}
                          className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-rose-950/80 text-slate-400 hover:text-rose-300 border border-slate-700/80 hover:border-rose-800/80 transition-colors"
                          title="Excluir este modelo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApply(snippet);
                          }}
                          className="ml-1 px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-slate-950 font-bold text-[11px] border border-emerald-500/30 transition-all flex items-center"
                        >
                          {selectedId === snippet.id ? (
                            <>
                              <Check className="w-3 h-3 mr-1" />
                              Inserido
                            </>
                          ) : (
                            <>
                              <Plus className="w-3 h-3 mr-1" />
                              Usar
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between">
              <button
                type="button"
                onClick={handleConfirmReset}
                className="text-slate-500 hover:text-slate-300 text-xs flex items-center transition-colors font-medium"
                title="Restaurar a lista original de modelos"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                Restaurar Padrões
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
              >
                Fechar
              </button>
            </div>
          </>
        ) : (
          /* Form Mode: Create / Edit Model */
          <form onSubmit={handleSaveForm} className="p-5 flex-1 flex flex-col space-y-4 overflow-y-auto">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Voltar para a lista
              </button>

              <span className="text-xs text-emerald-400 font-semibold bg-emerald-950 px-2.5 py-0.5 rounded border border-emerald-800/60">
                {editingSnippet ? 'Modo Edição' : 'Novo Modelo'}
              </span>
            </div>

            {formError && (
              <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-xl text-rose-300 text-xs flex items-center">
                <AlertCircle className="w-4 h-4 mr-2 shrink-0" />
                {formError}
              </div>
            )}

            {/* Category Select */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Categoria do Modelo
              </label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 text-slate-200 text-xs rounded-xl px-3 py-2.5 outline-none"
              >
                <option value="fato">Fato Constatado (Problema Relatado)</option>
                <option value="diagnostico">Diagnóstico e Ações Realizadas</option>
                <option value="observacoes">Observações (Recomendações/Alertas)</option>
              </select>
            </div>

            {/* Title Input */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Título do Modelo
              </label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Ex: Instalação e Configuração de Impressora USB"
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 text-slate-200 text-xs rounded-xl px-3 py-2.5 outline-none"
              />
            </div>

            {/* Text Area */}
            <div className="space-y-1 flex-1 flex flex-col">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Conteúdo / Texto do Modelo
              </label>
              <textarea
                value={formText}
                onChange={(e) => setFormText(e.target.value)}
                rows={6}
                placeholder="Escreva a mensagem padrão que será inserida ao utilizar este modelo..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 text-slate-200 text-xs rounded-xl p-3 outline-none resize-none flex-1 font-sans"
              />
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs transition-colors flex items-center shadow-lg shadow-emerald-950/40"
              >
                <Save className="w-4 h-4 mr-1.5" />
                {editingSnippet ? 'Salvar Alterações' : 'Criar Modelo'}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
