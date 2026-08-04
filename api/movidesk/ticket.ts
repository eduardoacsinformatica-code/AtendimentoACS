import { parseTicketFields } from "./parser";

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

    // Movidesk returns single object when queried by 'id', or array if filter used
    const ticket = Array.isArray(data) ? data[0] : data;

    if (!ticket || (!ticket.id && !ticket.protocol)) {
      return res.status(404).json({ error: `Chamado #${cleanId} não encontrado no Movidesk.` });
    }

    const parsed = parseTicketFields(ticket);

    return res.status(200).json({
      ticket: parsed.id || String(cleanId),
      cliente: parsed.cliente,
      cnpj: parsed.cnpj,
      tecnico: parsed.tecnico,
      acompanhado: parsed.acompanhado,
      descricaoChamado: parsed.descricaoChamado,
      fato: parsed.fato,
      status: parsed.status,
      data: parsed.dateFormatted,
      raw: {
        protocol: parsed.protocol,
        category: ticket.category,
        serviceFull: ticket.serviceFull,
      },
    });
  } catch (error) {
    console.error("Erro na rota Movidesk Proxy:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Erro interno ao se comunicar com o Movidesk.",
    });
  }
}
