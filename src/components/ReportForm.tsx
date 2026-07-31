import React, { useState, useRef } from 'react';
import { ReportData, ReportStatus, ServiceType, TechSettings } from '../types';
import { formatCNPJ, getTodayInputDate } from '../utils/formatters';
import { 
  Building2, 
  User, 
  Calendar, 
  FileText, 
  Sparkles, 
  BookOpen, 
  Search, 
  RotateCcw, 
  Save, 
  Check, 
  PhoneCall, 
  AlertCircle,
  Hash,
  Tag,
  Clock,
  Loader2,
  Wrench,
  Camera,
  Image as ImageIcon,
  Trash2,
  Maximize2,
  X,
  UploadCloud
} from 'lucide-react';

interface ReportFormProps {
  formData: ReportData;
  setFormData: React.Dispatch<React.SetStateAction<ReportData>>;
  settings: TechSettings;
  onOpenSnippets: (category: 'fato' | 'diagnostico' | 'observacoes') => void;
  onSaveReport: () => void;
  isSavedSuccess: boolean;
  onResetForm: () => void;
}

export const ReportForm: React.FC<ReportFormProps> = ({
  formData,
  setFormData,
  settings,
  onOpenSnippets,
  onSaveReport,
  isSavedSuccess,
  onResetForm,
}) => {
  const [isConsultingCnpj, setIsConsultingCnpj] = useState(false);
  const [cnpjError, setCnpjError] = useState<string | null>(null);
  const [cnpjSuccess, setCnpjSuccess] = useState<string | null>(null);

  const [aiLoadingField, setAiLoadingField] = useState<'fato' | 'diagnostico' | null>(null);
  const [aiErrorMessage, setAiErrorMessage] = useState<string | null>(null);

  // Photo Attachment Refs & Lightbox State
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);

  // Compress and resize image to keep reports light and fast
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 1200;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.75));
          } else {
            resolve(e.target?.result as string);
          }
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsProcessingPhoto(true);

    try {
      const newPhotos: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const compressed = await compressImage(files[i]);
        newPhotos.push(compressed);
      }

      setFormData((prev) => ({
        ...prev,
        fotos: [...(prev.fotos || []), ...newPhotos],
      }));
    } catch (err) {
      console.error('Erro ao processar foto:', err);
    } finally {
      setIsProcessingPhoto(false);
      // Reset input value so same photo can be uploaded if re-selected
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      fotos: (prev.fotos || []).filter((_, idx) => idx !== index),
    }));
  };

  // Field updates
  const handleChange = (
    field: keyof ReportData,
    value: string | boolean
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // CNPJ Formatting & Auto-consult
  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const formatted = settings.autoFormatCnpj ? formatCNPJ(raw) : raw;
    handleChange('cnpj', formatted);
    setCnpjError(null);
    setCnpjSuccess(null);
  };

  // Consult CNPJ API
  const handleConsultCnpj = async () => {
    const cleanCnpj = formData.cnpj.replace(/\D/g, '');
    if (cleanCnpj.length !== 14) {
      setCnpjError('CNPJ deve conter 14 dígitos.');
      return;
    }

    setIsConsultingCnpj(true);
    setCnpjError(null);
    setCnpjSuccess(null);

    try {
      const response = await fetch(`/api/cnpj/${cleanCnpj}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Não foi possível encontrar este CNPJ.');
      }

      const clientName = data.nome_fantasia || data.razao_social || '';
      if (clientName) {
        setFormData((prev) => ({
          ...prev,
          cliente: clientName,
        }));
        setCnpjSuccess(`Cliente encontrado: ${clientName}`);
      }
    } catch (err) {
      setCnpjError(
        err instanceof Error ? err.message : 'Falha ao buscar dados do CNPJ.'
      );
    } finally {
      setIsConsultingCnpj(false);
    }
  };

  // Quick Ticket Generator
  const handleGenerateTicket = () => {
    const randomTicket = Math.floor(10000 + Math.random() * 90000).toString();
    handleChange('ticket', randomTicket);
  };

  // Quick Date Helpers
  const handleSetToday = () => {
    handleChange('data', getTodayInputDate());
  };

  const handleSetYesterday = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yyyy = yesterday.getFullYear();
    const mm = String(yesterday.getMonth() + 1).padStart(2, '0');
    const dd = String(yesterday.getDate()).padStart(2, '0');
    handleChange('data', `${yyyy}-${mm}-${dd}`);
  };

  // AI Polish with Gemini
  const handleAiPolish = async (fieldType: 'fato' | 'diagnostico') => {
    const rawText = formData[fieldType];
    if (!rawText || rawText.trim().length < 5) {
      setAiErrorMessage(
        `Digite algumas palavras no campo ${
          fieldType === 'fato' ? 'Fato Constatado' : 'Diagnóstico'
        } antes de solicitar o aprimoramento por IA.`
      );
      setTimeout(() => setAiErrorMessage(null), 4000);
      return;
    }

    setAiLoadingField(fieldType);
    setAiErrorMessage(null);

    try {
      const res = await fetch('/api/ai/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: rawText,
          fieldType,
          context: {
            cliente: formData.cliente,
            ticket: formData.ticket,
          },
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Erro no serviço de Inteligência Artificial.');
      }

      if (result.refinedText) {
        setFormData((prev) => ({
          ...prev,
          [fieldType]: result.refinedText,
        }));
      }
    } catch (error) {
      setAiErrorMessage(
        error instanceof Error
          ? error.message
          : 'Falha ao comunicar com a IA Gemini.'
      );
      setTimeout(() => setAiErrorMessage(null), 5000);
    } finally {
      setAiLoadingField(null);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-6">
      
      {/* Title & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center">
            <FileText className="w-5 h-5 text-emerald-400 mr-2" />
            Dados do Atendimento
          </h2>
          <p className="text-xs text-slate-400">
            Preencha os campos abaixo para gerar o relatório do chamado
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={onResetForm}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium border border-slate-700 transition-colors flex items-center"
            title="Limpar formulário"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1 text-slate-400" />
            Limpar
          </button>
          
          <button
            type="button"
            onClick={onSaveReport}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center shadow-md ${
              isSavedSuccess
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            {isSavedSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 mr-1 stroke-[3]" />
                Salvo!
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5 mr-1" />
                Salvar Histórico
              </>
            )}
          </button>
        </div>
      </div>

      {/* Grid: Main Identifiers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        
        {/* Ticket */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1 flex justify-between items-center">
            <span className="flex items-center">
              <Hash className="w-3.5 h-3.5 text-slate-400 mr-1" />
              Ticket / Chamado:
            </span>
            <button
              type="button"
              onClick={handleGenerateTicket}
              className="text-[10px] text-emerald-400 hover:underline font-normal"
            >
              + Gerar Nº
            </button>
          </label>
          <input
            type="text"
            value={formData.ticket}
            onChange={(e) => handleChange('ticket', e.target.value)}
            placeholder="Ex: 12345"
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
          />
        </div>

        {/* Cliente */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center">
            <Building2 className="w-3.5 h-3.5 text-slate-400 mr-1" />
            Cliente:
          </label>
          <input
            type="text"
            value={formData.cliente}
            onChange={(e) => handleChange('cliente', e.target.value)}
            placeholder="Ex: Razão Social ou Nome Fantasia"
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
          />
        </div>

        {/* CNPJ */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
            <span className="flex items-center">
              <Tag className="w-3.5 h-3.5 text-slate-400 mr-1" />
              CNPJ:
            </span>
            {formData.cnpj.replace(/\D/g, '').length === 14 && (
              <button
                type="button"
                onClick={handleConsultCnpj}
                disabled={isConsultingCnpj}
                className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center font-medium transition-colors"
              >
                {isConsultingCnpj ? (
                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                ) : (
                  <Search className="w-3 h-3 mr-1" />
                )}
                Buscar Dados
              </button>
            )}
          </label>
          <div className="relative">
            <input
              type="text"
              value={formData.cnpj}
              onChange={handleCnpjChange}
              placeholder="00.000.000/0000-00"
              maxLength={18}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
            />
          </div>
          {cnpjError && (
            <p className="text-[11px] text-rose-400 mt-1 flex items-center">
              <AlertCircle className="w-3 h-3 mr-1 shrink-0" />
              {cnpjError}
            </p>
          )}
          {cnpjSuccess && (
            <p className="text-[11px] text-emerald-400 mt-1 flex items-center">
              <Check className="w-3 h-3 mr-1 shrink-0" />
              {cnpjSuccess}
            </p>
          )}
        </div>

        {/* Técnico */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center">
            <User className="w-3.5 h-3.5 text-slate-400 mr-1" />
            Técnico:
          </label>
          <input
            type="text"
            value={formData.tecnico}
            onChange={(e) => handleChange('tecnico', e.target.value)}
            placeholder="Nome do técnico responsável"
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
          />
        </div>

        {/* Acompanhado Por */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center">
            <User className="w-3.5 h-3.5 text-slate-400 mr-1" />
            Acompanhado Por:
          </label>
          <input
            type="text"
            value={formData.acompanhado}
            onChange={(e) => handleChange('acompanhado', e.target.value)}
            placeholder="Nome do responsável no cliente"
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
          />
        </div>

        {/* Data do Atendimento */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1 flex justify-between items-center">
            <span className="flex items-center">
              <Calendar className="w-3.5 h-3.5 text-slate-400 mr-1" />
              Data do Atendimento:
            </span>
            <div className="space-x-1.5 text-[10px]">
              <button
                type="button"
                onClick={handleSetToday}
                className="text-emerald-400 hover:underline"
              >
                Hoje
              </button>
              <span className="text-slate-600">|</span>
              <button
                type="button"
                onClick={handleSetYesterday}
                className="text-slate-400 hover:underline"
              >
                Ontem
              </button>
            </div>
          </label>
          <input
            type="date"
            value={formData.data}
            onChange={(e) => handleChange('data', e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
          />
        </div>

        {/* Tipo de Atendimento */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center">
            <Wrench className="w-3.5 h-3.5 text-slate-400 mr-1" />
            Tipo de Atendimento:
          </label>
          <select
            value={formData.tipoAtendimento}
            onChange={(e) =>
              handleChange('tipoAtendimento', e.target.value as ServiceType)
            }
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
          >
            <option value="PRESENCIAL">Presencial</option>
            <option value="REMOTO">Remoto (AnyDesk/TeamViewer)</option>
            <option value="TELEFONICO">Telefônico</option>
            <option value="LABORATORIO">Laboratório / Balcão</option>
          </select>
        </div>

        {/* Status do Atendimento */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center">
            <Clock className="w-3.5 h-3.5 text-slate-400 mr-1" />
            Status do Chamado:
          </label>
          <select
            value={formData.status}
            onChange={(e) =>
              handleChange('status', e.target.value as ReportStatus)
            }
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
          >
            <option value="CONCLUIDO">Concluído</option>
            <option value="EM_ANDAMENTO">Em Andamento</option>
            <option value="PENDENTE">Pendente</option>
            <option value="AGUARDANDO_CLIENTE">Aguardando Cliente</option>
            <option value="AGUARDANDO_PECA">Aguardando Peça</option>
          </select>
        </div>

        {/* Telefone WhatsApp (Opcional) */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center">
            <PhoneCall className="w-3.5 h-3.5 text-emerald-400 mr-1" />
            WhatsApp Destinatário (Opcional):
          </label>
          <input
            type="text"
            value={formData.whatsappDestinatario}
            onChange={(e) =>
              handleChange('whatsappDestinatario', e.target.value)
            }
            placeholder="(11) 99999-9999"
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
          />
        </div>

      </div>

      {/* AI Global Error Banner if any */}
      {aiErrorMessage && (
        <div className="p-3 bg-rose-950/60 border border-rose-800/80 rounded-xl text-rose-300 text-xs flex items-center">
          <AlertCircle className="w-4 h-4 mr-2 shrink-0" />
          <span>{aiErrorMessage}</span>
        </div>
      )}

      {/* Textarea 1: FATO CONSTATADO */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-200 tracking-wide uppercase flex items-center">
            FATO CONSTATADO:
          </label>

          <div className="flex items-center space-x-2">
            {/* Quick Snippets Button */}
            <button
              type="button"
              onClick={() => onOpenSnippets('fato')}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium border border-slate-700 transition-colors flex items-center"
            >
              <BookOpen className="w-3 h-3 mr-1 text-slate-400" />
              Modelos
            </button>

            {/* AI Polish Button */}
            <button
              type="button"
              onClick={() => handleAiPolish('fato')}
              disabled={aiLoadingField === 'fato'}
              className="px-2.5 py-1 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-lg text-xs font-semibold transition-all shadow-sm flex items-center disabled:opacity-50"
            >
              {aiLoadingField === 'fato' ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Melhorando...
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3 mr-1 text-amber-300" />
                  Polir com IA
                </>
              )}
            </button>
          </div>
        </div>

        <textarea
          rows={3}
          value={formData.fato}
          onChange={(e) => handleChange('fato', e.target.value)}
          placeholder="Descreva o problema constatado ou relatado pelo cliente (Ex: Computador não conecta no Wi-Fi após atualização...)"
          className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 leading-relaxed resize-y"
        />
      </div>

      {/* Textarea 2: DIAGNÓSTICO E AÇÕES REALIZADAS */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-200 tracking-wide uppercase flex items-center">
            DIAGNÓSTICO E AÇÕES REALIZADAS:
          </label>

          <div className="flex items-center space-x-2">
            {/* Quick Snippets Button */}
            <button
              type="button"
              onClick={() => onOpenSnippets('diagnostico')}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium border border-slate-700 transition-colors flex items-center"
            >
              <BookOpen className="w-3 h-3 mr-1 text-slate-400" />
              Modelos
            </button>

            {/* AI Polish Button */}
            <button
              type="button"
              onClick={() => handleAiPolish('diagnostico')}
              disabled={aiLoadingField === 'diagnostico'}
              className="px-2.5 py-1 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-lg text-xs font-semibold transition-all shadow-sm flex items-center disabled:opacity-50"
            >
              {aiLoadingField === 'diagnostico' ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Melhorando...
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3 mr-1 text-amber-300" />
                  Polir com IA
                </>
              )}
            </button>
          </div>
        </div>

        <textarea
          rows={4}
          value={formData.diagnostico}
          onChange={(e) => handleChange('diagnostico', e.target.value)}
          placeholder="Descreva a solução, testes e ações executadas pelo técnico..."
          className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 leading-relaxed resize-y"
        />
      </div>

      {/* Textarea 3: OBSERVAÇÕES E RECOMENDAÇÕES (Opcional) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-300 tracking-wide uppercase flex items-center">
            OBSERVAÇÕES E RECOMENDAÇÕES (OPCIONAL):
          </label>
          <button
            type="button"
            onClick={() => onOpenSnippets('observacoes')}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium border border-slate-700 transition-colors flex items-center"
          >
            <BookOpen className="w-3 h-3 mr-1 text-slate-400" />
            Modelos
          </button>
        </div>
        <textarea
          rows={2}
          value={formData.observacoes}
          onChange={(e) => handleChange('observacoes', e.target.value)}
          placeholder="Anotações extras, orientações preventivas ou alertas para o cliente..."
          className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 leading-relaxed resize-y"
        />
      </div>

      {/* PHOTO ATTACHMENTS SECTION */}
      <div className="space-y-3 pt-2 border-t border-slate-800/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <label className="text-xs font-bold text-slate-200 tracking-wide uppercase flex items-center">
              <Camera className="w-4 h-4 text-emerald-400 mr-1.5" />
              Fotos e Evidências ({formData.fotos?.length || 0})
            </label>
            <p className="text-[11px] text-slate-400">
              Anexe fotos de equipamentos, cabos ou telas de erro (via câmera ou galeria)
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            {/* Hidden native file inputs */}
            <input
              type="file"
              ref={cameraInputRef}
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => handleImageUpload(e.target.files)}
            />
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleImageUpload(e.target.files)}
            />

            {/* Camera Button */}
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              disabled={isProcessingPhoto}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs transition-colors flex items-center shadow-sm disabled:opacity-50"
              title="Tirar foto usando a câmera do dispositivo"
            >
              <Camera className="w-3.5 h-3.5 mr-1.5" />
              Tirar Foto
            </button>

            {/* Upload File / Gallery Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessingPhoto}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-medium transition-colors flex items-center disabled:opacity-50"
              title="Escolher fotos salvos no arquivo ou galeria"
            >
              <ImageIcon className="w-3.5 h-3.5 mr-1.5 text-teal-400" />
              Galeria / Arquivos
            </button>
          </div>
        </div>

        {/* Loading Indicator when compressing */}
        {isProcessingPhoto && (
          <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-emerald-300 text-xs flex items-center">
            <Loader2 className="w-4 h-4 mr-2 animate-spin text-emerald-400" />
            <span>Processando e otimizando imagem...</span>
          </div>
        )}

        {/* Photos Grid */}
        {formData.fotos && formData.fotos.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-1">
            {formData.fotos.map((photo, index) => (
              <div
                key={index}
                className="group relative aspect-video sm:aspect-square bg-slate-950 rounded-xl border border-slate-800 overflow-hidden shadow-md hover:border-emerald-500/50 transition-all"
              >
                <img
                  src={photo}
                  alt={`Evidência ${index + 1}`}
                  className="w-full h-full object-cover"
                />

                {/* Number Badge */}
                <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-slate-950/80 text-white text-[10px] font-mono rounded-md border border-slate-700">
                  #{index + 1}
                </span>

                {/* Hover overlay actions */}
                <div className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setPreviewPhoto(photo)}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors border border-slate-600"
                    title="Ampliar Foto"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(index)}
                    className="p-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors"
                    title="Excluir Foto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-800 hover:border-slate-700 bg-slate-950/50 hover:bg-slate-950 rounded-xl p-4 text-center cursor-pointer transition-colors"
          >
            <UploadCloud className="w-6 h-6 text-slate-600 mx-auto mb-1" />
            <p className="text-xs text-slate-400 font-medium">Nenhuma foto anexada ainda</p>
            <p className="text-[10px] text-slate-500">Clique para escolher imagens ou use o botão 'Tirar Foto'</p>
          </div>
        )}
      </div>

      {/* Lightbox Modal for Photo Preview */}
      {previewPhoto && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="relative max-w-4xl w-full bg-slate-900 border border-slate-800 rounded-2xl p-2 overflow-hidden shadow-2xl flex flex-col items-center">
            <button
              type="button"
              onClick={() => setPreviewPhoto(null)}
              className="absolute top-4 right-4 p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-full transition-colors z-10 border border-slate-700"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={previewPhoto}
              alt="Visualização da foto"
              className="max-h-[80vh] w-auto object-contain rounded-xl"
            />
          </div>
        </div>
      )}

      {/* Footer / Signature Controls */}
      <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <label className="inline-flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.incluirAssinatura}
            onChange={(e) => handleChange('incluirAssinatura', e.target.checked)}
            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 bg-slate-950 border-slate-700"
          />
          <span className="text-xs text-slate-300 font-medium">
            Incluir assinatura da empresa no rodapé do relatório
          </span>
        </label>

        {formData.incluirAssinatura && (
          <input
            type="text"
            value={formData.empresaAssinatura}
            onChange={(e) => handleChange('empresaAssinatura', e.target.value)}
            placeholder="Nome da empresa para rodapé"
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 w-full sm:w-64"
          />
        )}
      </div>

    </div>
  );
};
