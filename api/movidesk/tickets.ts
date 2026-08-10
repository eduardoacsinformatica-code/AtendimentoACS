import { parseTicketFields } from '../../src/utils/movideskParser';
import { movideskJson, sendApiError } from '../../src/server_movidesk';

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido. Use GET.' });
  }

  try {
    const agentId = req.query?.agentId ? String(req.query.agentId).trim() : '';
    const agentName = req.query?.agentName ? String(req.query.agentName).trim().toLowerCase() : '';

    // A listagem precisa ser leve. Actions, custom fields e clientes são carregados
    // somente quando um ticket individual é aberto/importado.
    const rawData = await movideskJson('tickets', {
      '$select': 'id,protocol,subject,createdDate,status,owner,createdBy',
      '$expand': 'clients,owner,createdBy',
      '$orderby': 'createdDate desc',
      '$top': 100,
    });

    const ticketList: any[] = Array.isArray(rawData) ? rawData : [];
    const filtered = ticketList.filter((t: any) => {
      if (!agentId && !agentName) return true;

      if (agentId && agentId !== 'all') {
        const ownerMatch = t.owner?.id && String(t.owner.id) === agentId;
        const createdByMatch = t.createdBy?.id && String(t.createdBy.id) === agentId;
        if (ownerMatch || createdByMatch) return true;
      }

      if (agentName) {
        const ownerName = String(t.owner?.name || t.owner?.businessName || '').toLowerCase();
        const createdByName = String(t.createdBy?.name || t.createdBy?.businessName || '').toLowerCase();
        return ownerName.includes(agentName) || createdByName.includes(agentName);
      }

      return false;
    });

    return res.status(200).json({
      tickets: filtered.map((ticket) => parseTicketFields(ticket)),
      count: filtered.length,
      limitedTo: 100,
    });
  } catch (error) {
    return sendApiError(res, error, 'Erro ao listar chamados do Movidesk.');
  }
}
