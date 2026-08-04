import { ReportData } from '../types';

export const decodeHtmlEntities = (str: string): string => {
  if (!str) return "";
  return str
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&aacute;/gi, "á")
    .replace(/&Aacute;/gi, "Á")
    .replace(/&agrave;/gi, "à")
    .replace(/&Agrave;/gi, "À")
    .replace(/&acirc;/gi, "â")
    .replace(/&Acirc;/gi, "Â")
    .replace(/&atilde;/gi, "ã")
    .replace(/&Atilde;/gi, "Ã")
    .replace(/&auml;/gi, "ä")
    .replace(/&Auml;/gi, "Ä")
    .replace(/&eacute;/gi, "é")
    .replace(/&Eacute;/gi, "É")
    .replace(/&egrave;/gi, "è")
    .replace(/&Egrave;/gi, "È")
    .replace(/&ecirc;/gi, "ê")
    .replace(/&Ecirc;/gi, "Ê")
    .replace(/&iacute;/gi, "í")
    .replace(/&Iacute;/gi, "Í")
    .replace(/&oacute;/gi, "ó")
    .replace(/&Oacute;/gi, "Ó")
    .replace(/&otilde;/gi, "õ")
    .replace(/&Otilde;/gi, "Õ")
    .replace(/&ocirc;/gi, "ô")
    .replace(/&Ocirc;/gi, "Ô")
    .replace(/&uacute;/gi, "ú")
    .replace(/&Uacute;/gi, "Ú")
    .replace(/&ccedil;/gi, "ç")
    .replace(/&Ccedil;/gi, "Ç")
    .replace(/&ndash;/gi, "–")
    .replace(/&mdash;/gi, "—")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;|&#39;/gi, "'");
};

export const stripHtml = (html: string): string => {
  if (!html) return "";
  const clean = html
    .replace(/<br\s*[\/]?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<[^>]+>/g, "");

  return decodeHtmlEntities(clean)
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

export const extractOnlyDescription = (text: string): string => {
  if (!text) return "";
  let clean = text.trim();

  const descPattern = /(?:[*_#\s\w\d\p{Extended_Pictographic}]*?)(?:Descri[çc][ãa]o\s+(?:do\s+Atendimento|do\s+Chamado|de\s+Atendimento|do\s+Servi[çc]o|do\s+Problema)|Descri[çc][ãa]o)\s*:\s*[*_]*\s*([\s\S]+)/iu;

  const matchDesc = clean.match(descPattern);

  if (matchDesc && matchDesc[1].trim()) {
    clean = matchDesc[1].trim();
  } else {
    const lines = clean.split("\n");
    const filteredLines: string[] = [];
    let pastHeaders = false;

    for (const line of lines) {
      const trimmed = line.trim();
      const isHeaderLine =
        /^(?:[*_#\s\w\d\p{Extended_Pictographic}]*?)(?:Agendamento\s+T[eé]cnico|T[eé]cnico\s+Respons[aá]vel|Raz[aã]o\s+Social|Nome\s+Fantasia|CNPJ|Endere[cç]o|Contato|Ticket)\s*:\s*/iu.test(trimmed) ||
        /^[*_]*\s*Agendamento\s+T[eé]cnico\s*[–\-]/i.test(trimmed);

      if (!pastHeaders && isHeaderLine) {
        continue;
      }
      if (trimmed === "" && !pastHeaders) {
        continue;
      }
      pastHeaders = true;
      filteredLines.push(line);
    }
    clean = filteredLines.join("\n").trim();
  }

  clean = clean.replace(/^[*_#\s]+/, "").trim();
  clean = clean.replace(/(?:\r?\n|\s)+(?:\d{1,2}:\d{2}(?::\d{2})?|Editad[ao].*)$/i, "").trim();

  return clean;
};

export const parseStructuredAppointmentText = (text: string) => {
  if (!text) return {};

  const res: {
    nomeFantasia?: string;
    razaoSocial?: string;
    cnpj?: string;
    tecnicoResponsavel?: string;
    ticketNum?: string;
    descricaoAtendimento?: string;
  } = {};

  const cleanVal = (v: string) => (v ? v.replace(/^[*_#\s]+|[*_#\s]+$/g, "").trim() : "");

  const matchFantasia = text.match(/(?:[^\w\s]*\s*)?Nome\s+Fantasia\s*:\s*([^\r\n]+)/i);
  if (matchFantasia && matchFantasia[1].trim()) {
    res.nomeFantasia = cleanVal(matchFantasia[1]);
  }

  const matchRazao = text.match(/(?:[^\w\s]*\s*)?Raz[aã]o\s+Social\s*:\s*([^\r\n]+)/i);
  if (matchRazao && matchRazao[1].trim()) {
    res.razaoSocial = cleanVal(matchRazao[1]);
  }

  const matchTecnico = text.match(/(?:[^\w\s]*\s*)?T[eé]cnico\s+Respons[aá]vel\s*:\s*@?([^\r\n]+)/i);
  if (matchTecnico && matchTecnico[1].trim()) {
    res.tecnicoResponsavel = cleanVal(matchTecnico[1]).replace(/^@/, "").trim();
  }

  const matchCnpj = text.match(/(?:[^\w\s]*\s*)?CNPJ\s*:\s*([\d\.\/\-]+)/i);
  if (matchCnpj && matchCnpj[1].trim()) {
    res.cnpj = cleanVal(matchCnpj[1]);
  }

  const matchTicket = text.match(/(?:[^\w\s]*\s*)?Ticket\s*:\s*(\d+)/i);
  if (matchTicket && matchTicket[1].trim()) {
    res.ticketNum = cleanVal(matchTicket[1]);
  }

  const extractedOnly = extractOnlyDescription(text);
  if (extractedOnly && extractedOnly !== text.trim()) {
    res.descricaoAtendimento = extractedOnly;
  }

  return res;
};

export const parseTicketFields = (t: any) => {
  if (!t || typeof t !== "object") {
    return {
      id: "",
      protocol: "",
      subject: "",
      descricaoChamado: "",
      fato: "",
      createdDate: "",
      dateFormatted: "",
      cliente: "Cliente não informado",
      cnpj: "",
      tecnico: "",
      acompanhado: "",
      status: "EM_ANDAMENTO",
      statusOriginal: "Aberto",
    };
  }

  const rawTexts: string[] = [];
  if (t.subject) rawTexts.push(stripHtml(t.subject));
  if (t.actions && Array.isArray(t.actions)) {
    t.actions.forEach((act: any) => {
      if (act.description) {
        rawTexts.push(stripHtml(act.description));
      }
    });
  }
  if (t.customFieldValues && Array.isArray(t.customFieldValues)) {
    t.customFieldValues.forEach((cf: any) => {
      const val = cf.value || (cf.items && cf.items[0]?.customFieldItem);
      if (typeof val === "string" && val.trim()) {
        rawTexts.push(stripHtml(val));
      }
    });
  }

  let extractedFantasia = "";
  let extractedRazao = "";
  let extractedCnpj = "";
  let extractedTecnico = "";
  let extractedTicketNum = "";
  let extractedDescricao = "";

  for (const txt of rawTexts) {
    const parsed = parseStructuredAppointmentText(txt);
    if (!extractedFantasia && parsed.nomeFantasia) extractedFantasia = parsed.nomeFantasia;
    if (!extractedRazao && parsed.razaoSocial) extractedRazao = parsed.razaoSocial;
    if (!extractedCnpj && parsed.cnpj) extractedCnpj = parsed.cnpj;
    if (!extractedTecnico && parsed.tecnicoResponsavel) extractedTecnico = parsed.tecnicoResponsavel;
    if (!extractedTicketNum && parsed.ticketNum) extractedTicketNum = parsed.ticketNum;
    if (!extractedDescricao && parsed.descricaoAtendimento) extractedDescricao = parsed.descricaoAtendimento;
  }

  const mainClient = t.clients && t.clients.length > 0 ? t.clients[0] : null;
  const createdBy = t.createdBy;

  const clienteName =
    extractedFantasia ||
    extractedRazao ||
    mainClient?.businessName ||
    mainClient?.name ||
    createdBy?.businessName ||
    createdBy?.name ||
    "Cliente não informado";

  let cnpj = extractedCnpj || mainClient?.cpfCnpj || createdBy?.cpfCnpj || "";
  if (!cnpj && t.clients && Array.isArray(t.clients)) {
    for (const c of t.clients) {
      if (c.cpfCnpj) {
        cnpj = c.cpfCnpj;
        break;
      }
      if (c.organization?.cpfCnpj) {
        cnpj = c.organization.cpfCnpj;
        break;
      }
    }
  }
  if (!cnpj && createdBy?.organization?.cpfCnpj) {
    cnpj = createdBy.organization.cpfCnpj;
  }

  const cnpjRegex = /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}\-?\d{2}\b/;
  const raw14Regex = /\b\d{14}\b/;

  if (!cnpj) {
    for (const txt of rawTexts) {
      const match = txt.match(cnpjRegex) || txt.match(raw14Regex);
      if (match) {
        cnpj = match[0];
        break;
      }
    }
  }

  if (cnpj) {
    const digits = cnpj.replace(/\D/g, "");
    if (digits.length === 14) {
      cnpj = `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
    }
  }

  let tecnico = extractedTecnico || "";

  if (!tecnico && t.customFieldValues && Array.isArray(t.customFieldValues)) {
    const techCf = t.customFieldValues.find((cf: any) => cf.customFieldId === 221237);
    if (techCf) {
      const val = techCf.value || (techCf.items && techCf.items[0]?.customFieldItem);
      if (typeof val === "string" && val.trim()) {
        tecnico = val.trim().replace(/^@/, "");
      }
    }
  }

  if (!tecnico && t.category && typeof t.category === "string" && !/problema|dúvida|solicitação|automação|suporte|atendimento/i.test(t.category)) {
    tecnico = t.category.trim();
  }

  if (!tecnico) {
    tecnico = t.owner?.name || t.owner?.businessName || "";
  }

  if (!tecnico) {
    tecnico = t.createdBy?.name || t.createdBy?.businessName || "";
  }

  if (!tecnico && t.actions && t.actions.length > 0) {
    for (const act of t.actions) {
      const actAuthor = act.createdBy?.name || act.createdBy?.businessName || act.createdByName;
      if (actAuthor) {
        tecnico = actAuthor;
        break;
      }
    }
  }

  if (tecnico) {
    tecnico = tecnico.replace(/^@/, "").trim();
  }

  const acompanhado = mainClient?.name !== clienteName ? mainClient?.name || "" : "";

  let rawDesc = extractedDescricao;

  if (!rawDesc) {
    if (t.actions && Array.isArray(t.actions) && t.actions.length > 0) {
      for (const act of t.actions) {
        const actDesc = stripHtml(act.description || "");
        const extractedFromAct = extractOnlyDescription(actDesc);
        if (extractedFromAct && extractedFromAct !== actDesc) {
          rawDesc = extractedFromAct;
          break;
        }
      }
    }
  }

  if (!rawDesc) {
    const subjectDesc = extractOnlyDescription(stripHtml(t.subject || ""));
    rawDesc = subjectDesc || stripHtml(t.subject || "");
  }

  const finalDescricaoChamado = extractOnlyDescription(rawDesc) || rawDesc;
  let fato = "";
  const subject = t.subject || "";

  let mappedStatus = "EM_ANDAMENTO";
  const statusLower = String(t.status || "").toLowerCase();
  if (statusLower.includes("resolv") || statusLower.includes("fechad") || statusLower.includes("conclu")) {
    mappedStatus = "CONCLUIDO";
  } else if (statusLower.includes("pendent")) {
    mappedStatus = "PENDENTE";
  } else if (statusLower.includes("aguar")) {
    mappedStatus = "AGUARDANDO_CLIENTE";
  }

  let formattedDate = "";
  if (t.createdDate) {
    formattedDate = String(t.createdDate).split("T")[0];
  }

  const ticketId = extractedTicketNum || String(t.protocol || t.id || "");

  return {
    id: ticketId,
    protocol: String(t.protocol || ticketId),
    subject: subject,
    descricaoChamado: finalDescricaoChamado,
    fato: fato,
    createdDate: t.createdDate || "",
    dateFormatted: formattedDate,
    cliente: clienteName,
    cnpj: cnpj,
    tecnico: tecnico,
    acompanhado: acompanhado,
    status: mappedStatus,
    statusOriginal: t.status || "Aberto",
  };
};

export async function fetchDirectMovideskTicket(ticketId: string, token: string) {
  const cleanId = String(ticketId).trim();
  let ticket: any = null;

  // 1. Direct ID query first
  try {
    const movideskUrl = `https://api.movidesk.com/public/v1/tickets?token=${encodeURIComponent(
      token
    )}&id=${encodeURIComponent(cleanId)}&$expand=clients,owner,createdBy,actions,customFieldValues`;

    const response = await fetch(movideskUrl);
    if (response.ok) {
      const data = await response.json();
      const candidate = Array.isArray(data) ? data[0] : data;
      if (candidate && (candidate.id || candidate.protocol)) {
        ticket = candidate;
      }
    }
  } catch {
    // ignore
  }

  // 2. Filter fallback
  if (!ticket || (!ticket.id && !ticket.protocol)) {
    const isNum = !isNaN(Number(cleanId));
    const filterExpr = isNum
      ? `protocol eq '${cleanId}' or id eq ${cleanId}`
      : `protocol eq '${cleanId}'`;

    const filterUrl = `https://api.movidesk.com/public/v1/tickets?token=${encodeURIComponent(
      token
    )}&$filter=${encodeURIComponent(filterExpr)}&$expand=clients,owner,createdBy,actions,customFieldValues`;

    const filterRes = await fetch(filterUrl);
    if (filterRes.ok) {
      const filterData = await filterRes.json();
      if (Array.isArray(filterData) && filterData.length > 0) {
        ticket = filterData[0];
      }
    }
  }

  if (!ticket || (!ticket.id && !ticket.protocol)) {
    throw new Error(`Chamado #${cleanId} não encontrado no Movidesk.`);
  }

  const parsed = parseTicketFields(ticket);
  return {
    ticket: String(cleanId || ticket.protocol || ticket.id),
    cliente: parsed.cliente,
    cnpj: parsed.cnpj,
    tecnico: parsed.tecnico,
    acompanhado: parsed.acompanhado,
    descricaoChamado: parsed.descricaoChamado,
    fato: parsed.fato,
    status: parsed.status,
    data: parsed.dateFormatted,
  };
}

export async function fetchDirectMovideskAgents(token: string) {
  const movideskUrl = `https://api.movidesk.com/public/v1/persons?token=${encodeURIComponent(
    token
  )}&$filter=personType eq 1&$select=id,name,businessName,email`;

  const response = await fetch(movideskUrl);
  let agents: Array<{ id: string; name: string }> = [];

  if (response.ok) {
    const data = await response.json();
    if (Array.isArray(data)) {
      agents = data.map((p: any) => ({
        id: String(p.id),
        name: p.name || p.businessName || "Atendente Sem Nome",
      }));
    }
  }

  if (agents.length === 0) {
    const recentTicketsUrl = `https://api.movidesk.com/public/v1/tickets?token=${encodeURIComponent(
      token
    )}&$select=id,owner&$expand=owner&$top=50`;

    const ticketRes = await fetch(recentTicketsUrl);
    if (ticketRes.ok) {
      const ticketsData = await ticketRes.json();
      if (Array.isArray(ticketsData)) {
        const agentMap = new Map<string, string>();
        ticketsData.forEach((t: any) => {
          if (t.owner?.id && t.owner?.name) {
            agentMap.set(String(t.owner.id), t.owner.name);
          }
        });
        agentMap.forEach((name, id) => {
          agents.push({ id, name });
        });
      }
    }
  }

  agents.sort((a, b) => a.name.localeCompare(b.name));
  return agents;
}

export async function fetchDirectMovideskTickets(token: string, agentId?: string, agentName?: string) {
  const movideskUrl = `https://api.movidesk.com/public/v1/tickets?token=${encodeURIComponent(
    token
  )}&$select=id,protocol,subject,createdDate,status,owner,createdBy&$expand=clients,owner,createdBy,actions,customFieldValues&$orderby=createdDate desc&$top=200`;

  const response = await fetch(movideskUrl);
  if (!response.ok) {
    throw new Error(`Erro ao consultar Movidesk (Status ${response.status}).`);
  }

  const rawData = await response.json();
  const ticketList: any[] = Array.isArray(rawData) ? rawData : [];

  const filtered = ticketList.filter((t: any) => {
    if (agentId && agentId !== "all") {
      const isOwner = t.owner?.id && String(t.owner.id) === agentId;
      const isCreatedBy = t.createdBy?.id && String(t.createdBy.id) === agentId;
      if (!isOwner && !isCreatedBy) return false;
    } else if (agentName) {
      const nameLower = agentName.toLowerCase();
      const isOwnerName = t.owner?.name && t.owner.name.toLowerCase().includes(nameLower);
      const isCreatedByName = t.createdBy?.name && t.createdBy.name.toLowerCase().includes(nameLower);
      if (!isOwnerName && !isCreatedByName) return false;
    }
    return true;
  });

  return filtered.map((t: any) => parseTicketFields(t));
}

export async function exportReportToMovidesk(formData: ReportData, token: string) {
  if (!formData.ticket) {
    throw new Error('Informe o número do chamado antes de exportar.');
  }

  // 1. Try server backend route first (/api/movidesk/export)
  try {
    const response = await fetch('/api/movidesk/export', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...formData,
        token,
      }),
    });

    const json = await response.json().catch(() => null);

    if (response.ok && json && json.success) {
      return json.message || `Laudo enviado com sucesso para o chamado #${formData.ticket}!`;
    }

    if (json && json.error && !json.error.includes('Failed to fetch')) {
      throw new Error(json.error);
    }
  } catch (err: any) {
    if (err?.message && !err.message.includes('Failed to fetch') && !err.message.includes('404')) {
      throw err;
    }
  }

  // 2. Client-side Direct Fallback
  const cleanId = String(formData.ticket).trim();
  let targetNumericId: number | null = null;

  // Try direct ID lookup first
  try {
    const directUrl = `https://api.movidesk.com/public/v1/tickets?token=${encodeURIComponent(
      token
    )}&id=${encodeURIComponent(cleanId)}`;

    const directRes = await fetch(directUrl);
    if (directRes.ok) {
      const directData = await directRes.json();
      const candidate = Array.isArray(directData) ? directData[0] : directData;
      if (candidate && candidate.id) {
        targetNumericId = candidate.id;
      }
    }
  } catch {
    // ignore
  }

  if (!targetNumericId) {
    const isNum = !isNaN(Number(cleanId));
    const filterExpr = isNum ? `protocol eq '${cleanId}' or id eq ${cleanId}` : `protocol eq '${cleanId}'`;
    const filterUrl = `https://api.movidesk.com/public/v1/tickets?token=${encodeURIComponent(
      token
    )}&$filter=${encodeURIComponent(filterExpr)}`;

    const filterRes = await fetch(filterUrl);
    if (filterRes.ok) {
      const filterData = await filterRes.json();
      if (Array.isArray(filterData) && filterData.length > 0 && filterData[0].id) {
        targetNumericId = filterData[0].id;
      }
    }
  }

  if (!targetNumericId) {
    throw new Error(`Chamado #${cleanId} não foi encontrado no Movidesk.`);
  }

  const photosList = Array.isArray(formData.fotos) ? formData.fotos : [];
  const htmlAction = `
    <div style="font-family: Arial, sans-serif; font-size: 14px; color: #1e293b; line-height: 1.6; border: 1px solid #cbd5e0; border-radius: 8px; padding: 16px; background-color: #f8fafc; max-width: 700px;">
      <div style="background-color: #0f172a; color: #ffffff; padding: 10px 14px; border-radius: 6px; margin-bottom: 14px;">
        <h3 style="margin: 0; font-size: 15px; font-weight: bold; color: #38bdf8;">
          📋 LAUDO DE ATENDIMENTO TÉCNICO DE CAMPO
        </h3>
        ${formData.tecnico ? `<span style="font-size: 12px; color: #94a3b8;">Técnico Responsável: ${formData.tecnico}</span>` : ''}
      </div>

      <p style="margin-bottom: 12px;">
        <strong>👤 Responsável no Cliente (Acompanhante):</strong><br/>
        <span style="color: #0f172a; font-size: 14px; font-weight: 600;">${formData.acompanhado || 'Não informado'}</span>
      </p>

      <div style="margin-bottom: 14px;">
        <strong>🛠️ Diagnóstico e Ações Realizadas:</strong>
        <div style="background-color: #ffffff; padding: 12px; border-radius: 6px; border: 1px solid #cbd5e0; margin-top: 4px; white-space: pre-wrap; font-size: 13px;">${formData.diagnostico || 'Nenhuma ação registrada'}</div>
      </div>

      ${formData.observacoes ? `
      <div style="margin-bottom: 14px;">
        <strong>📝 Observações e Recomendações:</strong>
        <div style="background-color: #ffffff; padding: 12px; border-radius: 6px; border: 1px solid #cbd5e0; margin-top: 4px; white-space: pre-wrap; font-size: 13px;">${formData.observacoes}</div>
      </div>
      ` : ''}

      ${photosList.length > 0 ? `
      <div style="margin-bottom: 14px;">
        <strong>📷 Fotos e Evidências (${photosList.length}):</strong>
        <div style="margin-top: 8px;">
          ${photosList.map((foto, idx) => `
            <div style="margin-bottom: 10px;">
              <p style="font-size: 11px; color: #64748b; margin: 0 0 2px 0;">Evidência #${idx + 1}:</p>
              <img src="${foto}" alt="Evidência ${idx + 1}" style="max-width: 100%; max-height: 350px; border-radius: 6px; border: 1px solid #cbd5e0;" />
            </div>
          `).join('')}
        </div>
      </div>
      ` : '<p style="margin-bottom: 14px; font-size: 13px;"><strong>📷 Fotos e Evidências:</strong> Nenhuma foto anexada.</p>'}

      <div style="margin-top: 16px; padding-top: 12px; border-top: 2px dashed #cbd5e0;">
        <strong>✍️ Assinatura Digital do Cliente:</strong>
        ${formData.assinaturaCliente ? `
          <p style="font-size: 12px; color: #475569; margin: 4px 0 8px 0;">Coletada digitalmente no local por <strong>${formData.acompanhado || formData.cliente || 'Cliente'}</strong></p>
          <div style="background: #ffffff; padding: 8px; display: inline-block; border-radius: 6px; border: 1px solid #cbd5e0;">
            <img src="${formData.assinaturaCliente}" alt="Assinatura do Cliente" style="max-width: 320px; max-height: 120px; display: block;" />
          </div>
        ` : '<span style="color: #64748b; font-style: italic;"> (Não coletada)</span>'}
      </div>
    </div>
  `;

  const patchBody: any = {
    id: targetNumericId,
    actions: [
      {
        actionType: 'Public',
        description: htmlAction,
        origin: 2,
      },
    ],
  };

  if (formData.status) {
    const statusMap: Record<string, string> = {
      'CONCLUIDO': 'Concluído',
      'EM_ANDAMENTO': 'Em atendimento',
      'PENDENTE': 'Pendente',
      'AGUARDANDO_CLIENTE': 'Aguardando cliente',
      'AGUARDANDO_PECA': 'Aguardando peça',
    };
    if (statusMap[formData.status]) {
      patchBody.status = statusMap[formData.status];
      patchBody.justification = "Atendimento de campo e laudo técnico registrado";
      patchBody.justificationReason = "Atendimento de campo e laudo técnico registrado";
    }
  }

  const updateUrl = `https://api.movidesk.com/public/v1/tickets?token=${encodeURIComponent(token)}&id=${targetNumericId}`;
  let updateRes = await fetch(updateUrl, {
    method: 'PATCH',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(patchBody),
  });

  if (!updateRes.ok) {
    const errText = await updateRes.text().catch(() => '');

    if (patchBody.status && (errText.includes("Status") || errText.includes("Reason") || errText.includes("justification"))) {
      delete patchBody.status;
      delete patchBody.justification;
      delete patchBody.justificationReason;

      updateRes = await fetch(updateUrl, {
        method: 'PATCH',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(patchBody),
      });
    }

    if (!updateRes.ok) {
      const finalErr = await updateRes.text().catch(() => errText);
      throw new Error(`Falha ao atualizar no Movidesk (Status ${updateRes.status}): ${finalErr}`);
    }
  }

  return `Laudo enviado com sucesso para o Chamado #${cleanId} no Movidesk!`;
}

