export default function handler(req: any, res: any) {
  return res.status(200).json({
    ok: true,
    service: 'AtendimentoACS API',
    environment: process.env.VERCEL ? 'vercel' : 'local',
  });
}
