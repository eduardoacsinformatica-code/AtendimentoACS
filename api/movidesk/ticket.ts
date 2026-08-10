function stripHtml(value: string): string {
  return String(value || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .trim();
}

function formatCnpj(value: string): string {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length !== 14) return value || '';
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

function extractStructuredValue(text: string, label: RegExp): string {
  const match = text.match(label);
  return match?.[1]?.trim().replace(/^@/, '') || '';
}

function parseTicket(ticket: any, requestedId: string) {
  const actions = Array.isArray(ticket?.actions) ? ticket.actions : [];
  const actionTexts = actions.map((a: any) => stripHtml(a?.description || '')).filter(Boolean);
  const subject = stripHtml(ticket?.subject || '');
  const allText = [subject, ...actionTexts].join('\n');
  const mainClient = Array.isArray(ticket?.clients) && ticket.clients.length ? ticket.clients[0] : null;
  const createdBy = ticket?.createdBy || null;

  const nomeFantasia = extractStructuredValue(allText, /Nome\s+Fantasia\s*:\s*([^\r\n]+)/i);
  const razaoSocial = extractStructuredValue(allText, /Raz[aã]o\s+Social\s*:\s*([^\r\n]+)/i);
  const tecnicoTexto = extractStructuredValue(allText, /T[eé]cnico\s+Respons[aá]vel\s*:\s*([^\r\n]+)/i);
  const cnpjTexto = extractStructuredValue(allText, /CNPJ\s*:\s*([\d.\/-]+)/i);

  const cliente = nomeFantasia || razaoSocial || mainClient?.businessName || mainClient?.name || createdBy?.businessName || createdBy?.name || 'Cliente não informado';
  let cnpj = cnpjTexto || mainClient?.cpfCnpj || createdBy?.cpfCnpj || '';
  if (!cnpj) cnpj = allText.match(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b|\b\d{14}\b/)?.[0] || '';

  const tecnico = tecnicoTexto || ticket?.owner?.name || ticket?.owner?.businessName || createdBy?.name || createdBy?.businessName || '';
  let descricaoChamado = subject;
  for (const text of actionTexts) {
    const match = text.match(/Descri[çc][ãa]o(?:\s+do\s+(?:Atendimento|Chamado|Servi[çc]o|Problema))?\s*:\s*([\s\S]+)/i);
    if (match?.[1]?.trim()) {
      descricaoChamado = match[1].trim();
      break;
    }
  }

  const statusText = String(ticket?.status || '').toLowerCase();
  let status = 'EM_ANDAMENTO';
  if (/resolv|fechad|conclu/.test(statusText)) status = 'CONCLUIDO';
  else if (/pendent/.test(statusText)) status = 'PENDENTE';
  else if (/aguar/.test(statusText)) status = 'AGUARDANDO_CLIENTE';

  const createdDate = String(ticket?.createdDate || '');
  return {
    ticket: String(ticket?.protocol || ticket?.id || requestedId),
    cliente,
    cnpj: formatCnpj(cnpj),
    tecnico: String(tecnico).replace(/^@/, '').trim(),
    acompanhado: mainClient?.name && mainClient.name !== cliente ? mainClient.name : '',
    descricaoChamado,
    fato: '',
    status,
    data: createdDate ? createdDate.split('T')[0] : '',
    raw: { id: ticket?.id, protocol: ticket?.protocol, status: ticket?.status, category: ticket?.category, serviceFull: ticket?.serviceFull },
  };
}

async function fetchJson(url: string) {
  const response = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'AtendimentoACS/1.0' } });
  const text = await response.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  return { response, data, text };
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido.' });

  try {
    const urlObj = new URL(req.url || '', 'http://localhost');
    const id = String(req.query?.id || req.query?.ticket || urlObj.searchParams.get('id') || urlObj.searchParams.get('ticket') || '').trim();
    const token = process.env.MOVIDESK_API_TOKEN || req.query?.token || urlObj.searchParams.get('token') || '';

    if (!id) return res.status(400).json({ error: 'Número do Ticket/Chamado é obrigatório.' });
    if (!token) return res.status(503).json({ error: 'MOVIDESK_API_TOKEN não está configurado no servidor Vercel.' });

    const expand = 'clients,owner,createdBy,actions,customFieldValues';
    let ticket: any = null;
    const upstreamErrors: string[] = [];

    const protocolFilter = `protocol eq '${id.replace(/'/g, "''")}'`;
    const protocolUrl = `https://api.movidesk.com/public/v1/tickets?token=${encodeURIComponent(token)}&$filter=${encodeURIComponent(protocolFilter)}&$expand=${encodeURIComponent(expand)}&$top=1`;
    const protocolResult = await fetchJson(protocolUrl);
    if (protocolResult.response.ok && Array.isArray(protocolResult.data) && protocolResult.data.length) ticket = protocolResult.data[0];
    else if (!protocolResult.response.ok) upstreamErrors.push(`protocol:${protocolResult.response.status} ${protocolResult.text.slice(0, 250)}`);

    if (!ticket && /^\d+$/.test(id) && id.length <= 10) {
      const idUrl = `https://api.movidesk.com/public/v1/tickets?token=${encodeURIComponent(token)}&id=${encodeURIComponent(id)}&$expand=${encodeURIComponent(expand)}`;
      const idResult = await fetchJson(idUrl);
      if (idResult.response.ok) {
        const candidate = Array.isArray(idResult.data) ? idResult.data[0] : idResult.data;
        if (candidate?.id || candidate?.protocol) ticket = candidate;
      } else upstreamErrors.push(`id:${idResult.response.status} ${idResult.text.slice(0, 250)}`);
    }

    if (!ticket) {
      if (upstreamErrors.length) return res.status(502).json({ error: 'O Movidesk recusou a consulta. Verifique o token e as permissões da API.', details: upstreamErrors });
      return res.status(404).json({ error: `Chamado #${id} não foi encontrado no Movidesk.` });
    }

    return res.status(200).json(parseTicket(ticket, id));
  } catch (error) {
    console.error('Erro na rota Movidesk ticket:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Erro interno ao consultar o Movidesk.' });
  }
}
