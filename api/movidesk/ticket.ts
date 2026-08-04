import { parseTicketFields } from "../../src/utils/movideskParser";

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const urlObj = new URL(req.url || "", "http://localhost");
    const id = req.query?.id || req.query?.ticket || urlObj.searchParams.get("id") || urlObj.searchParams.get("ticket");
    const token = req.query?.token || urlObj.searchParams.get("token") || process.env.MOVIDESK_API_TOKEN || "75762c40-5399-4b83-b958-c265fbf5d6fb";

    if (!id) {
      return res.status(400).json({ error: "Número do Ticket/Chamado é obrigatório." });
    }

    if (!token) {
      return res.status(400).json({ error: "Chave de API do Movidesk não informada." });
    }

    const cleanId = String(id).trim();
    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "application/json",
    };

    // Query Movidesk API v1 Tickets endpoint by id
    const movideskUrl = `https://api.movidesk.com/public/v1/tickets?token=${encodeURIComponent(
      token
    )}&id=${encodeURIComponent(cleanId)}&$expand=clients,owner,createdBy,actions,customFieldValues`;

    let response = await fetch(movideskUrl, { headers });
    let ticket: any = null;

    if (response.ok) {
      const data = await response.json();
      ticket = Array.isArray(data) ? data[0] : data;
    }

    // Fallback: If querying by id returns null or empty, try querying by protocol or filter
    if (!ticket || (!ticket.id && !ticket.protocol)) {
      const isNum = !isNaN(Number(cleanId));
      const filterExpr = isNum
        ? `protocol eq '${cleanId}' or id eq ${cleanId}`
        : `protocol eq '${cleanId}'`;

      const filterUrl = `https://api.movidesk.com/public/v1/tickets?token=${encodeURIComponent(
        token
      )}&$filter=${encodeURIComponent(filterExpr)}&$expand=clients,owner,createdBy,actions,customFieldValues`;

      const filterRes = await fetch(filterUrl, { headers });
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
