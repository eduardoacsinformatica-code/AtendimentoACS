function cleanText(value: unknown): string {
  if (value == null) return '';
  return String(value)
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .trim();
}

function formatCnpj(value: unknown): string {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length !== 14) return String(value || '');
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

function mapTicket(ticket: any, requested: string) {
  const clients = Array.isArray(ticket?.clients) ? ticket.clients : [];
  const client = clients[0] || ticket?.createdBy || {};
  const actions = Array.isArray(ticket?.actions) ? ticket.actions : [];
  const fields = Array.isArray(ticket?.customFieldValues) ? ticket.customFieldValues : [];

  const actionTexts = actions
    .map((action: any) => cleanText(action?.description))
    .filter(Boolean);

  let cnpj = client?.cpfCnpj || client?.organization?.cpfCnpj || ticket?.createdBy?.cpfCnpj || ticket?.createdBy?.organization?.cpfCnpj || '';
  if (!cnpj) {
    const allText = [ticket?.subject, ...actionTexts].join('\n');
    const match = allText.match(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b|\b\d{14}\b/);
    if (match) cnpj = match[0];
  }

  let tecnico = ticket?.owner?.name || ticket?.owner?.businessName || ticket?.createdBy?.name || ticket?.createdBy?.businessName || '';
  const techField = fields.find((field: any) => Number(field?.customFieldId) === 221237);
  if (techField) {
    const value = techField?.value || techField?.items?.[0]?.customFieldItem;
    if (value) tecnico = String(value).replace(/^@/, '').trim();
  }

  const descricao = actionTexts.find((text: string) => /descri[cç][aã]o/i.test(text)) || actionTexts[0] || cleanText(ticket?.subject || '');
  const statusText = String(ticket?.status || '').toLowerCase();
  let status = 'EM_ANDAMENTO';
  if (/resolv|fechad|conclu/.test(statusText)) status = 'CONCLUIDO';
  else if (/pendent/.test(statusText)) status = 'PENDENTE';
  else if (/aguar/.test(statusText)) status = 'AGUARDANDO_CLIENTE';

  return {
    ticket: String(ticket?.protocol || ticket?.id || requested),
    cliente: client?.businessName || client?.name || ticket?.createdBy?.businessName || ticket?.createdBy?.name || 'Cliente não informado',
    cnpj: formatCnpj(cnpj),
    tecnico,
    acompanhado: client?.name || '',
    descricaoChamado: descricao,
    fato: '',
    status,
    data: ticket?.createdDate ? String(ticket.createdDate).split('T')[0] : '',
    raw: {
      id: ticket?.id,
      protocol: ticket?.protocol,
      status: ticket?.status,
    },
  };
}

async function movideskRequest(params: Record<string, string>) {
  const token = process.env.MOVIDESK_API_TOKEN?.trim();
  if (!token) {
    const error: any = new Error('MOVIDESK_API_TOKEN não configurado na Vercel.');
    error.status = 500;
    throw error;
  }

  const url = new URL('https://api.movidesk.com/public/v1/tickets');
  url.searchParams.set('token', token);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    const text = await response.text();
    if (!response.ok) {
      const error: any = new Error(`Movidesk respondeu com status ${response.status}.`);
      error.status = response.status >= 500 ? 502 : response.status;
      error.details = text.slice(0, 800).replace(/token=[^&\s\"]+/gi, 'token=***');
      throw error;
    }
    return text ? JSON.parse(text) : null;
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      const timeout: any = new Error('A API do Movidesk demorou demais para responder.');
      timeout.status = 504;
      throw timeout;
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido. Use GET.' });
  }

  try {
    const raw = req.query?.id || req.query?.ticket;
    if (!raw) return res.status(400).json({ error: 'Número do Ticket/Chamado é obrigatório.' });

    const cleanId = String(raw).trim();
    if (!/^[0-9A-Za-z._-]{1,50}$/.test(cleanId)) {
      return res.status(400).json({ error: 'Número do chamado/protocolo inválido.' });
    }

    const isInternalId = /^\d{1,9}$/.test(cleanId) && Number(cleanId) > 0 && Number(cleanId) <= 2147483647;
    let internalId = isInternalId ? cleanId : '';
    let ticket: any = null;

    // Para protocolos longos, primeiro localiza somente o ID interno.
    if (!internalId) {
      const escaped = cleanId.replace(/'/g, "''");
      const found = await movideskRequest({
        '$select': 'id,protocol',
        '$filter': `protocol eq '${escaped}'`,
        '$top': '1',
      });
      const candidate = Array.isArray(found) ? found[0] : found;
      if (candidate?.id) internalId = String(candidate.id);
    }

    if (!internalId) {
      return res.status(404).json({ error: `Chamado #${cleanId} não foi encontrado no Movidesk.` });
    }

    // Detalhes completos são buscados apenas depois que temos o ID interno.
    const detailed = await movideskRequest({
      id: internalId,
      '$expand': 'clients,owner,createdBy,actions,customFieldValues',
    });
    ticket = Array.isArray(detailed) ? detailed[0] : detailed;

    if (!ticket || (!ticket.id && !ticket.protocol)) {
      return res.status(404).json({ error: `Chamado #${cleanId} não foi encontrado no Movidesk.` });
    }

    return res.status(200).json(mapTicket(ticket, cleanId));
  } catch (error: any) {
    console.error('Erro Movidesk ticket:', error);
    return res.status(Number(error?.status) || 500).json({
      error: error instanceof Error ? error.message : 'Erro ao importar chamado do Movidesk.',
      details: error?.details,
    });
  }
}
