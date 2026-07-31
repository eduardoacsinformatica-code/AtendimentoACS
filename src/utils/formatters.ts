import { ReportData, TechSettings } from '../types';

/**
 * Formats raw numeric string to CNPJ mask: XX.XXX.XXX/XXXX-XX
 */
export function formatCNPJ(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

/**
 * Formats YYYY-MM-DD to DD/MM/YYYY
 */
export function formatDateToPtBr(dateString: string): string {
  if (!dateString) return '';
  const parts = dateString.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateString;
}

/**
 * Gets today's date formatted as YYYY-MM-DD for date inputs
 */
export function getTodayInputDate(): string {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export const STATUS_LABELS: Record<string, { label: string; badgeClass: string; icon: string }> = {
  CONCLUIDO: {
    label: 'Concluído',
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
    icon: '✅',
  },
  EM_ANDAMENTO: {
    label: 'Em Andamento',
    badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800',
    icon: '⏳',
  },
  PENDENTE: {
    label: 'Pendente',
    badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 dark:border-rose-800',
    icon: '🔴',
  },
  AGUARDANDO_CLIENTE: {
    label: 'Aguardando Cliente',
    badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300 dark:border-blue-800',
    icon: '👤',
  },
  AGUARDANDO_PECA: {
    label: 'Aguardando Peça',
    badgeClass: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300 dark:border-purple-800',
    icon: '📦',
  },
};

export const TIPO_ATENDIMENTO_LABELS: Record<string, string> = {
  PRESENCIAL: 'Presencial',
  REMOTO: 'Remoto',
  TELEFONICO: 'Telefônico',
  LABORATORIO: 'Laboratório',
};

/**
 * Builds the formatted WhatsApp message text
 */
export function buildWhatsAppMessage(data: ReportData, settings?: TechSettings): string {
  const dataFormatada = formatDateToPtBr(data.data);
  const statusInfo = STATUS_LABELS[data.status] || { label: data.status, icon: '📋' };
  const tipoLabel = TIPO_ATENDIMENTO_LABELS[data.tipoAtendimento] || data.tipoAtendimento;

  const formatStyle = settings?.whatsappFormatStyle || 'padrao';

  if (formatStyle === 'compacto') {
    let msg = `*REL. SUPORTE #${data.ticket || 'S/N'}*\n`;
    msg += `*Cliente:* ${data.cliente || 'Não informado'}\n`;
    msg += `*Data:* ${dataFormatada} | *Tipo:* ${tipoLabel} | *Status:* ${statusInfo.label}\n`;
    if (data.tecnico) msg += `*Técnico:* ${data.tecnico}\n`;
    msg += `\n*Fato:* ${data.fato || 'Nenhum'}\n`;
    msg += `\n*Ações:* ${data.diagnostico || 'Nenhuma'}\n`;
    if (data.observacoes) msg += `\n*Obs:* ${data.observacoes}\n`;
    if (data.incluirAssinatura && (data.empresaAssinatura || settings?.defaultEmpresa)) {
      msg += `\n_${data.empresaAssinatura || settings?.defaultEmpresa}_`;
    }
    return msg;
  }

  if (formatStyle === 'detalhado') {
    let msg = `=============================\n`;
    msg += `🛠️ *RELATÓRIO DE ATENDIMENTO TÉCNICO*\n`;
    msg += `=============================\n\n`;
    msg += `🔖 *Ticket/Chamado:* ${data.ticket || 'Não informado'}\n`;
    msg += `🏢 *Cliente:* ${data.cliente || 'Não informado'}\n`;
    if (data.cnpj) msg += `📄 *CNPJ:* ${data.cnpj}\n`;
    msg += `👨‍💻 *Técnico Responsável:* ${data.tecnico || 'Não informado'}\n`;
    if (data.acompanhado) msg += `👥 *Acompanhado por:* ${data.acompanhado}\n`;
    msg += `📅 *Data do Atendimento:* ${dataFormatada}\n`;
    msg += `📍 *Modalidade:* ${tipoLabel}\n`;
    msg += `${statusInfo.icon} *Status:* ${statusInfo.label}\n\n`;

    msg += `-----------------------------\n`;
    msg += `⚠️ *FATO CONSTATADO*\n`;
    msg += `-----------------------------\n`;
    msg += `${data.fato || 'Sem registro.'}\n\n`;

    msg += `-----------------------------\n`;
    msg += `🔍 *DIAGNÓSTICO E AÇÕES REALIZADAS*\n`;
    msg += `-----------------------------\n`;
    msg += `${data.diagnostico || 'Sem registro.'}\n\n`;

    if (data.observacoes) {
      msg += `-----------------------------\n`;
      msg += `📌 *OBSERVAÇÕES E RECOMENDAÇÕES*\n`;
      msg += `-----------------------------\n`;
      msg += `${data.observacoes}\n\n`;
    }

    if (data.incluirAssinatura) {
      msg += `=============================\n`;
      msg += `*${data.empresaAssinatura || settings?.defaultEmpresa || 'Atendimento Técnico'}*\n`;
      msg += `=============================`;
    }
    return msg;
  }

  // Standard (Padrão) format - matches the original template structure plus enhanced formatting!
  let msg = `*REL. ATENDIMENTO*\n`;
  msg += `*Ticket:* ${data.ticket || 'N/A'}\n`;
  msg += `*Cliente:* ${data.cliente || 'N/A'}\n`;
  msg += `*CNPJ:* ${data.cnpj || 'N/A'}\n`;
  msg += `*Técnico:* ${data.tecnico || 'N/A'}\n`;
  msg += `*Acompanhado por:* ${data.acompanhado || 'N/A'}\n`;
  msg += `*Data do Atendimento:* ${dataFormatada}\n`;
  msg += `*Tipo de Atendimento:* ${tipoLabel}\n`;
  msg += `*Status:* ${statusInfo.label}\n\n`;

  msg += `*FATO CONSTATADO*\n`;
  msg += `${data.fato || 'Nenhum'}\n\n`;

  msg += `*DIAGNÓSTICO E AÇÕES REALIZADAS*\n`;
  msg += `${data.diagnostico || 'Nenhum'}`;

  if (data.observacoes) {
    msg += `\n\n*OBSERVAÇÕES*\n${data.observacoes}`;
  }

  if (data.fotos && data.fotos.length > 0) {
    msg += `\n\n📷 *FOTOS / EVIDÊNCIAS:* ${data.fotos.length} foto(s) anexada(s) ao laudo técnico.`;
  }

  if (data.incluirAssinatura && (data.empresaAssinatura || settings?.defaultEmpresa)) {
    msg += `\n\n_${data.empresaAssinatura || settings?.defaultEmpresa}_`;
  }

  return msg;
}

/**
 * Opens WhatsApp web or mobile app with the pre-filled message
 */
export function sendToWhatsApp(message: string, phoneNum?: string) {
  const encodedMsg = encodeURIComponent(message);
  let cleanPhone = phoneNum ? phoneNum.replace(/\D/g, '') : '';
  
  // If phone exists and missing country code, assume Brazil (+55) if 10 or 11 digits
  if (cleanPhone.length === 10 || cleanPhone.length === 11) {
    cleanPhone = '55' + cleanPhone;
  }

  let url = '';
  if (cleanPhone) {
    url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMsg}`;
  } else {
    url = `https://api.whatsapp.com/send?text=${encodedMsg}`;
  }

  window.open(url, '_blank');
}
