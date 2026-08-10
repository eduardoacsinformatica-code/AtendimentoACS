function getToken(): string {
  const token = process.env.MOVIDESK_API_TOKEN?.trim();
  if (!token) throw new Error('MOVIDESK_API_TOKEN não configurado na Vercel.');
  return token;
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function movideskRequest(
  params: Record<string, string | number>,
  init: RequestInit = {},
  timeoutMs = 25000,
): Promise<Response> {
  const url = new URL('https://api.movidesk.com/public/v1/tickets');
  url.searchParams.set('token', getToken());
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(init.headers || {}),
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

async function readJson(response: Response): Promise<any> {
  const text = await response.text();
  if (!response.ok) {
    const safe = text.replace(/token=[^&\s\"]+/gi, 'token=***').slice(0, 1000);
    const err: any = new Error(`Movidesk respondeu com status ${response.status}.`);
    err.httpStatus = response.status;
    err.details = safe;
    throw err;
  }
  if (!text) return null;
  try { return JSON.parse(text); } catch { return null; }
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Use POST.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { ticket, cliente, acompanhado, fato, diagnostico, observacoes, status, tecnico } = body;

    getToken();
    if (!ticket) return res.status(400).json({ error: 'Número do chamado é obrigatório.' });

    const cleanId = String(ticket).trim();
    const isNumericId = /^\d{1,9}$/.test(cleanId) && Number(cleanId) > 0 && Number(cleanId) <= 2147483647;
    let targetId: number | null = null;

    if (isNumericId) {
      try {
        const direct = await readJson(await movideskRequest({ id: cleanId, '$select': 'id,protocol' }));
        const candidate = Array.isArray(direct) ? direct[0] : direct;
        if (candidate?.id) targetId = Number(candidate.id);
      } catch (err) {
        console.warn('Busca por id falhou; tentando protocolo.', err);
      }
    }

    if (!targetId) {
      const escaped = cleanId.replace(/'/g, "''");
      const found = await readJson(await movideskRequest({
        '$filter': `protocol eq '${escaped}'`,
        '$select': 'id,protocol',
        '$top': 1,
      }));
      if (Array.isArray(found) && found[0]?.id) targetId = Number(found[0].id);
    }

    if (!targetId) {
      return res.status(404).json({ error: `Chamado #${cleanId} não foi localizado no Movidesk.` });
    }

    const htmlAction = [
      '<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6">',
      '<h3>📋 LAUDO DE ATENDIMENTO TÉCNICO DE CAMPO</h3>',
      tecnico ? `<p><strong>Técnico responsável:</strong> ${escapeHtml(tecnico)}</p>` : '',
      `<p><strong>Cliente:</strong> ${escapeHtml(cliente || 'Não informado')}</p>`,
      `<p><strong>Responsável no cliente:</strong> ${escapeHtml(acompanhado || 'Não informado')}</p>`,
      `<p><strong>Fato constatado:</strong><br>${escapeHtml(fato || 'Não informado').replace(/\n/g, '<br>')}</p>`,
      `<p><strong>Diagnóstico e ações realizadas:</strong><br>${escapeHtml(diagnostico || 'Não informado').replace(/\n/g, '<br>')}</p>`,
      observacoes ? `<p><strong>Observações:</strong><br>${escapeHtml(observacoes).replace(/\n/g, '<br>')}</p>` : '',
      '</div>',
    ].join('');

    const payload: any = {
      actions: [{
        type: 2,
        description: htmlAction,
        origin: 2,
      }],
    };

    const statusMap: Record<string, string> = {
      CONCLUIDO: 'Concluído',
      EM_ANDAMENTO: 'Em atendimento',
      PENDENTE: 'Pendente',
      AGUARDANDO_CLIENTE: 'Aguardando cliente',
      AGUARDANDO_PECA: 'Aguardando peça',
    };
    if (status && statusMap[status]) payload.status = statusMap[status];

    let update = await movideskRequest({ id: targetId }, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });

    let statusUpdated = Boolean(payload.status);
    if (!update.ok && payload.status) {
      const firstError = await update.text().catch(() => '');
      console.warn('PATCH com status falhou; repetindo somente com ação.', update.status, firstError.slice(0, 500));
      delete payload.status;
      statusUpdated = false;
      update = await movideskRequest({ id: targetId }, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
    }

    if (!update.ok) {
      const details = (await update.text().catch(() => '')).slice(0, 1000);
      return res.status(502).json({
        error: `Movidesk recusou a atualização (status ${update.status}).`,
        details,
      });
    }

    return res.status(200).json({
      success: true,
      ticket: cleanId,
      movideskId: targetId,
      statusUpdated,
      message: statusUpdated
        ? `Laudo enviado e status atualizado no chamado #${cleanId}.`
        : `Laudo enviado ao chamado #${cleanId}.`,
    });
  } catch (error: any) {
    console.error('Erro ao exportar para o Movidesk:', error);
    if (error?.name === 'AbortError') {
      return res.status(504).json({ error: 'A API do Movidesk demorou demais para responder.' });
    }
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Erro ao exportar laudo para o Movidesk.',
      details: error?.details,
    });
  }
}
