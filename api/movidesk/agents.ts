export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const urlObj = new URL(req.url || "", "http://localhost");
    const token = req.query?.token || urlObj.searchParams.get("token") || process.env.MOVIDESK_API_TOKEN || "75762c40-5399-4b83-b958-c265fbf5d6fb";

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

    // Fallback if persons list is empty
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

    return res.status(200).json({ agents });
  } catch (error) {
    console.error("Erro ao buscar atendentes Movidesk:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao carregar lista de atendentes.",
    });
  }
}
