import { parseTicketFields } from "../../src/utils/movideskParser";

export const maxDuration = 30;
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};

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

    const cleanId = String(id).replace(/^[#\s]+/, "").trim();
    const numVal = Number(cleanId);
    const isValidInt32 = !isNaN(numVal) && numVal > 0 && numVal <= 2147483647 && Number.isInteger(numVal);
    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "application/json",
    };

    let ticket: any = null;

    // Step 1: Query by protocol filter (e.g. protocol eq '12345')
    try {
      const filterProtocolUrl = `https://api.movidesk.com/public/v1/tickets?token=${encodeURIComponent(
        token
      )}&$filter=${encodeURIComponent(`protocol eq '${cleanId}'`)}&$expand=clients,owner,createdBy,actions,customFieldValues`;

      const protocolRes = await fetch(filterProtocolUrl, { headers });
      if (protocolRes.ok) {
        const data = await protocolRes.json();
        if (Array.isArray(data) && data.length > 0) {
          ticket = data[0];
        }
      }
    } catch (err) {
      console.warn("Movidesk protocol filter fetch failed:", err);
    }

    // Step 2: Query by numeric id filter if not found
    if ((!ticket || (!ticket.id && !ticket.protocol)) && isValidInt32) {
      try {
        const filterIdUrl = `https://api.movidesk.com/public/v1/tickets?token=${encodeURIComponent(
          token
        )}&$filter=${encodeURIComponent(`id eq ${cleanId}`)}&$expand=clients,owner,createdBy,actions,customFieldValues`;

        const filterIdRes = await fetch(filterIdUrl, { headers });
        if (filterIdRes.ok) {
          const data = await filterIdRes.json();
          if (Array.isArray(data) && data.length > 0) {
            ticket = data[0];
          }
        }
      } catch (err) {
        console.warn("Movidesk ID filter fetch failed:", err);
      }
    }

    // Step 3: Direct ID parameter query if still not found
    if ((!ticket || (!ticket.id && !ticket.protocol)) && isValidInt32) {
      try {
        const directUrl = `https://api.movidesk.com/public/v1/tickets?token=${encodeURIComponent(
          token
        )}&id=${encodeURIComponent(cleanId)}&$expand=clients,owner,createdBy,actions,customFieldValues`;

        const directRes = await fetch(directUrl, { headers });
        if (directRes.ok) {
          const data = await directRes.json();
          const candidate = Array.isArray(data) ? data[0] : data;
          if (candidate && (candidate.id || candidate.protocol)) {
            ticket = candidate;
          }
        }
      } catch (err) {
        console.warn("Movidesk direct ID fetch failed:", err);
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
