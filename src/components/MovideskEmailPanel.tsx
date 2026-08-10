import React, { useEffect, useRef, useState } from 'react';
import { Mail, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { ReportData } from '../types';

interface Props {
  formData: ReportData;
  setFormData: React.Dispatch<React.SetStateAction<ReportData>>;
}

export const MovideskEmailPanel: React.FC<Props> = ({ formData, setFormData }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const lastLoadedTicket = useRef('');

  useEffect(() => {
    const ticket = String(formData.ticket || '').trim();
    if (!ticket || ticket.length < 3 || ticket === lastLoadedTicket.current) return;

    const timer = window.setTimeout(async () => {
      lastLoadedTicket.current = ticket;
      setLoading(true);
      setError('');
      try {
        const response = await fetch(`/api/movidesk/ticket?id=${encodeURIComponent(ticket)}`);
        const data = await response.json().catch(() => null);
        if (!response.ok) throw new Error(data?.error || 'Não foi possível consultar o e-mail do cliente.');

        const email = String(data?.emailCliente || '').trim();
        setFormData(prev => ({
          ...prev,
          emailCliente: email || prev.emailCliente || '',
          enviarEmailCliente: email ? (prev.enviarEmailCliente ?? true) : false,
        }));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Falha ao consultar e-mail do cliente.');
      } finally {
        setLoading(false);
      }
    }, 700);

    return () => window.clearTimeout(timer);
  }, [formData.ticket, setFormData]);

  return (
    <div className="mb-4 rounded-2xl border border-sky-500/20 bg-sky-950/20 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Mail className="w-4 h-4 text-sky-400" />
        <div>
          <p className="text-sm font-bold text-slate-100">E-mail do cliente no Movidesk</p>
          <p className="text-[11px] text-slate-400">Importado automaticamente do cadastro vinculado ao chamado.</p>
        </div>
        {loading && <Loader2 className="ml-auto w-4 h-4 animate-spin text-sky-400" />}
      </div>

      <input
        type="email"
        value={formData.emailCliente || ''}
        onChange={(e) => setFormData(prev => ({ ...prev, emailCliente: e.target.value }))}
        placeholder="cliente@empresa.com.br"
        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
      />

      <label className="mt-3 flex items-start gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={Boolean(formData.enviarEmailCliente && formData.emailCliente)}
          disabled={!formData.emailCliente}
          onChange={(e) => setFormData(prev => ({ ...prev, enviarEmailCliente: e.target.checked }))}
          className="mt-0.5 h-4 w-4 accent-sky-500"
        />
        <span className="text-xs text-slate-300">
          <strong>Enviar também por e-mail ao cliente</strong> quando o laudo for enviado ao Movidesk.
        </span>
      </label>

      {formData.emailCliente && !loading && (
        <p className="mt-2 text-[11px] text-emerald-400 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> Destinatário: {formData.emailCliente}
        </p>
      )}
      {error && (
        <p className="mt-2 text-[11px] text-amber-400 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> {error}
        </p>
      )}
    </div>
  );
};
