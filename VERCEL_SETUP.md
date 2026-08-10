# Configuração para Vercel

## Variáveis obrigatórias

Em **Vercel > Project > Settings > Environment Variables**, configure:

- `MOVIDESK_API_TOKEN`: token atual da API do Movidesk.
- `GEMINI_API_KEY`: somente se usar o recurso de aprimoramento por IA.

Marque as variáveis para **Production** e, se usar deploys de teste, também **Preview**.
Depois de criar ou alterar uma variável, faça um **novo deploy**.

## Testes após o deploy

Abra estas URLs no domínio publicado:

1. `/api` — deve retornar `ok: true`.
2. `/api/movidesk/health` — deve retornar `movidesk: "connected"`.
3. `/api/movidesk/agents` — deve retornar um JSON com `agents`.

Se `/api/movidesk/health` retornar erro informando `MOVIDESK_API_TOKEN`, a variável não está disponível no deployment atual.

## Arquitetura

O navegador não acessa mais `api.movidesk.com` diretamente. Toda comunicação passa por `/api/movidesk/*` na Vercel, mantendo o token no servidor.
