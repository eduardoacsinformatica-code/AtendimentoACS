import { ReportData } from "../../src/types";

import { validateMovideskPayload } from "../../src/utils/movideskParser";

export const maxDuration = 30;
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido. Use POST." });
  }

  try {
    const body: Partial<ReportData> & { token?: string } = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const {
      ticket,
      token: userToken,
      cliente,
      acompanhado,
      fato,
      diagnostico,
      observacoes,
      fotos,
      assinaturaCliente,
      status,
      tecnico
    } = body;

    const token = userToken || process.env.MOVIDESK_API_TOKEN || "75762c40-5399-4b83-b958-c265fbf5d6fb";

    if (!ticket) {
      return res.status(400).json({ error: "Número do Ticket/Chamado é obrigatório para exportação." });
    }

    const cleanId = String(ticket).replace(/^[#\s]+/, "").trim();
    const numVal = Number(cleanId);
    const isValidInt32 = !isNaN(numVal) && numVal > 0 && numVal <= 2147483647 && Number.isInteger(numVal);
    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      "Accept": "application/json",
      "Content-Type": "application/json",
    };

    let targetNumericId: number | null = null;

    // 1. Try protocol lookup first
    try {
      const protocolUrl = `https://api.movidesk.com/public/v1/tickets?token=${encodeURIComponent(
        token
      )}&$filter=${encodeURIComponent(`protocol eq '${cleanId}'`)}`;

      const protocolRes = await fetch(protocolUrl, { headers: { Accept: "application/json" } });
      if (protocolRes.ok) {
        const protocolData = await protocolRes.json();
        if (Array.isArray(protocolData) && protocolData.length > 0 && protocolData[0].id) {
          targetNumericId = protocolData[0].id;
        }
      }
    } catch (err) {
      console.warn("Protocol ticket lookup failed in api/movidesk/export.ts:", err);
    }

    // 2. Try ID filter lookup if not found
    if (!targetNumericId && isValidInt32) {
      try {
        const idFilterUrl = `https://api.movidesk.com/public/v1/tickets?token=${encodeURIComponent(
          token
        )}&$filter=${encodeURIComponent(`id eq ${cleanId}`)}`;

        const idRes = await fetch(idFilterUrl, { headers: { Accept: "application/json" } });
        if (idRes.ok) {
          const idData = await idRes.json();
          if (Array.isArray(idData) && idData.length > 0 && idData[0].id) {
            targetNumericId = idData[0].id;
          }
        }
      } catch (err) {
        console.warn("ID filter ticket lookup failed in api/movidesk/export.ts:", err);
      }
    }

    // 3. Try direct ID param lookup
    if (!targetNumericId && isValidInt32) {
      try {
        const directUrl = `https://api.movidesk.com/public/v1/tickets?token=${encodeURIComponent(
          token
        )}&id=${encodeURIComponent(cleanId)}`;

        const directRes = await fetch(directUrl, { headers: { Accept: "application/json" } });
        if (directRes.ok) {
          const directData = await directRes.json();
          const candidate = Array.isArray(directData) ? directData[0] : directData;
          if (candidate && candidate.id) {
            targetNumericId = candidate.id;
          }
        }
      } catch (err) {
        console.warn("Direct ticket lookup failed in api/movidesk/export.ts:", err);
      }
    }

    if (!targetNumericId) {
      return res.status(404).json({ error: `Chamado #${cleanId} não foi localizado no Movidesk para atualização.` });
    }

    // Build rich HTML action description
    const photosList = Array.isArray(fotos) ? fotos : [];
    const htmlAction = `
      <div style="font-family: Arial, sans-serif; font-size: 14px; color: #1e293b; line-height: 1.6; border: 1px solid #cbd5e0; border-radius: 8px; padding: 16px; background-color: #f8fafc; max-width: 700px;">
        <div style="background-color: #0f172a; color: #ffffff; padding: 10px 14px; border-radius: 6px; margin-bottom: 14px;">
          <h3 style="margin: 0; font-size: 15px; font-weight: bold; color: #38bdf8;">
            📋 LAUDO DE ATENDIMENTO TÉCNICO DE CAMPO
          </h3>
          ${tecnico ? `<span style="font-size: 12px; color: #94a3b8;">Técnico Responsável: ${tecnico}</span>` : ''}
        </div>

        <p style="margin-bottom: 12px;">
          <strong>👤 Responsável no Cliente (Acompanhante):</strong><br/>
          <span style="color: #0f172a; font-size: 14px; font-weight: 600;">${acompanhado || 'Não informado'}</span>
        </p>

        <div style="margin-bottom: 14px;">
          <strong>🔍 Fato Constatado:</strong>
          <div style="background-color: #ffffff; padding: 12px; border-radius: 6px; border: 1px solid #cbd5e0; margin-top: 4px; white-space: pre-wrap; font-size: 13px;">${fato || 'Não informado'}</div>
        </div>

        <div style="margin-bottom: 14px;">
          <strong>🛠️ Diagnóstico e Ações Realizadas:</strong>
          <div style="background-color: #ffffff; padding: 12px; border-radius: 6px; border: 1px solid #cbd5e0; margin-top: 4px; white-space: pre-wrap; font-size: 13px;">${diagnostico || 'Nenhuma ação registrada'}</div>
        </div>

        ${observacoes ? `
        <div style="margin-bottom: 14px;">
          <strong>📝 Observações e Recomendações:</strong>
          <div style="background-color: #ffffff; padding: 12px; border-radius: 6px; border: 1px solid #cbd5e0; margin-top: 4px; white-space: pre-wrap; font-size: 13px;">${observacoes}</div>
        </div>
        ` : ''}

        ${photosList.length > 0 ? `
        <div style="margin-bottom: 14px;">
          <strong>📷 Fotos e Evidências (${photosList.length}):</strong>
          <div style="margin-top: 8px;">
            ${photosList.map((foto: string, idx: number) => `
              <div style="margin-bottom: 10px;">
                <p style="font-size: 11px; color: #64748b; margin: 0 0 2px 0;">Evidência #${idx + 1}:</p>
                <img src="${foto}" alt="Evidência ${idx + 1}" style="max-width: 100%; max-height: 350px; border-radius: 6px; border: 1px solid #cbd5e0;" />
              </div>
            `).join('')}
          </div>
        </div>
        ` : '<p style="margin-bottom: 14px; font-size: 13px;"><strong>📷 Fotos e Evidências:</strong> Nenhuma foto anexada.</p>'}

        <div style="margin-top: 16px; padding-top: 12px; border-top: 2px dashed #cbd5e0;">
          <strong>✍️ Assinatura Digital do Cliente:</strong>
          ${assinaturaCliente ? `
            <p style="font-size: 12px; color: #475569; margin: 4px 0 8px 0;">Coletada digitalmente no local por <strong>${acompanhado || cliente || 'Cliente'}</strong></p>
            <div style="background: #ffffff; padding: 8px; display: inline-block; border-radius: 6px; border: 1px solid #cbd5e0;">
              <img src="${assinaturaCliente}" alt="Assinatura do Cliente" style="max-width: 320px; max-height: 120px; display: block;" />
            </div>
          ` : '<span style="color: #64748b; font-style: italic;"> (Não coletada)</span>'}
        </div>
      </div>
    `;

    // Movidesk PATCH body
    let patchBody: any = {
      id: targetNumericId,
      actions: [
        {
          type: 2,
          actionType: "Public",
          description: htmlAction,
          origin: 2,
        },
      ],
    };

    let statusAttempted = false;
    if (status) {
      const statusMap: Record<string, string> = {
        'CONCLUIDO': 'Concluído',
        'EM_ANDAMENTO': 'Em atendimento',
        'PENDENTE': 'Pendente',
        'AGUARDANDO_CLIENTE': 'Aguardando cliente',
        'AGUARDANDO_PECA': 'Aguardando peça',
      };
      if (statusMap[status]) {
        patchBody.status = statusMap[status];
        statusAttempted = true;
      }
    }

    patchBody = validateMovideskPayload(patchBody);

    const updateUrl = `https://api.movidesk.com/public/v1/tickets?token=${encodeURIComponent(token)}&id=${targetNumericId}`;
    let updateRes = await fetch(updateUrl, {
      method: "PATCH",
      headers,
      body: JSON.stringify(patchBody),
    });

    let statusUpdated = statusAttempted;

    // If PATCH failed and we tried updating status, retry without status to guarantee Laudo action is added
    if (!updateRes.ok && patchBody.status) {
      delete patchBody.status;
      statusUpdated = false;

      const fallbackBody = validateMovideskPayload(patchBody);
      updateRes = await fetch(updateUrl, {
        method: "PATCH",
        headers,
        body: JSON.stringify(fallbackBody),
      });
    }

    if (!updateRes.ok) {
      const finalErr = await updateRes.text().catch(() => "");
      console.error("Erro no PATCH Movidesk:", updateRes.status, finalErr);
      return res.status(200).json({
        success: false,
        error: `Movidesk respondeu com status ${updateRes.status}: ${finalErr || 'Falha ao atualizar chamado no Movidesk.'}`,
      });
    }

    return res.status(200).json({
      success: true,
      ticket: cleanId,
      message: statusUpdated
        ? `Laudo e dados enviados com sucesso para o Chamado #${cleanId} no Movidesk!`
        : `Laudo e evidências incluídos com sucesso no Chamado #${cleanId}!`,
    });
  } catch (error) {
    console.error("Erro ao exportar laudo para o Movidesk:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Erro interno ao enviar para o Movidesk.",
    });
  }
}
