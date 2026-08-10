import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import nodemailer from 'nodemailer';

const EMAIL_TRIGGER_TAG = 'ACS_ENVIAR_LAUDO_EMAIL';

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
  return match ? `${match[3]}/${match[2]}/${match[1]}` : raw;
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
    cliente, acompanhado, descricaoChamado, fato, diagnostico, observacoes,
    tecnico, data, tipoAtendimento, fotos, assinaturaCliente, incluirAssinatura,
    empresaAssinatura, emailCliente,
  } = body;
  const fotoList = Array.isArray(fotos) ? fotos.filter((f: unknown) => typeof f === 'string' && f) : [];
  const tipoMap: Record<string, string> = {
    PRESENCIAL: 'Presencial', REMOTO: 'Remoto', TELEFONICO: 'Telefônico', LABORATORIO: 'Laboratório',
  };
  const tipo = tipoMap[String(tipoAtendimento || '')] || String(tipoAtendimento || 'Não informado');
  const empresa = empresaAssinatura || 'ACS INFORMÁTICA - SUPORTE TÉCNICO';
  const section = (title: string, value: unknown) => `
    <div style="margin:0 0 18px 0;">
      <div style="font-size:17px;font-weight:700;color:#111827;margin:0 0 8px 0;">${title}</div>
      <div style="background:#fff;border:1px solid #cbd5e1;border-radius:14px;padding:16px;color:#172033;font-size:15px;line-height:1.55;">${nl2br(value || 'Não informado')}</div>
    </div>`;
  const photosHtml = fotoList.map((foto: string, idx: number) => `
    <div style="margin:0 0 14px 0;"><div style="font-size:13px;color:#475569;margin-bottom:6px;">Evidência #${idx + 1}</div>
    <div style="background:#0f172a;border-radius:14px;overflow:hidden;text-align:center;"><img src="${foto}" style="display:block;max-width:100%;height:auto;margin:0 auto;" /></div></div>`).join('');
  return `<div style="background:#f2f6fa;border:1px solid #cbd5e1;border-radius:18px;padding:22px;max-width:820px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <div style="background:#0c182b;color:#fff;border-radius:16px;padding:20px 22px;margin-bottom:24px;">
      <div style="font-size:22px;font-weight:800;color:#38bdf8;border-bottom:1px solid #1e293b;padding-bottom:14px;margin-bottom:14px;">LAUDO DE ATENDIMENTO TÉCNICO DE CAMPO</div>
      <div style="margin-bottom:12px;"><strong>#${escapeHtml(cleanId)}</strong></div>
      <div>Técnico: <strong>${escapeHtml(tecnico || 'Não informado')}</strong> &nbsp; Cliente: <strong>${escapeHtml(cliente || 'Não informado')}</strong></div>
      <div>Data: <strong>${escapeHtml(formatDateBr(data))}</strong> &nbsp; Tipo: <strong>${escapeHtml(tipo)}</strong></div>
      ${emailCliente ? `<div>E-mail: <strong>${escapeHtml(emailCliente)}</strong></div>` : ''}
    </div>
    <div style="margin-bottom:20px;"><strong>Responsável no cliente:</strong> ${escapeHtml(acompanhado || 'Não informado')}</div>
    ${section('Descrição do Chamado / Atendimento', descricaoChamado)}
    ${section('Fato Constatado', fato)}
    ${section('Diagnóstico e Ações Realizadas', diagnostico)}
    ${section('Observações e Recomendações', observacoes)}
    ${fotoList.length ? `<div style="font-size:17px;font-weight:700;margin-bottom:10px;">Fotos e Evidências (${fotoList.length})</div>${photosHtml}` : ''}
    <div style="border-top:1px dashed #cbd5e1;padding-top:18px;margin-top:8px;"><strong>Assinatura Digital do Cliente</strong><br>${assinaturaCliente ? `<img src="${assinaturaCliente}" style="max-width:260px;max-height:120px;margin-top:10px;" />` : 'Assinatura não coletada'}</div>
    ${(incluirAssinatura !== false) ? `<div style="border-top:1px solid #cbd5e1;margin-top:24px;padding-top:16px;text-align:center;font-weight:800;">${escapeHtml(empresa)}</div>` : ''}
  </div>`;
}

function cleanPdfText(value: unknown): string {
  return String(value ?? '').replace(/[\u{1F300}-\u{1FAFF}]/gu, '').replace(/\r/g, '').trim();
}

function dataUrlToBytes(dataUrl: string): { bytes: Uint8Array; mime: string } | null {
  const m = dataUrl.match(/^data:(image\/(?:png|jpeg|jpg));base64,(.+)$/i);
  if (!m) return null;
  return { bytes: Uint8Array.from(Buffer.from(m[2], 'base64')), mime: m[1].toLowerCase() };
}

async function generatePdf(body: any, protocol: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pageSize: [number, number] = [595.28, 841.89];
  const margin = 42;
  const width = pageSize[0] - margin * 2;
  let page = pdf.addPage(pageSize);
  let y = pageSize[1] - margin;

  const newPage = () => { page = pdf.addPage(pageSize); y = pageSize[1] - margin; };
  const ensure = (needed: number) => { if (y - needed < margin) newPage(); };
  const drawWrapped = (text: string, size = 11, isBold = false, gap = 5) => {
    const font = isBold ? bold : regular;
    const words = cleanPdfText(text).split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let line = '';
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= width) line = candidate;
      else { if (line) lines.push(line); line = word; }
    }
    if (line) lines.push(line);
    ensure(lines.length * (size + gap) + 8);
    for (const l of lines) { page.drawText(l, { x: margin, y, size, font, color: rgb(0.08, 0.12, 0.2) }); y -= size + gap; }
    y -= 4;
  };
  const section = (title: string, text: unknown) => {
    drawWrapped(title, 12, true, 5);
    drawWrapped(cleanPdfText(text) || 'Não informado', 10.5, false, 4);
    y -= 6;
  };

  page.drawRectangle({ x: margin, y: y - 88, width, height: 88, color: rgb(0.047, 0.094, 0.169) });
  page.drawText('LAUDO DE ATENDIMENTO TECNICO DE CAMPO', { x: margin + 16, y: y - 27, size: 16, font: bold, color: rgb(0.22, 0.74, 0.97) });
  page.drawText(`#${cleanPdfText(protocol)}`, { x: margin + 16, y: y - 49, size: 11, font: bold, color: rgb(1, 1, 1) });
  page.drawText(`Tecnico: ${cleanPdfText(body.tecnico || 'Nao informado')}`, { x: margin + 16, y: y - 67, size: 9.5, font: regular, color: rgb(0.85, 0.88, 0.92) });
  page.drawText(`Cliente: ${cleanPdfText(body.cliente || 'Nao informado')}`, { x: margin + 280, y: y - 67, size: 9.5, font: regular, color: rgb(0.85, 0.88, 0.92) });
  y -= 110;

  drawWrapped(`Data: ${formatDateBr(body.data)}   Tipo: ${body.tipoAtendimento || 'Nao informado'}`, 10, true);
  if (body.emailCliente) drawWrapped(`E-mail do cliente: ${body.emailCliente}`, 10);
  section('Responsavel no Cliente (Acompanhante)', body.acompanhado);
  section('Descricao do Chamado / Atendimento', body.descricaoChamado);
  section('Fato Constatado', body.fato);
  section('Diagnostico e Acoes Realizadas', body.diagnostico);
  section('Observacoes e Recomendacoes', body.observacoes);

  const fotos = Array.isArray(body.fotos) ? body.fotos : [];
  for (let i = 0; i < fotos.length; i++) {
    const parsed = typeof fotos[i] === 'string' ? dataUrlToBytes(fotos[i]) : null;
    if (!parsed) continue;
    try {
      const img = parsed.mime.includes('png') ? await pdf.embedPng(parsed.bytes) : await pdf.embedJpg(parsed.bytes);
      const maxW = width;
      const maxH = 360;
      const scale = Math.min(maxW / img.width, maxH / img.height, 1);
      const iw = img.width * scale, ih = img.height * scale;
      ensure(ih + 40);
      drawWrapped(`Evidencia #${i + 1}`, 11, true);
      page.drawImage(img, { x: margin + (width - iw) / 2, y: y - ih, width: iw, height: ih });
      y -= ih + 18;
    } catch (e) { console.warn('Falha ao incluir foto no PDF', e); }
  }

  if (body.assinaturaCliente && typeof body.assinaturaCliente === 'string') {
    const parsed = dataUrlToBytes(body.assinaturaCliente);
    if (parsed) {
      try {
        const img = parsed.mime.includes('png') ? await pdf.embedPng(parsed.bytes) : await pdf.embedJpg(parsed.bytes);
        const scale = Math.min(220 / img.width, 100 / img.height, 1);
        const iw = img.width * scale, ih = img.height * scale;
        ensure(ih + 45);
        drawWrapped('Assinatura Digital do Cliente', 11, true);
        page.drawImage(img, { x: margin, y: y - ih, width: iw, height: ih });
        y -= ih + 18;
      } catch (e) { console.warn('Falha ao incluir assinatura no PDF', e); }
    }
  }

  ensure(35);
  page.drawText(cleanPdfText(body.empresaAssinatura || 'ACS INFORMATICA - SUPORTE TECNICO'), { x: margin, y: margin - 2, size: 9.5, font: bold, color: rgb(0.2, 0.25, 0.35) });
  return pdf.save();
}

async function uploadPdfToMovidesk(ticketId: number, actionId: number, pdfBytes: Uint8Array, fileName: string) {
  const url = new URL('https://api.movidesk.com/public/v1/ticketFileUpload');
  url.searchParams.set('token', getToken());
  url.searchParams.set('id', String(ticketId));
  url.searchParams.set('actionId', String(actionId));
  const form = new FormData();
  form.append('attachments', new Blob([pdfBytes], { type: 'application/pdf' }), fileName);
  const response = await fetch(url, { method: 'POST', body: form });
  const text = await response.text();
  if (!response.ok) throw new Error(`Falha ao anexar PDF no Movidesk (status ${response.status}): ${text.slice(0, 500)}`);
  return text;
}

function smtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.SMTP_FROM);
}

async function sendPdfEmail(email: string, protocol: string, cliente: string, pdfBytes: Uint8Array, fileName: string) {
  const port = Number(process.env.SMTP_PORT || 587);
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true' || port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: `Laudo de Atendimento Tecnico - Chamado ${protocol}`,
    html: `<p>Olá${cliente ? `, ${escapeHtml(cliente)}` : ''}.</p><p>Segue em anexo o laudo referente ao atendimento técnico do chamado <strong>${escapeHtml(protocol)}</strong>.</p><p>Atenciosamente,<br><strong>ACS Informática - Suporte Técnico</strong></p>`,
    attachments: [{ filename: fileName, content: Buffer.from(pdfBytes), contentType: 'application/pdf' }],
  });
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido. Use POST.' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { ticket, status, emailCliente, enviarEmailCliente } = body;
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
      } catch {}
    }
    if (!targetId) {
      const escaped = cleanId.replace(/'/g, "''");
      const found = await readJson(await movideskRequest({ '$filter': `protocol eq '${escaped}'`, '$select': 'id,protocol', '$top': 1 }));
      if (Array.isArray(found) && found[0]?.id) targetId = Number(found[0].id);
    }
    if (!targetId) return res.status(404).json({ error: `Chamado #${cleanId} não foi localizado no Movidesk.` });

    const before = await readJson(await movideskRequest({ id: targetId, '$expand': 'actions' }));
    const beforeTicket = Array.isArray(before) ? before[0] : before;
    const beforeActionIds = new Set((Array.isArray(beforeTicket?.actions) ? beforeTicket.actions : []).map((a: any) => Number(a?.id)).filter(Boolean));
    const currentTags = Array.isArray(beforeTicket?.tags) ? beforeTicket.tags.map((t: unknown) => String(t)).filter(Boolean) : [];

    const visualReport = buildVisualReport(body, cleanId);
    const payload: any = { actions: [{ type: 2, description: visualReport, origin: 2 }] };
    const statusMap: Record<string, string> = {
      CONCLUIDO: 'Concluído', EM_ANDAMENTO: 'Em atendimento', PENDENTE: 'Pendente',
      AGUARDANDO_CLIENTE: 'Aguardando cliente', AGUARDANDO_PECA: 'Aguardando peça',
    };
    if (status && statusMap[status]) payload.status = statusMap[status];

    const wantsEmail = Boolean(enviarEmailCliente && String(emailCliente || '').trim());
    const useDirectEmail = wantsEmail && smtpConfigured();
    if (wantsEmail && !useDirectEmail) payload.tags = Array.from(new Set([...currentTags, EMAIL_TRIGGER_TAG]));

    let update = await movideskRequest({ id: targetId }, { method: 'PATCH', body: JSON.stringify(payload) });
    let statusUpdated = Boolean(payload.status);
    if (!update.ok && payload.status) {
      delete payload.status;
      statusUpdated = false;
      update = await movideskRequest({ id: targetId }, { method: 'PATCH', body: JSON.stringify(payload) });
    }
    if (!update.ok) {
      const details = (await update.text().catch(() => '')).slice(0, 1000);
      return res.status(502).json({ error: `Movidesk recusou a atualização (status ${update.status}).`, details });
    }

    const pdfBytes = await generatePdf(body, cleanId);
    const fileName = `Laudo_${cleanId.replace(/[^0-9A-Za-z_-]/g, '_')}.pdf`;
    const after = await readJson(await movideskRequest({ id: targetId, '$expand': 'actions' }));
    const afterTicket = Array.isArray(after) ? after[0] : after;
    const actions = Array.isArray(afterTicket?.actions) ? afterTicket.actions : [];
    const createdAction = actions
      .filter((a: any) => Number(a?.id) && !beforeActionIds.has(Number(a.id)))
      .sort((a: any, b: any) => Number(b.id) - Number(a.id))[0]
      || actions.sort((a: any, b: any) => Number(b.id) - Number(a.id))[0];
    const actionId = Number(createdAction?.id);
    let pdfAttached = false;
    if (actionId) {
      await uploadPdfToMovidesk(targetId, actionId, pdfBytes, fileName);
      pdfAttached = true;
    }

    let emailSent = false;
    let emailQueued = false;
    if (wantsEmail) {
      if (useDirectEmail) {
        await sendPdfEmail(String(emailCliente).trim(), cleanId, String(body.cliente || ''), pdfBytes, fileName);
        emailSent = true;
      } else {
        emailQueued = true;
      }
    }

    return res.status(200).json({
      success: true,
      ticket: cleanId,
      movideskId: targetId,
      actionId: actionId || null,
      statusUpdated,
      pdfAttached,
      pdfFileName: fileName,
      emailSent,
      emailQueued,
      smtpConfigured: smtpConfigured(),
      message: emailSent
        ? `Laudo enviado ao Movidesk e PDF enviado por e-mail para ${String(emailCliente).trim()}.`
        : emailQueued
          ? `Laudo e PDF anexados ao Movidesk. O e-mail foi solicitado pelo gatilho, mas o envio com PDF exige SMTP configurado na Vercel.`
          : `Laudo e PDF anexados ao chamado #${cleanId}.`,
    });
  } catch (error: any) {
    console.error('Erro ao exportar para o Movidesk:', error);
    if (error?.name === 'AbortError') return res.status(504).json({ error: 'A API do Movidesk demorou demais para responder.' });
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Erro ao exportar laudo para o Movidesk.', details: error?.details });
  }
}
