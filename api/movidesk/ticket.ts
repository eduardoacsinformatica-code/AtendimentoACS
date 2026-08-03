export default async function handler(req: any, res: any) {
  try {
    const id = req.query?.id || req.query?.ticket;
    const token = req.query?.token || process.env.MOVIDESK_API_TOKEN || "75762c40-5399-4b83-b958-c265fbf5d6fb";

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
    )}&id=${encodeURIComponent(cleanId)}&$expand=clients,owner,actions,customFieldValues`;

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

    // Movidesk returns single object when queried by 'id', or array if filter used
    const ticket = Array.isArray(data) ? data[0] : data;

    if (!ticket || (!ticket.id && !ticket.protocol)) {
      return res.status(404).json({ error: `Chamado #${cleanId} não encontrado no Movidesk.` });
    }

    // Helper to strip HTML tags
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

    // Extract client details
    const mainClient = ticket.clients && ticket.clients.length > 0 ? ticket.clients[0] : null;
    const createdBy = ticket.createdBy;

    const clienteName =
      mainClient?.businessName ||
      mainClient?.name ||
      createdBy?.businessName ||
      createdBy?.name ||
      "";

    const cnpj = mainClient?.cpfCnpj || createdBy?.cpfCnpj || "";
    const tecnico = ticket.owner?.name || ticket.owner?.businessName || "";
    const acompanhado = mainClient?.name !== clienteName ? mainClient?.name || "" : "";

    // Extract problem description / Fato Constatado from subject or first action
    let fato = ticket.subject || "";
    let actionDesc = "";

    if (ticket.actions && ticket.actions.length > 0) {
      // Find initial public or description action
      const firstAction = ticket.actions[0];
      if (firstAction?.description) {
        actionDesc = stripHtml(firstAction.description);
      }
    }

    if (actionDesc) {
      fato = fato ? `${fato}\n\n${actionDesc}` : actionDesc;
    }

    // Status Mapping
    let mappedStatus = "EM_ANDAMENTO";
    const statusLower = String(ticket.status || "").toLowerCase();
    if (statusLower.includes("resolv") || statusLower.includes("fechad") || statusLower.includes("conclu")) {
      mappedStatus = "CONCLUIDO";
    } else if (statusLower.includes("pendent")) {
      mappedStatus = "PENDENTE";
    } else if (statusLower.includes("aguar")) {
      mappedStatus = "AGUARDANDO_CLIENTE";
    }

    // Date YYYY-MM-DD
    let formattedDate = "";
    if (ticket.createdDate) {
      formattedDate = String(ticket.createdDate).split("T")[0];
    }

    return res.status(200).json({
      ticket: String(ticket.id || ticket.protocol || cleanId),
      cliente: clienteName,
      cnpj: cnpj,
      tecnico: tecnico,
      acompanhado: acompanhado,
      fato: fato,
      status: mappedStatus,
      data: formattedDate,
      raw: {
        protocol: ticket.protocol,
        category: ticket.category,
        serviceFull: ticket.serviceFull,
        address: mainClient?.address || "",
      },
    });
  } catch (error) {
    console.error("Erro na rota Movidesk Proxy:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Erro interno ao se comunicar com o Movidesk.",
    });
  }
}
