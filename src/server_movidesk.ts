export class MovideskApiError extends Error {
  status: number;
  details?: string;

  constructor(message: string, status = 502, details?: string) {
    super(message);
    this.name = 'MovideskApiError';
    this.status = status;
    this.details = details;
  }
}

export function getMovideskToken(): string {
  const token = process.env.MOVIDESK_API_TOKEN?.trim();
  if (!token) {
    throw new MovideskApiError(
      'MOVIDESK_API_TOKEN não configurado na Vercel. Adicione a variável em Project > Settings > Environment Variables e faça um novo deploy.',
      500,
    );
  }
  return token;
}

export async function movideskFetch(
  resource: 'tickets' | 'persons',
  params: Record<string, string | number | undefined>,
  init: RequestInit = {},
  timeoutMs = 25000,
): Promise<Response> {
  const token = getMovideskToken();
  const url = new URL(`https://api.movidesk.com/public/v1/${resource}`);
  url.searchParams.set('token', token);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'AtendimentoACS/1.0',
        ...(init.headers || {}),
      },
    });
    return response;
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new MovideskApiError('A API do Movidesk demorou demais para responder.', 504);
    }
    throw new MovideskApiError(
      `Falha de rede ao conectar com o Movidesk: ${error instanceof Error ? error.message : String(error)}`,
      502,
    );
  } finally {
    clearTimeout(timer);
  }
}

export async function movideskJson(
  resource: 'tickets' | 'persons',
  params: Record<string, string | number | undefined>,
  init: RequestInit = {},
  timeoutMs = 25000,
): Promise<any> {
  const response = await movideskFetch(resource, params, init, timeoutMs);
  const text = await response.text();

  if (!response.ok) {
    const safeDetails = text.replace(/token=[^&\s\"]+/gi, 'token=***').slice(0, 1200);
    throw new MovideskApiError(
      `Movidesk respondeu com status ${response.status}.`,
      response.status >= 500 ? 502 : response.status,
      safeDetails,
    );
  }

  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    throw new MovideskApiError('O Movidesk retornou uma resposta inválida.', 502, text.slice(0, 500));
  }
}

export function sendApiError(res: any, error: unknown, fallback: string) {
  console.error(fallback, error);
  if (error instanceof MovideskApiError) {
    return res.status(error.status).json({
      error: error.message,
      details: error.details,
    });
  }
  return res.status(500).json({
    error: error instanceof Error ? error.message : fallback,
  });
}
