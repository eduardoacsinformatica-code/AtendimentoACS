import { movideskJson, sendApiError } from '../../src/server_movidesk';

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido. Use GET.' });
  }

  try {
    const data = await movideskJson('persons', {
      '$select': 'id,name',
      '$top': 1,
    }, {}, 12000);

    return res.status(200).json({
      ok: true,
      movidesk: 'connected',
      sampleReturned: Array.isArray(data) ? data.length : data ? 1 : 0,
    });
  } catch (error) {
    return sendApiError(res, error, 'Falha no teste de conexão com o Movidesk.');
  }
}
