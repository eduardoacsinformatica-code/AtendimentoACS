import { parseTicketFields } from '../../api/movidesk/parser';

export { parseTicketFields };

export async function fetchDirectMovideskTicket(ticketId: string, token: string) {
  const cleanId = String(ticketId).trim();
  const movideskUrl = `https://api.movidesk.com/public/v1/tickets?token=${encodeURIComponent(
    token
  )}&id=${encodeURIComponent(cleanId)}&$expand=clients,owner,createdBy,actions,customFieldValues`;

  const response = await fetch(movideskUrl);
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Chamado #${cleanId} não foi encontrado no Movidesk.`);
    }
    throw new Error(`Erro ao consultar Movidesk (Status ${response.status}). Verifique o token de API.`);
  }

  const data = await response.json();
  const ticket = Array.isArray(data) ? data[0] : data;

  if (!ticket || (!ticket.id && !ticket.protocol)) {
    throw new Error(`Chamado #${cleanId} não encontrado no Movidesk.`);
  }

  const parsed = parseTicketFields(ticket);
  return {
    ticket: String(cleanId || ticket.protocol || ticket.id),
    cliente: parsed.cliente,
    cnpj: parsed.cnpj,
    tecnico: parsed.tecnico,
    acompanhado: parsed.acompanhado,
    descricaoChamado: parsed.descricaoChamado,
    fato: parsed.fato,
    status: parsed.status,
    data: parsed.dateFormatted,
  };
}

export async function fetchDirectMovideskAgents(token: string) {
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
  return agents;
}

export async function fetchDirectMovideskTickets(token: string, agentId?: string, agentName?: string) {
  const movideskUrl = `https://api.movidesk.com/public/v1/tickets?token=${encodeURIComponent(
    token
  )}&$select=id,protocol,subject,createdDate,status,owner,createdBy&$expand=clients,owner,createdBy,actions,customFieldValues&$orderby=createdDate desc&$top=200`;

  const response = await fetch(movideskUrl);
  if (!response.ok) {
    throw new Error(`Erro ao consultar Movidesk (Status ${response.status}).`);
  }

  const rawData = await response.json();
  const ticketList: any[] = Array.isArray(rawData) ? rawData : [];

  const filtered = ticketList.filter((t: any) => {
    if (agentId && agentId !== "all") {
      const isOwner = t.owner?.id && String(t.owner.id) === agentId;
      const isCreatedBy = t.createdBy?.id && String(t.createdBy.id) === agentId;
      if (!isOwner && !isCreatedBy) return false;
    } else if (agentName) {
      const nameLower = agentName.toLowerCase();
      const isOwnerName = t.owner?.name && t.owner.name.toLowerCase().includes(nameLower);
      const isCreatedByName = t.createdBy?.name && t.createdBy.name.toLowerCase().includes(nameLower);
      if (!isOwnerName && !isCreatedByName) return false;
    }
    return true;
  });

  return filtered.map((t: any) => parseTicketFields(t));
}
