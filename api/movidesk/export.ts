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

function nl2br(value: unknown): string {
  return escapeHtml(value).replace(/\r?\n/g, '<br>');
}

function formatDateBr(value: unknown): string {
  const raw = String(value ?? '').trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : escapeHtml(raw);
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

function buildVisualReport(body: any, cleanId: string): string {
  const {
    cliente,
    acompanhado,
    descricaoChamado,
    fato,
    diagnostico,
    observacoes,
    tecnico,
    data,
    tipoAtendimento,
    fotos,
    assinaturaCliente,
    incluirAssinatura,
    empresaAssinatura,
  } = body;

  const fotoList = Array.isArray(fotos) ? fotos.filter((foto: unknown) => typeof foto === 'string' && foto) : [];
  const tipoMap: Record<string, string> = {
    PRESENCIAL: 'Presencial',
    REMOTO: 'Remoto',
    TELEFONICO: 'Telefônico',
    LABORATORIO: 'Laboratório',
  };
  const tipo = tipoMap[String(tipoAtendimento || '')] || String(tipoAtendimento || 'Não informado');
  const responsavel = acompanhado || 'Não informado';
  const empresa = empresaAssinatura || 'ACS INFORMÁTICA - SUPORTE TÉCNICO';

  const section = (icon: string, title: string, value: unknown) => `
    <div style="margin:0 0 18px 0;">
      <div style="font-size:17px;font-weight:700;color:#111827;margin:0 0 8px 0;">${icon}&nbsp; ${title}</div>
      <div style="background:#ffffff;border:1px solid #cbd5e1;border-radius:14px;padding:16px;color:#172033;font-size:15px;line-height:1.55;min-height:30px;box-shadow:0 1px 2px rgba(15,23,42,.08);">${nl2br(value || 'Não informado')}</div>
    </div>`;

  const photosHtml = fotoList.length > 0 ? `
    <div style="margin:0 0 20px 0;">
      <div style="font-size:17px;font-weight:700;color:#111827;margin:0 0 10px 0;">💼&nbsp; Fotos e Evidências (${fotoList.length}):</div>
      ${fotoList.map((foto: string, idx: number) => `
        <div style="margin:0 0 14px 0;">
          <div style="font-size:13px;color:#475569;margin:0 0 6px 0;">Evidência #${idx + 1}:</div>
          <div style="background:#0f172a;border:1px solid #cbd5e1;border-radius:14px;padding:0;overflow:hidden;text-align:center;">
            <img src="${foto}" alt="Evidência ${idx + 1}" style="display:block;max-width:100%;width:auto;height:auto;margin:0 auto;border:0;" />
          </div>
        </div>`).join('')}
    </div>` : '';

  const signatureHtml = `
    <div style="border-top:1px dashed #cbd5e1;padding-top:18px;margin-top:8px;">
      <div style="font-size:17px;font-weight:700;color:#111827;margin:0 0 8px 0;">✍️&nbsp; Assinatura Digital do Cliente:</div>
      <div style="font-size:13px;color:#475569;margin-bottom:10px;">Coletada digitalmente no local por <strong style="color:#1e293b;">${escapeHtml(acompanhado || cliente || 'Cliente')}</strong></div>
      ${assinaturaCliente ? `
        <div style="display:inline-block;background:#ffffff;border:1px solid #cbd5e1;border-radius:14px;padding:10px;min-width:220px;text-align:center;">
          <img src="${assinaturaCliente}" alt="Assinatura Digital do Cliente" style="display:block;max-width:260px;max-height:120px;width:auto;height:auto;margin:0 auto;" />
        </div>` : `
        <div style="display:inline-block;background:#ffffff;border:1px solid #cbd5e1;border-radius:14px;padding:16px 24px;color:#94a3b8;font-style:italic;">Assinatura não coletada</div>`}
    </div>`;

  return `
  <div style="background:#f2f6fa;border:1px solid #cbd5e1;border-radius:18px;padding:22px;max-width:820px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;color:#0f172a;box-sizing:border-box;">
    <div style="background:#0c182b;color:#ffffff;border-radius:16px;padding:20px 22px;margin:0 0 24px 0;box-shadow:0 2px 5px rgba(15,23,42,.18);">
      <div style="font-size:22px;line-height:1.3;font-weight:800;letter-spacing:.5px;color:#38bdf8;border-bottom:1px solid #1e293b;padding-bottom:14px;margin-bottom:14px;">📋&nbsp; LAUDO DE ATENDIMENTO TÉCNICO DE CAMPO</div>
      <div style="margin:0 0 14px 0;"><span style="display:inline-block;background:#082f49;border:1px solid #0369a1;color:#7dd3fc;border-radius:8px;padding:6px 10px;font-family:monospace;font-size:14px;font-weight:700;">#${escapeHtml(cleanId)}</span></div>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;color:#cbd5e1;font-size:14px;line-height:1.7;">
        <tr>
          <td style="width:50%;padding:2px 12px 2px 0;color:#94a3b8;">Técnico Responsável: <strong style="color:#f8fafc;">${escapeHtml(tecnico || 'Não informado')}</strong></td>
          <td style="width:50%;padding:2px 0;color:#94a3b8;">Cliente: <strong style="color:#f8fafc;">${escapeHtml(cliente || 'Não informado')}</strong></td>
        </tr>
        <tr>
          <td style="padding:2px 12px 2px 0;color:#94a3b8;">Data: <strong style="color:#f8fafc;">${formatDateBr(data)}</strong></td>
          <td style="padding:2px 0;color:#94a3b8;">Tipo: <strong style="color:#f8fafc;">${escapeHtml(tipo)}</strong></td>
        </tr>
      </table>
    </div>

    <div style="margin:0 0 22px 0;">
      <div style="font-size:17px;font-weight:700;color:#111827;margin-bottom:7px;">👤&nbsp; Responsável no Cliente (Acompanhante):</div>
      <div style="font-size:16px;font-weight:700;color:#1e293b;padding-left:28px;">${escapeHtml(responsavel)}</div>
    </div>

    ${section('📋', 'Descrição do Chamado / Atendimento:', descricaoChamado)}
    ${section('🔍', 'Fato Constatado:', fato)}
    ${section('🛠️', 'Diagnóstico e Ações Realizadas:', diagnostico)}
    ${section('📝', 'Observações e Recomendações:', observacoes)}
    ${photosHtml}
    ${signatureHtml}

    ${(incluirAssinatura !== false) ? `<div style="border-top:1px solid #cbd5e1;margin-top:24px;padding-top:16px;text-align:center;font-weight:800;font-size:14px;letter-spacing:1px;color:#334155;">${escapeHtml(empresa)}</div>` : ''}
  </div>`;
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Use POST.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { ticket, status } = body;

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

    const visualReport = buildVisualReport(body, cleanId);
    const payload: any = {
      actions: [{
        type: 2,
        description: visualReport,
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
      visualMode: true,
      message: statusUpdated
        ? `Laudo visual enviado e status atualizado no chamado #${cleanId}.`
        : `Laudo visual enviado ao chamado #${cleanId}.`,
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
