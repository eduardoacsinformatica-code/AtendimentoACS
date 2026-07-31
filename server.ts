import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route: CNPJ Proxy Lookup
  app.get("/api/cnpj/:cnpj", async (req, res) => {
    try {
      const cleanCnpj = req.params.cnpj.replace(/\D/g, "");
      if (cleanCnpj.length !== 14) {
        return res.status(400).json({ error: "CNPJ deve conter 14 dígitos." });
      }

      // Try BrasilAPI first
      try {
        const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
        if (response.ok) {
          const data = await response.json();
          return res.json({
            razao_social: data.razao_social || data.nome_fantasia || "",
            nome_fantasia: data.nome_fantasia || data.razao_social || "",
            cnpj: data.cnpj,
            uf: data.uf,
            municipio: data.municipio,
          });
        }
      } catch (err) {
        console.warn("BrasilAPI failed, trying fallback...", err);
      }

      // Fallback: Minha Receita API
      const fallbackResponse = await fetch(`https://minhareceita.org/${cleanCnpj}`);
      if (fallbackResponse.ok) {
        const data = await fallbackResponse.json();
        return res.json({
          razao_social: data.razao_social || data.nome_fantasia || "",
          nome_fantasia: data.nome_fantasia || data.razao_social || "",
          cnpj: data.cnpj,
          uf: data.uf,
          municipio: data.municipio,
        });
      }

      return res.status(404).json({ error: "CNPJ não encontrado na base de dados pública." });
    } catch (error) {
      console.error("Erro ao consultar CNPJ:", error);
      return res.status(500).json({ error: "Erro ao consultar serviço de CNPJ." });
    }
  });

  // API Route: AI Text Refinement for Support Reports
  app.post("/api/ai/refine", async (req, res) => {
    try {
      const { text, fieldType, context } = req.body;
      if (!text || typeof text !== "string") {
        return res.status(400).json({ error: "Texto para aprimoramento é obrigatório." });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          error: "Chave de API Gemini (GEMINI_API_KEY) não configurada.",
        });
      }

      const ai = new GoogleGenAI({ apiKey });

      let systemPrompt = "";
      if (fieldType === "fato") {
        systemPrompt = `Você é um assistente de suporte técnico em TI especialista em redação técnica de relatórios.
O usuário vai fornecer anotações brutos sobre o "FATO CONSTATADO" (o problema relatado ou identificado no cliente).
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
      return res.json({ refinedText });
    } catch (error) {
      console.error("Erro na API Gemini:", error);
      return res.status(500).json({
        error: error instanceof Error ? error.message : "Erro ao processar texto com Inteligência Artificial.",
      });
    }
  });

  // Vite Middleware in Dev Mode
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor rodando em http://0.0.0.0:${PORT}`);
  });
}

startServer();
