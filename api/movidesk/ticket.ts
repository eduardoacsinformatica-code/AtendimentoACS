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
    let numericId: string | null = null;

    // 1) Se for um ID interno válido, tenta primeiro a busca direta e leve.
    if (isInt32) {
      try {
        const direct = await movideskJson('tickets', {
          id: cleanId,
          '$select': 'id,protocol',
        }, {}, 12000);
        const candidate = Array.isArray(direct) ? direct[0] : direct;
        if (candidate?.id) numericId = String(candidate.id);
      } catch (error) {
        console.warn(`Busca direta leve do ticket ${cleanId} falhou; tentando localizar por protocolo.`, error);
      }
    }

    // 2) Protocolos do Movidesk podem ter 14 dígitos e NÃO são o id interno.
    // Localiza somente id+protocol primeiro, sem $expand pesado.
    if (!numericId) {
      const escapedProtocol = cleanId.replace(/'/g, "''");
      const lookup = await movideskJson('tickets', {
        '$select': 'id,protocol',
        '$filter': `protocol eq '${escapedProtocol}'`,
        '$top': 1,
      }, {}, 12000);

      const candidate = Array.isArray(lookup) ? lookup[0] : lookup;
      if (candidate?.id) numericId = String(candidate.id);
    }

    if (!numericId) {
      return res.status(404).json({ error: `Chamado #${cleanId} não foi encontrado no Movidesk.` });
    }

    // 3) Com o ID interno localizado, busca os detalhes completos em uma chamada separada.
    const detail = await movideskJson('tickets', {
      id: numericId,
      '$expand': EXPAND,
    }, {}, 20000);

    ticket = Array.isArray(detail) ? detail[0] : detail;

    if (!ticket || (!ticket.id && !ticket.protocol)) {
      return res.status(404).json({ error: `Chamado #${cleanId} não foi encontrado no Movidesk.` });
    }

    const parsed = parseTicketFields(ticket);
    return res.status(200).json({
      ticket: String(ticket.protocol || parsed.protocol || ticket.id || cleanId),
      id: String(ticket.id || numericId),
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
