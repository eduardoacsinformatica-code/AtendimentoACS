import { GoogleGenAI } from "@google/genai";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido. Use POST." });
  }

  try {
    const { text, fieldType, context } = req.body || {};
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Texto para aprimoramento é obrigatório." });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: "Chave de API Gemini (GEMINI_API_KEY) não configurada no servidor Vercel.",
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    let systemPrompt = "";
    if (fieldType === "fato") {
      systemPrompt = `Você é um assistente de suporte técnico em TI especialista em redação técnica de relatórios.
O usuário vai fornecer anotações brutas sobre o "FATO CONSTATADO" (o problema relatado ou identificado no cliente).
Sua tarefa é reescrever o texto em português do Brasil de forma clara, profissional, objetiva e gramaticalmente correta.
Mantenha os detalhes técnicos (erros, códigos, equipamentos, sintomas) sem inventar fatos falsos.
Responda APENAS com o texto reescrito do Fato Constatado, sem explicações nem saudações.`;
    } else if (fieldType === "diagnostico") {
      systemPrompt = `Você é um assistente de suporte técnico em TI especialista em relatórios de atendimento.
O usuário vai fornecer anotações brutas do "DIAGNÓSTICO E AÇÕES REALIZADAS" no cliente.
Sua tarefa é reescrever o texto em português de forma técnica, organizada (pode usar tópicos se adequado ou parágrafos bem estruturados), clara e profissional.
Mantenha os procedimentos reais executados (configurações, comandos, trocas, limpezas, testes de validação).
Responda APENAS com o texto reescrito do Diagnóstico e Ações, sem explicações nem saudações.`;
    } else {
      systemPrompt = `Você é um especialista em suporte técnico de TI. Melhore e profissionalize a redação do seguinte relatório de atendimento mantendo todas as informações reais sem inventar nada. Responda apenas com o texto melhorado.`;
    }

    const userMessage = context
      ? `Contexto do Atendimento (Cliente: ${context.cliente || "N/I"}, Ticket: ${context.ticket || "N/I"}):\n\nTexto original:\n${text}`
      : text;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        { role: "user", parts: [{ text: `${systemPrompt}\n\n${userMessage}` }] },
      ],
    });

    const refinedText = response.text?.trim() || text;
    return res.status(200).json({ refinedText });
  } catch (error) {
    console.error("Erro na API Gemini:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao processar texto com Inteligência Artificial.",
    });
  }
}
