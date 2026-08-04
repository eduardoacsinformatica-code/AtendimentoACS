import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { parseTicketFields } from "./src/utils/movideskParser";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // CORS middleware for API endpoints
  app.use("/api", (req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }
    next();
  });

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

  // API Route: Movidesk Tickets by Agent
  app.get("/api/movidesk/tickets", async (req, res) => {
    try {
      const token = (req.query.token as string) || process.env.MOVIDESK_API_TOKEN || "75762c40-5399-4b83-b958-c265fbf5d6fb";
      const agentId = req.query.agentId ? String(req.query.agentId).trim() : "";
      const agentName = req.query.agentName ? String(req.query.agentName).trim().toLowerCase() : "";

      if (!token) {
        return res.status(400).json({ error: "Chave de API do Movidesk não informada." });
      }

      // Fetch tickets from Movidesk ordered by creation date
      const movideskUrl = `https://api.movidesk.com/public/v1/tickets?token=${encodeURIComponent(
        token
      )}&$select=id,protocol,subject,createdDate,status,owner,createdBy&$expand=clients,owner,createdBy,actions,customFieldValues&$orderby=createdDate desc&$top=200`;

      const response = await fetch(movideskUrl);

      if (!response.ok) {
        return res.status(response.status).json({
          error: `Erro ao consultar Movidesk (Status ${response.status}).`,
        });
      }

      const rawData = await response.json();
      const ticketList: any[] = Array.isArray(rawData) ? rawData : [];

      // Filter by agent if specified, otherwise return all tickets
      const filtered = ticketList.filter((t: any) => {
        if (agentId && agentId !== "all") {
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
        allDates: true,
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
