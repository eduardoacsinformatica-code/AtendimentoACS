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
    const token = req.query?.token || urlObj.searchParams.get("token") || process.env.MOVIDESK_API_TOKEN;
    const agentIdRaw = req.query?.agentId || urlObj.searchParams.get("agentId");
    const agentId = agentIdRaw ? String(agentIdRaw).trim() : "";
    const agentNameRaw = req.query?.agentName || urlObj.searchParams.get("agentName");
    const agentName = agentNameRaw ? String(agentNameRaw).trim().toLowerCase() : "";

    if (!token) {
      return res.status(400).json({ error: "Chave de API do Movidesk não informada." });
    }

    const movideskUrl = `https://api.movidesk.com/public/v1/tickets?token=${encodeURIComponent(
      token
    )}&$select=id,protocol,subject,createdDate,status,owner,createdBy&$expand=owner,createdBy,clients&$orderby=createdDate desc&$top=100`;

    const response = await fetch(movideskUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: `Erro ao consultar Movidesk (Status ${response.status}).`,
      });
    }

    const rawData = await response.json();
    const ticketList: any[] = Array.isArray(rawData) ? rawData : [];

    const filtered = ticketList.filter((t: any) => {
      if (!agentId && !agentName) {
        return true;
      }

      if (agentId && agentId !== "all") {
        if (t.owner?.id && String(t.owner.id) === agentId) return true;
        if (t.createdBy?.id && String(t.createdBy.id) === agentId) return true;
      }

      if (agentName) {
        const ownerName = String(t.owner?.name || t.owner?.businessName || "").toLowerCase();
        const createdByName = String(t.createdBy?.name || t.createdBy?.businessName || "").toLowerCase();
        if (ownerName.includes(agentName) || createdByName.includes(agentName)) {
          return true;
        }

        if (t.actions && Array.isArray(t.actions)) {
          const matchedAction = t.actions.some((act: any) => {
            const actAuthor = String(act.createdBy?.name || act.createdBy?.businessName || act.createdByName || "").toLowerCase();
            return actAuthor.includes(agentName);
          });
          if (matchedAction) return true;
        }
      }

      return false;
    });

    const parsedTickets = filtered.map((t) => parseTicketFields(t));

    return res.status(200).json({
      tickets: parsedTickets,
      allDates: true,
    });
  } catch (error) {
    console.error("Erro na rota Movidesk Tickets:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao carregar lista de chamados.",
    });
  }
}
