import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route: CNPJ Proxy Lookup
  app.get("/api/cnpj/:cnpj", async (req, res) => {
    try {
      const cleanCnpj = req.params.cnpj.replace(/\D/g, "");
      if (cleanCnpj.length !== 14) {
        return res.status(400).json({ error: "CNPJ deve conter 14 dígitos." });
      }

      // Try BrasilAPI first
      try {
        const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
        if (response.ok) {
          const data = await response.json();
          return res.json({
            razao_social: data.razao_social || data.nome_fantasia || "",
            nome_fantasia: data.nome_fantasia || data.razao_social || "",
            cnpj: data.cnpj,
            uf: data.uf,
            municipio: data.municipio,
          });
        }
      } catch (err) {
        console.warn("BrasilAPI failed, trying fallback...", err);
      }

      // Fallback: Minha Receita API
      const fallbackResponse = await fetch(`https://minhareceita.org/${cleanCnpj}`);
      if (fallbackResponse.ok) {
        const data = await fallbackResponse.json();
        return res.json({
          razao_social: data.razao_social || data.nome_fantasia || "",
          nome_fantasia: data.nome_fantasia || data.razao_social || "",
          cnpj: data.cnpj,
          uf: data.uf,
          municipio: data.municipio,
        });
      }

      return res.status(404).json({ error: "CNPJ não encontrado na base de dados pública." });
    } catch (error) {
      console.error("Erro ao consultar CNPJ:", error);
      return res.status(500).json({ error: "Erro ao consultar serviço de CNPJ." });
    }
  });

  // API Route: Movidesk Agents List
  app.get("/api/movidesk/agents", async (req, res) => {
    try {
      const token = (req.query.token as string) || process.env.MOVIDESK_API_TOKEN || "75762c40-5399-4b83-b958-c265fbf5d6fb";

      if (!token) {
        return res.status(400).json({ error: "Chave de API do Movidesk não informada." });
      }

      // Query Movidesk Persons endpoint filtered for personType = 1 (Agents)
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

      // If agents endpoint returns empty or is restricted, fallback to fetching recent tickets to extract active owners
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

      // Sort alphabetically by name
      agents.sort((a, b) => a.name.localeCompare(b.name));

      return res.json({ agents });
    } catch (error) {
      console.error("Erro ao buscar atendentes Movidesk:", error);
      return res.status(500).json({
        error: error instanceof Error ? error.message : "Erro ao carregar lista de atendentes.",
      });
    }
  });

  // Helper function to strip HTML and extract clean text
  const stripHtml = (html: string) => {
    if (!html) return "";
    return html
      .replace(/<br\s*[\/]?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  };

  // Helper function to parse structured Agendamento Técnico text blocks
  const parseStructuredAppointmentText = (text: string) => {
    if (!text) return {};

    const res: {
      nomeFantasia?: string;
      razaoSocial?: string;
      cnpj?: string;
      tecnicoResponsavel?: string;
      ticketNum?: string;
      descricaoAtendimento?: string;
    } = {};

    // Nome Fantasia: POSTO COMETA
    const matchFantasia = text.match(/Nome\s+Fantasia:\s*([^\r\n]+)/i);
    if (matchFantasia && matchFantasia[1].trim()) {
      res.nomeFantasia = matchFantasia[1].trim();
    }

    // Razão Social: POSTO COMETA COMÉRCIO DE PETRÓLEO LTDA
    const matchRazao = text.match(/Razão\s+Social:\s*([^\r\n]+)/i);
    if (matchRazao && matchRazao[1].trim()) {
      res.razaoSocial = matchRazao[1].trim();
    }

    // Técnico Responsável: @ACS VISGUEIRA or @Eduardo
    const matchTecnico = text.match(/Técnico\s+Responsável:\s*@?([^\r\n]+)/i);
    if (matchTecnico && matchTecnico[1].trim()) {
      res.tecnicoResponsavel = matchTecnico[1].trim().replace(/^@/, '').trim();
    }

    // CNPJ: 04.961.676/0001-00
    const matchCnpj = text.match(/CNPJ:\s*([\d\.\/\-]+)/i);
    if (matchCnpj && matchCnpj[1].trim()) {
      res.cnpj = matchCnpj[1].trim();
    }

    // Ticket: 20260731000057
    const matchTicket = text.match(/Ticket:\s*(\d+)/i);
    if (matchTicket && matchTicket[1].trim()) {
      res.ticketNum = matchTicket[1].trim();
    }

    // Descrição do Atendimento:
    const matchDesc = text.match(/(?:Descrição\s+do\s+Atendimento|Descrição\s+do\s+Chamado|Descrição\s+de\s+Atendimento):\s*([\s\S]+)/i);
    if (matchDesc && matchDesc[1].trim()) {
      let descText = matchDesc[1].trim();
      // Clean trailing edit timestamps if present
      descText = descText.replace(/Editad[ao]\s+\d{1,2}:\d{2}\s*$/i, '').trim();
      res.descricaoAtendimento = descText;
    }

    return res;
  };

  // Helper function to parse Movidesk Ticket fields
  const parseTicketFields = (t: any) => {
    // 1. Gather all available plain text blocks from actions, subject, customFieldValues
    const rawTexts: string[] = [];
    if (t.subject) rawTexts.push(t.subject);
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
        if (typeof val === 'string' && val.trim()) {
          rawTexts.push(val.trim());
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

    // Cliente (Prioritize Nome Fantasia from Agendamento Técnico, then Razão Social, then Movidesk client object)
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
        if (c.cpfCnpj) { cnpj = c.cpfCnpj; break; }
        if (c.organization?.cpfCnpj) { cnpj = c.organization.cpfCnpj; break; }
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

    // Check Custom Field 221237 (Campo de Técnico Responsável no Movidesk)
    if (!tecnico && t.customFieldValues && Array.isArray(t.customFieldValues)) {
      const techCf = t.customFieldValues.find((cf: any) => cf.customFieldId === 221237);
      if (techCf) {
        const val = techCf.value || (techCf.items && techCf.items[0]?.customFieldItem);
        if (typeof val === "string" && val.trim()) {
          tecnico = val.trim().replace(/^@/, '');
        }
      }
    }

    // Check Category if it looks like a person name
    if (!tecnico && t.category && typeof t.category === "string" && !/problema|dúvida|solicitação|automação|suporte|atendimento/i.test(t.category)) {
      tecnico = t.category.trim();
    }

    // Fallback to Owner
    if (!tecnico) {
      tecnico = t.owner?.name || t.owner?.businessName || "";
    }

    // Fallback to CreatedBy
    if (!tecnico) {
      tecnico = t.createdBy?.name || t.createdBy?.businessName || "";
    }

    // Fallback to Actions Author
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
      tecnico = tecnico.replace(/^@/, '').trim();
    }

    const acompanhado = mainClient?.name !== clienteName ? mainClient?.name || "" : "";

    // Descrição do Chamado & Fato (Fato é deixado em branco na importação para preenchimento manual pelo técnico)
    let descricaoChamado = extractedDescricao;
    let fato = "";
    const subject = t.subject || "";

    if (!descricaoChamado) {
      if (t.actions && Array.isArray(t.actions) && t.actions.length > 0) {
        const firstActionDesc = stripHtml(t.actions[0]?.description || "");
        if (firstActionDesc) {
          descricaoChamado = firstActionDesc;
        }
      }
    }

    if (!descricaoChamado) {
      descricaoChamado = subject;
    }

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
      descricaoChamado: descricaoChamado,
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

  // API Route: Movidesk Tickets by Agent & Date (Today + last 7 days)
  app.get("/api/movidesk/tickets", async (req, res) => {
    try {
      const token = (req.query.token as string) || process.env.MOVIDESK_API_TOKEN || "75762c40-5399-4b83-b958-c265fbf5d6fb";
      const agentId = req.query.agentId ? String(req.query.agentId).trim() : "";
      const agentName = req.query.agentName ? String(req.query.agentName).trim().toLowerCase() : "";

      if (!token) {
        return res.status(400).json({ error: "Chave de API do Movidesk não informada." });
      }

      // Calculate date filter: 7 days ago from today (00:00:00)
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      sevenDaysAgo.setHours(0, 0, 0, 0);

      // Fetch top recent tickets from Movidesk (up to 120 recent tickets)
      const movideskUrl = `https://api.movidesk.com/public/v1/tickets?token=${encodeURIComponent(
        token
      )}&$select=id,protocol,subject,createdDate,status,owner,createdBy&$expand=clients,owner,createdBy,actions,customFieldValues&$orderby=createdDate desc&$top=120`;

      const response = await fetch(movideskUrl);

      if (!response.ok) {
        return res.status(response.status).json({
          error: `Erro ao consultar Movidesk (Status ${response.status}).`,
        });
      }

      const rawData = await response.json();
      const ticketList: any[] = Array.isArray(rawData) ? rawData : [];

      // Filter and map tickets
      const filtered = ticketList.filter((t: any) => {
        // Date check: created within last 7 days + today
        const tDate = t.createdDate ? new Date(t.createdDate) : null;
        if (tDate && tDate < sevenDaysAgo) {
          return false;
        }

        // Agent / User check
        if (agentId) {
          const isOwner = t.owner?.id && String(t.owner.id) === agentId;
          const isCreatedBy = t.createdBy?.id && String(t.createdBy.id) === agentId;
          if (!isOwner && !isCreatedBy) return false;
        } else if (agentName) {
          const isOwnerName = t.owner?.name && t.owner.name.toLowerCase().includes(agentName);
          const isCreatedByName = t.createdBy?.name && t.createdBy.name.toLowerCase().includes(agentName);
          if (!isOwnerName && !isCreatedByName) return false;
        }

        return true;
      });

      const formattedTickets = filtered.map((t: any) => parseTicketFields(t));

      return res.json({
        tickets: formattedTickets,
        count: formattedTickets.length,
        startDate: sevenDaysAgo.toISOString().split("T")[0],
        endDate: now.toISOString().split("T")[0],
      });
    } catch (error) {
      console.error("Erro na busca de chamados por atendente:", error);
      return res.status(500).json({
        error: error instanceof Error ? error.message : "Erro ao listar chamados.",
      });
    }
  });

  // API Route: Movidesk Ticket Import Proxy
  app.get("/api/movidesk/ticket", async (req, res) => {
    try {
      const id = req.query.id || req.query.ticket;
      const token = (req.query.token as string) || process.env.MOVIDESK_API_TOKEN || "75762c40-5399-4b83-b958-c265fbf5d6fb";

      if (!id) {
        return res.status(400).json({ error: "Número do Ticket/Chamado é obrigatório." });
      }

      if (!token) {
        return res.status(400).json({ error: "Chave de API do Movidesk não informada." });
      }

      const cleanId = String(id).trim();

      // Query Movidesk API v1 Tickets endpoint
      const movideskUrl = `https://api.movidesk.com/public/v1/tickets?token=${encodeURIComponent(
        token
      )}&id=${encodeURIComponent(cleanId)}&$expand=clients,owner,createdBy,actions,customFieldValues`;

      const response = await fetch(movideskUrl);

      if (!response.ok) {
        if (response.status === 404) {
          return res.status(404).json({ error: `Chamado #${cleanId} não foi encontrado no Movidesk.` });
        }
        return res.status(response.status).json({
          error: `Erro ao consultar Movidesk (Status ${response.status}). Verifique o token de API.`,
        });
      }

      const data = await response.json();
      const ticket = Array.isArray(data) ? data[0] : data;

      if (!ticket || (!ticket.id && !ticket.protocol)) {
        return res.status(404).json({ error: `Chamado #${cleanId} não encontrado no Movidesk.` });
      }

      const parsed = parseTicketFields(ticket);

      return res.json({
        ticket: String(cleanId || ticket.protocol || ticket.id),
        cliente: parsed.cliente,
        cnpj: parsed.cnpj,
        tecnico: parsed.tecnico,
        acompanhado: parsed.acompanhado,
        descricaoChamado: parsed.descricaoChamado,
        fato: parsed.fato,
        status: parsed.status,
        data: parsed.dateFormatted,
        raw: {
          protocol: ticket.protocol,
          category: ticket.category,
          serviceFull: ticket.serviceFull,
          address: ticket.clients?.[0]?.address || "",
        },
      });
    } catch (error) {
      console.error("Erro na rota Movidesk Proxy:", error);
      return res.status(500).json({
        error: error instanceof Error ? error.message : "Erro interno ao se comunicar com o Movidesk.",
      });
    }
  });

  // API Route: AI Text Refinement for Support Reports
  app.post("/api/ai/refine", async (req, res) => {
    try {
      const { text, fieldType, context } = req.body;
      if (!text || typeof text !== "string") {
        return res.status(400).json({ error: "Texto para aprimoramento é obrigatório." });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          error: "Chave de API Gemini (GEMINI_API_KEY) não configurada.",
        });
      }

      const ai = new GoogleGenAI({ apiKey });

      let systemPrompt = "";
      if (fieldType === "fato") {
        systemPrompt = `Você é um assistente de suporte técnico em TI especialista em redação técnica de relatórios.
O usuário vai fornecer anotações brutos sobre o "FATO CONSTATADO" (o problema relatado ou identificado no cliente).
Sua tarefa é reescrever o texto em português do Brasil de forma clara, profissional, objetiva e gramaticalmente correta.
Mantenha os detalhes técnicos (erros, códigos, equipamentos, sintomas) sem inventar fatos falsos.
Responda APENAS com o texto reescrito do Fato Constatado, sem explicações nem saudações.`;
      } else if (fieldType === "diagnostico") {
        systemPrompt = `Você é um assistente de suporte técnico em TI especialista em relatórios de atendimento.
O usuário vai fornecer anotações brutas do "DIAGNÓSTICO E AÇÕES REALIZADAS" no cliente.
Sua tarefa é reescrever o texto em português de forma técnica, organizada (pode usar tópicos se adequado ou parágrafos bem estruturados), clara e profissional.
Mantenha os procedimentos reais executados (configurações, comandos, trocas, limpezas, testes de validação).
Responda APENAS com o texto reescrito do Diagnóstico e Ações, sem explicações nem saudações.`;
      } else {
        systemPrompt = `Você é um especialista em suporte técnico de TI. Melhore e profissionalize a redação do seguinte relatório de atendimento mantendo todas as informações reais sem inventar nada. Responda apenas com o texto melhorado.`;
      }

      const userMessage = context
        ? `Contexto do Atendimento (Cliente: ${context.cliente || "N/I"}, Ticket: ${context.ticket || "N/I"}):\n\nTexto original:\n${text}`
        : text;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          { role: "user", parts: [{ text: `${systemPrompt}\n\n${userMessage}` }] },
        ],
      });

      const refinedText = response.text?.trim() || text;
      return res.json({ refinedText });
    } catch (error) {
      console.error("Erro na API Gemini:", error);
      return res.status(500).json({
        error: error instanceof Error ? error.message : "Erro ao processar texto com Inteligência Artificial.",
      });
    }
  });

  // Vite Middleware in Dev Mode
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor rodando em http://0.0.0.0:${PORT}`);
  });
}

startServer();
