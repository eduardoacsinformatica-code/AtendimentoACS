import React from 'react';
import { TechSettings } from '../types';
import { DEFAULT_TECNICOS } from '../data/tecnicos';
import { X, Save, Settings as SettingsIcon, Check } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: TechSettings;
  onSaveSettings: (newSettings: TechSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
}) => {
  const [formData, setFormData] = React.useState<TechSettings>(settings);
  const [savedSuccess, setSavedSuccess] = React.useState(false);

  React.useEffect(() => {
    setFormData(settings);
  }, [settings, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center">
              <SettingsIcon className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Configurações do Técnico
              </h3>
              <p className="text-xs text-slate-400">
                Personalize seus valores padrão para agilizar novos relatórios
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          
          {/* Default Technician Name */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-300">
                Nome do Técnico Padrão
              </label>
              <div className="flex items-center space-x-1">
                {DEFAULT_TECNICOS.map((tech) => (
                  <button
                    key={tech}
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, defaultTecnico: tech })
                    }
                    className={`text-[10px] px-2 py-0.5 rounded-md border font-medium transition-colors ${
                      formData.defaultTecnico === tech
                        ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                    }`}
                  >
                    {tech}
                  </button>
                ))}
              </div>
            </div>
            <input
              type="text"
              list="settings-tecnicos-list"
              value={formData.defaultTecnico}
              onChange={(e) =>
                setFormData({ ...formData, defaultTecnico: e.target.value })
              }
              placeholder="Ex: Luis Eduardo ou Eduardo Visgueira"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
            />
            <datalist id="settings-tecnicos-list">
              {DEFAULT_TECNICOS.map((tech) => (
                <option key={tech} value={tech} />
              ))}
            </datalist>
            <p className="text-[11px] text-slate-500 mt-1">
              Este nome será preenchido automaticamente ao criar novos relatórios.
            </p>
          </div>

          {/* Default Company Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Nome da Empresa / Assinatura Padrão
            </label>
            <input
              type="text"
              value={formData.defaultEmpresa}
              onChange={(e) =>
                setFormData({ ...formData, defaultEmpresa: e.target.value })
              }
              placeholder="Ex: ACS Informática - Suporte Técnico"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Rodapé exibido ao final da mensagem e no laudo impresso.
            </p>
          </div>

          {/* Movidesk API Token */}
          <div className="pt-2 border-t border-slate-800">
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Chave de API do Movidesk (Token)
            </label>
            <input
              type="text"
              value={formData.movideskToken || ''}
              onChange={(e) =>
                setFormData({ ...formData, movideskToken: e.target.value })
              }
              placeholder="Ex: 75762c40-5399-4b83-b958-c265fbf5d6fb"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Token de integração da API pública do Movidesk (deixe em branco para usar o padrão).
            </p>
          </div>

          {/* Auto Format CNPJ Toggle */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-200">
                Máscara Automática de CNPJ
              </span>
              <p className="text-[11px] text-slate-400">
                Formatar dígitos automaticamente para 00.000.000/0001-00
              </p>
            </div>
            <input
              type="checkbox"
              checked={formData.autoFormatCnpj}
              onChange={(e) =>
                setFormData({ ...formData, autoFormatCnpj: e.target.checked })
              }
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 bg-slate-950 border-slate-700"
            />
          </div>

          {/* Submit Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition-colors flex items-center shadow-lg shadow-emerald-950"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4 mr-1.5" />
                  Salvo!
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-1.5" />
                  Salvar Preferências
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
