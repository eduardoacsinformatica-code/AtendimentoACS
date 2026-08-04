// Shared Movidesk ticket parsing logic for both Express (server.ts) and Vercel Serverless Functions (/api/movidesk/*)

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

  // 1. Check for "Descrição do Atendimento:" or variations, supporting emojis, bullets, markdown (*🛠 Descrição do Atendimento:*)
  const descPattern = /(?:[*_#\s\w\d\p{Extended_Pictographic}]*?)(?:Descri[çc][ãa]o\s+(?:do\s+Atendimento|do\s+Chamado|de\s+Atendimento|do\s+Servi[çc]o|do\s+Problema)|Descri[çc][ãa]o)\s*:\s*[*_]*\s*([\s\S]+)/iu;

  const matchDesc = clean.match(descPattern);

  if (matchDesc && matchDesc[1].trim()) {
    clean = matchDesc[1].trim();
  } else {
    // 2. If no explicit marker, filter out top header lines (Agendamento Técnico, Razão Social, Nome Fantasia, CNPJ, etc.)
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

  // Remove leading markdown symbols if leftover
  clean = clean.replace(/^[*_#\s]+/, "").trim();

  // 3. Remove trailing timestamp/time at the bottom (e.g. "12:42" or "Editado 12:42")
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

  // Nome Fantasia: POSTO COMETA
  const matchFantasia = text.match(/(?:[^\w\s]*\s*)?Nome\s+Fantasia\s*:\s*([^\r\n]+)/i);
  if (matchFantasia && matchFantasia[1].trim()) {
    res.nomeFantasia = cleanVal(matchFantasia[1]);
  }

  // Razão Social: POSTO COMETA COMÉRCIO DE PETRÓLEO LTDA
  const matchRazao = text.match(/(?:[^\w\s]*\s*)?Raz[aã]o\s+Social\s*:\s*([^\r\n]+)/i);
  if (matchRazao && matchRazao[1].trim()) {
    res.razaoSocial = cleanVal(matchRazao[1]);
  }

  // Técnico Responsável: @ACS VISGUEIRA
  const matchTecnico = text.match(/(?:[^\w\s]*\s*)?T[eé]cnico\s+Respons[aá]vel\s*:\s*@?([^\r\n]+)/i);
  if (matchTecnico && matchTecnico[1].trim()) {
    res.tecnicoResponsavel = cleanVal(matchTecnico[1]).replace(/^@/, "").trim();
  }

  // CNPJ: 04.961.676/0001-00 or 14.780.004/0001-44
  const matchCnpj = text.match(/(?:[^\w\s]*\s*)?CNPJ\s*:\s*([\d\.\/\-]+)/i);
  if (matchCnpj && matchCnpj[1].trim()) {
    res.cnpj = cleanVal(matchCnpj[1]);
  }

  // Ticket: 20260731000057
  const matchTicket = text.match(/(?:[^\w\s]*\s*)?Ticket\s*:\s*(\d+)/i);
  if (matchTicket && matchTicket[1].trim()) {
    res.ticketNum = cleanVal(matchTicket[1]);
  }

  // Descrição do Atendimento:
  const extractedOnly = extractOnlyDescription(text);
  if (extractedOnly && extractedOnly !== text.trim()) {
    res.descricaoAtendimento = extractedOnly;
  }

  return res;
};

export const parseTicketFields = (t: any) => {
  // 1. Gather all available plain text blocks from actions, subject, customFieldValues
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

  // 2. Parse structured data from all rawTexts
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

  // Cliente (Prioritize Nome Fantasia or Razão Social from Agendamento Técnico text, then Movidesk client object)
  const clienteName =
    extractedFantasia ||
    extractedRazao ||
    mainClient?.businessName ||
    mainClient?.name ||
    createdBy?.businessName ||
    createdBy?.name ||
    "Cliente não informado";

  // CNPJ
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

  // Técnico Responsável
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

  // Descrição do Chamado: Ensure ONLY the text below "Descrição do Atendimento:" is extracted
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
