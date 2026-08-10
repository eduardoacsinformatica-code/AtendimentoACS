import { movideskJson, sendApiError } from '../../src/server_movidesk';

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido. Use GET.' });
  }

  try {
    let agents: Array<{ id: string; name: string }> = [];

    try {
      const data = await movideskJson('persons', {
        '$filter': 'personType eq 1',
        '$select': 'id,name,businessName,email',
      });

      if (Array.isArray(data)) {
        agents = data
          .filter((p: any) => p?.id)
          .map((p: any) => ({
            id: String(p.id),
            name: p.name || p.businessName || 'Atendente sem nome',
          }));
      }
    } catch (error) {
      console.warn('Falha ao listar persons no Movidesk; tentando extrair atendentes dos tickets.', error);
    }

    if (agents.length === 0) {
      const tickets = await movideskJson('tickets', {
        '$select': 'id,owner',
        '$expand': 'owner',
        '$orderby': 'createdDate desc',
        '$top': 100,
      });

      const map = new Map<string, string>();
      if (Array.isArray(tickets)) {
        for (const ticket of tickets) {
          if (ticket?.owner?.id && (ticket.owner.name || ticket.owner.businessName)) {
            map.set(String(ticket.owner.id), ticket.owner.name || ticket.owner.businessName);
          }
        }
      }
      agents = Array.from(map, ([id, name]) => ({ id, name }));
    }

    agents.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    return res.status(200).json({ agents });
  } catch (error) {
    return sendApiError(res, error, 'Erro ao buscar atendentes no Movidesk.');
  }
}
