import { agenteAvaliadorUnificado, getMockENEMEvaluation } from '../services/aiService.js';

export async function handleCorrection(req, res) {
  const { documents, redacoes } = req.body;
  const itemsToProcess = redacoes || documents;

  if (!itemsToProcess || !Array.isArray(itemsToProcess)) {
    return res.status(400).json({ error: 'Payload must contain a "redacoes" array.' });
  }

  console.log(`[CorrectionController] Recebida solicitação em lote para avaliar ${itemsToProcess.length} redação(ões)...`);

  const apiKey = process.env.GEMINI_API_KEY;
  const results = [];

  for (let i = 0; i < itemsToProcess.length; i++) {
    const item = itemsToProcess[i];
    const { id, imagem_base64, texto_digitado, nome_aluno, turma_aluno } = item;

    if (!imagem_base64 && !texto_digitado) {
      results.push({ id, status: 'error', error: 'Nenhum dado de imagem ou texto foi fornecido.' });
      continue;
    }

    try {
      let extractedData = null;

      if (apiKey && apiKey.trim() !== '') {
        try {
          console.log(`[CorrectionController] [ID ${id}] 🎓 Executando Avaliação Unificada (OCR + ENEM + Sisedu)...`);
          extractedData = await agenteAvaliadorUnificado(imagem_base64, texto_digitado, nome_aluno || null, turma_aluno || null, apiKey);
        } catch (apiErr) {
          console.error(`[CorrectionController] [ID ${id}] ❌ Erro na API Gemini: ${apiErr.message}`);
          results.push({
            id,
            status: 'error',
            error: `Falha na API Gemini (${apiErr.message}). Por favor, aguarde alguns instantes ou verifique sua cota da API.`
          });
          continue;
        }
      } else {
        console.log(`[CorrectionController] [ID ${id}] [MODO DEMONSTRAÇÃO] Nenhuma GEMINI_API_KEY configurada. Gerando avaliação simulada...`);
        extractedData = getMockENEMEvaluation(id, texto_digitado, nome_aluno, turma_aluno);
      }

      if (texto_digitado && (!extractedData.texto_transcrito || extractedData.texto_transcrito.length < texto_digitado.length)) {
        extractedData.texto_transcrito = texto_digitado;
      }

      results.push({
        id,
        status: 'success',
        extracted: extractedData,
        processed_at: new Date().toISOString()
      });

      if (i < itemsToProcess.length - 1) {
        await new Promise(r => setTimeout(r, 1000));
      }
    } catch (error) {
      console.error(`[CorrectionController] Erro ao processar redação ID ${id}:`, error.message);
      results.push({
        id,
        status: 'error',
        error: error.message
      });
    }
  }

  console.log(`[CorrectionController] Concluída avaliação de ${results.length} redação(ões).`);

  return res.status(200).json({
    message: 'Redações avaliadas com sucesso.',
    results
  });
}
