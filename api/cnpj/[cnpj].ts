export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const cnpjRaw = req.query?.cnpj || req.url?.split('/').pop();
    const cleanCnpj = String(cnpjRaw || '').replace(/\D/g, "");

    if (cleanCnpj.length !== 14) {
      return res.status(400).json({ error: "CNPJ deve conter 14 dígitos." });
    }

    // Try BrasilAPI first
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
      if (response.ok) {
        const data = await response.json();
        return res.status(200).json({
          razao_social: data.razao_social || data.nome_fantasia || "",
          nome_fantasia: data.nome_fantasia || data.razao_social || "",
          cnpj: data.cnpj,
          uf: data.uf,
          municipio: data.municipio,
        });
      }
    } catch (err) {
      console.warn("BrasilAPI failed:", err);
    }

    // Fallback: Minha Receita API
    const fallbackResponse = await fetch(`https://minhareceita.org/${cleanCnpj}`);
    if (fallbackResponse.ok) {
      const data = await fallbackResponse.json();
      return res.status(200).json({
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
}
