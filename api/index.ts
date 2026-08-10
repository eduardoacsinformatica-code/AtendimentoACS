import express from "express";
import { GoogleGenAI } from "@google/genai";
import { parseTicketFields, validateMovideskPayload } from "../src/utils/movideskParser";

const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// CORS middleware
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
    const token = (req.query.token as string) || process.env.MOVIDESK_API_TOKEN;

    if (!token) {
      return res.status(400).json({ error: "Chave de API do Movidesk não informada." });
    }

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
    const token = (req.query.token as string) || process.env.MOVIDESK_API_TOKEN;
    const agentId = req.query.agentId ? String(req.query.agentId).trim() : "";
    const agentName = req.query.agentName ? String(req.query.agentName).trim().toLowerCase() : "";

    if (!token) {
      return res.status(400).json({ error: "Chave de API do Movidesk não informada. Configure MOVIDESK_API_TOKEN nas variáveis de ambiente." });
    }

    const movideskUrl = `https://api.movidesk.com/public/v1/tickets?token=${encodeURIComponent(
      token
    )}&$select=id,protocol,subject,createdDate,status,owner,createdBy&$expand=owner,createdBy,clients&$orderby=createdDate desc&$top=100`;

    const response = await fetch(movideskUrl);
    if (!response.ok) {
      return res.status(response.status).json({
        error: `Erro ao consultar Movidesk (Status ${response.status}).`,
      });
    }

    const rawData = await response.json();
    const ticketList: any[] = Array.isArray(rawData) ? rawData : [];

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
    const token = (req.query.token as string) || process.env.MOVIDESK_API_TOKEN;

    if (!id) {
      return res.status(400).json({ error: "Número do Ticket/Chamado é obrigatório." });
    }

    if (!token) {
      return res.status(400).json({ error: "Chave de API do Movidesk não informada." });
    }

    const cleanId = String(id).trim();
    const isInt32 = /^\d{1,9}$/.test(cleanId) && Number(cleanId) > 0 && Number(cleanId) <= 2147483647;
    let ticket: any = null;

    if (isInt32) {
      try {
        const directUrl = `https://api.movidesk.com/public/v1/tickets?token=${encodeURIComponent(
          token
        )}&id=${encodeURIComponent(cleanId)}&$expand=clients,owner,createdBy,actions,customFieldValues`;

        const directRes = await fetch(directUrl);
        if (directRes.ok) {
          const directData = await directRes.json();
          const candidate = Array.isArray(directData) ? directData[0] : directData;
          if (candidate && (candidate.id || candidate.protocol)) {
            ticket = candidate;
          }
        }
      } catch (err) {
        console.warn("Movidesk direct ID fetch failed:", err);
      }
    }

    if (!ticket || (!ticket.id && !ticket.protocol)) {
      const filterExpr = isInt32
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
      return res.status(404).json({ error: `Chamado #${cleanId} não foi encontrado no Movidesk.` });
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
      rawStatus: ticket.status,
    });
  } catch (error) {
    console.error("Erro na rota Movidesk Proxy:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Erro interno ao se comunicar com o Movidesk.",
    });
  }
});

// API Route: Export Report back to Movidesk ticket
app.post("/api/movidesk/export", async (req, res) => {
  try {
    const {
      ticket,
      cliente,
      cnpj,
      tecnico,
      acompanhado,
      fato,
      diagnostico,
      observacoes,
      status,
      fotos,
      assinaturaCliente,
      token: userToken,
    } = req.body;

    if (!ticket) {
      return res.status(400).json({ error: "O campo ticket é obrigatório para atualização no Movidesk." });
    }

    const token = userToken || process.env.MOVIDESK_API_TOKEN;
    const cleanId = String(ticket).trim();
    const isInt32 = /^\d{1,9}$/.test(cleanId) && Number(cleanId) > 0 && Number(cleanId) <= 2147483647;
    let targetNumericId: number | null = null;

    if (isInt32) {
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
    }

    if (!targetNumericId) {
      const filterExpr = isInt32
        ? `protocol eq '${cleanId}' or id eq ${cleanId}`
        : `protocol eq '${cleanId}'`;

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
      return res.status(404).json({ error: `Chamado #${cleanId} não foi localizado no Movidesk.` });
    }

    const photosList = Array.isArray(fotos) ? fotos : [];
    const htmlAction = `
      <div style="font-family: Arial, sans-serif; font-size: 14px; color: #1e293b; line-height: 1.6; border: 1px solid #cbd5e0; border-radius: 8px; padding: 16px; background-color: #f8fafc; max-width: 700px;">
        <div style="background-color: #0f172a; color: #ffffff; padding: 10px 14px; border-radius: 6px; margin-bottom: 14px;">
          <h3 style="margin: 0; font-size: 15px; font-weight: bold; color: #38bdf8;">
            📋 LAUDO DE ATENDIMENTO TÉCNICO DE CAMPO
          </h3>
          ${tecnico ? `<span style="font-size: 12px; color: #94a3b8;">Técnico Responsável: ${tecnico}</span>` : ''}
        </div>

        <p style="margin-bottom: 12px;">
          <strong>👤 Responsável no Cliente (Acompanhante):</strong><br/>
          <span style="color: #0f172a; font-size: 14px; font-weight: 600;">${acompanhado || 'Não informado'}</span>
        </p>

        <div style="margin-bottom: 14px;">
          <strong>🔍 Fato Constatado:</strong>
          <div style="background-color: #ffffff; padding: 12px; border-radius: 6px; border: 1px solid #cbd5e0; margin-top: 4px; white-space: pre-wrap; font-size: 13px;">${fato || 'Não informado'}</div>
        </div>

        <div style="margin-bottom: 14px;">
          <strong>🛠️ Diagnóstico e Ações Realizadas:</strong>
          <div style="background-color: #ffffff; padding: 12px; border-radius: 6px; border: 1px solid #cbd5e0; margin-top: 4px; white-space: pre-wrap; font-size: 13px;">${diagnostico || 'Nenhuma ação registrada'}</div>
        </div>

        ${observacoes ? `
        <div style="margin-bottom: 14px;">
          <strong>📝 Observações e Recomendações:</strong>
          <div style="background-color: #ffffff; padding: 12px; border-radius: 6px; border: 1px solid #cbd5e0; margin-top: 4px; white-space: pre-wrap; font-size: 13px;">${observacoes}</div>
        </div>
        ` : ''}

        ${photosList.length > 0 ? `
        <div style="margin-bottom: 14px;">
          <strong>📷 Fotos e Evidências (${photosList.length}):</strong>
          <div style="margin-top: 8px;">
            ${photosList.map((foto: string, idx: number) => `
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
          ${assinaturaCliente ? `
            <p style="font-size: 12px; color: #475569; margin: 4px 0 8px 0;">Coletada digitalmente no local por <strong>${acompanhado || cliente || 'Cliente'}</strong></p>
            <div style="background: #ffffff; padding: 8px; display: inline-block; border-radius: 6px; border: 1px solid #cbd5e0;">
              <img src="${assinaturaCliente}" alt="Assinatura do Cliente" style="max-width: 320px; max-height: 120px; display: block;" />
            </div>
          ` : '<span style="color: #64748b; font-style: italic;"> (Não coletada)</span>'}
        </div>
      </div>
    `;

    let patchBody: any = {
      actions: [
        {
          type: 2,
          description: htmlAction,
          origin: 2,
        },
      ],
    };

    let statusAttempted = false;
    if (status) {
      const statusMap: Record<string, string> = {
        'CONCLUIDO': 'Concluído',
        'EM_ANDAMENTO': 'Em atendimento',
        'PENDENTE': 'Pendente',
        'AGUARDANDO_CLIENTE': 'Aguardando cliente',
        'AGUARDANDO_PECA': 'Aguardando peça',
      };
      if (statusMap[status]) {
        patchBody.status = statusMap[status];
        statusAttempted = true;
      }
    }

    patchBody = validateMovideskPayload(patchBody);

    const updateUrl = `https://api.movidesk.com/public/v1/tickets?token=${encodeURIComponent(token)}&id=${targetNumericId}`;
    let updateRes = await fetch(updateUrl, {
      method: "PATCH",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(patchBody),
    });

    let statusUpdated = statusAttempted;

    if (!updateRes.ok && patchBody.status) {
      delete patchBody.status;
      statusUpdated = false;

      const fallbackPayload = validateMovideskPayload(patchBody);
      updateRes = await fetch(updateUrl, {
        method: "PATCH",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(fallbackPayload),
      });
    }

    if (!updateRes.ok) {
      const finalErr = await updateRes.text().catch(() => "");
      return res.status(updateRes.status).json({
        error: `Movidesk respondeu com status ${updateRes.status}: ${finalErr || 'Falha ao atualizar chamado no Movidesk.'}`,
      });
    }

    return res.json({
      success: true,
      message: statusUpdated
        ? `Laudo e dados enviados com sucesso para o Chamado #${cleanId} no Movidesk!`
        : `Laudo e evidências incluídos com sucesso no Chamado #${cleanId}!`,
    });
  } catch (error) {
    console.error("Erro ao exportar laudo para o Movidesk:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Erro interno ao enviar para o Movidesk.",
    });
  }
});

// API Route: AI Text Refinement (Gemini)
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

export default app;
