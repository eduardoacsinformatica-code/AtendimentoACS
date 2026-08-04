import { parseTicketFields } from "../../src/utils/movideskParser";

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    let queryParams: any = req.query || {};
    if (req.url) {
      try {
        const urlObj = new URL(req.url, "http://localhost");
        urlObj.searchParams.forEach((val, key) => {
          if (!queryParams[key]) queryParams[key] = val;
        });
      } catch {
        // ignore
      }
    }

    const id = queryParams.id || queryParams.ticket;
    const token = queryParams.token || process.env.MOVIDESK_API_TOKEN || "75762c40-5399-4b83-b958-c265fbf5d6fb";

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

    const numVal = Number(cleanId);
    const isSmallInt = !isNaN(numVal) && numVal > 0 && numVal <= 2147483647 && cleanId.length < 9;

    let ticket: any = null;

    // 1. If cleanId is a small integer ID (e.g. 1234), try direct ID lookup first
    if (isSmallInt) {
      try {
        const directUrl = `https://api.movidesk.com/public/v1/tickets?token=${encodeURIComponent(
          token
        )}&id=${encodeURIComponent(cleanId)}&$expand=clients,owner,createdBy,actions,customFieldValues`;

        const response = await fetch(directUrl, { headers });
        if (response.ok) {
          const data = await response.json();
          ticket = Array.isArray(data) ? data[0] : data;
        }
      } catch (err) {
        console.warn("Movidesk direct ID fetch failed:", err);
      }
    }

    // 2. If not found or cleanId is a protocol number (e.g. 20260801000028), query by protocol filter
    if (!ticket || (!ticket.id && !ticket.protocol)) {
      const filterExpr = isSmallInt
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
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Erro interno ao se comunicar com o Movidesk.",
    });
  }
}
