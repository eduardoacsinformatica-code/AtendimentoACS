import { parseTicketFields } from "./parser";

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const token = req.query?.token || process.env.MOVIDESK_API_TOKEN || "75762c40-5399-4b83-b958-c265fbf5d6fb";
    const agentId = req.query?.agentId ? String(req.query.agentId).trim() : "";
    const agentName = req.query?.agentName ? String(req.query.agentName).trim().toLowerCase() : "";

    if (!token) {
      return res.status(400).json({ error: "Chave de API do Movidesk não informada." });
    }

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
