import { parseTicketFields } from '../../src/utils/movideskParser';
import { movideskJson, sendApiError } from '../../src/server_movidesk';

const EXPAND = 'clients,owner,createdBy,actions,customFieldValues';

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido. Use GET.' });
  }

  try {
    const id = req.query?.id || req.query?.ticket;
    if (!id) return res.status(400).json({ error: 'Número do Ticket/Chamado é obrigatório.' });

    const cleanId = String(id).trim();
    const isInt32 = /^\d{1,9}$/.test(cleanId) && Number(cleanId) > 0 && Number(cleanId) <= 2147483647;
    let ticket: any = null;

    if (isInt32) {
      try {
        const data = await movideskJson('tickets', {
          id: cleanId,
          '$expand': EXPAND,
        });
        const candidate = Array.isArray(data) ? data[0] : data;
        if (candidate?.id || candidate?.protocol) ticket = candidate;
      } catch (error) {
        console.warn(`Busca direta do ticket ${cleanId} falhou; tentando por filtro.`, error);
      }
    }

    if (!ticket) {
      const escapedProtocol = cleanId.replace(/'/g, "''");
      const filter = isInt32
        ? `protocol eq '${escapedProtocol}' or id eq ${cleanId}`
        : `protocol eq '${escapedProtocol}'`;

      const data = await movideskJson('tickets', {
        '$filter': filter,
        '$expand': EXPAND,
        '$top': 1,
      });
      if (Array.isArray(data) && data.length > 0) ticket = data[0];
    }

    if (!ticket) {
      return res.status(404).json({ error: `Chamado #${cleanId} não foi encontrado no Movidesk.` });
    }

    const parsed = parseTicketFields(ticket);
    return res.status(200).json({
      ticket: parsed.id || String(ticket.protocol || ticket.id || cleanId),
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
    return sendApiError(res, error, 'Erro ao importar chamado do Movidesk.');
  }
}
