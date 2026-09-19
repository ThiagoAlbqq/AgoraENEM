import { authService } from './authService';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '/api/corrigir';

/**
 * Direct Cloud Submission & AI Evaluation (No offline IndexedDB storage)
 * Sends images or typed essays directly to /api/corrigir which saves straight to Supabase cloud.
 */
export async function processRedacoesCloud(items, onProgress) {
  if (!items || items.length === 0) {
    return { successCount: 0, errorCount: 0, results: [], message: 'Nenhuma redação fornecida.' };
  }

  const token = authService.getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };

  // Chunk items into max 2 per request to strictly respect Vercel's 4.5MB serverless payload limit
  const CHUNK_SIZE = 2;
  const chunks = [];
  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    chunks.push(items.slice(i, i + CHUNK_SIZE));
  }

  let successCount = 0;
  let errorCount = 0;
  const allResults = [];

  for (let c = 0; c < chunks.length; c++) {
    const chunk = chunks[c];
    if (onProgress) {
      onProgress(c + 1, chunks.length);
    }

    const payload = {
      redacoes: chunk.map((item, idx) => ({
        id: item.id || `upload_${Date.now()}_${idx}`,
        imagem_base64: item.imagem_base64 || null,
        texto_digitado: item.texto_digitado || null,
        tipo_input: item.tipo_input || (item.imagem_base64 ? 'imagem' : 'texto'),
        nome_aluno: item.nome_manual || item.nome_aluno || null,
        turma_aluno: item.turma_manual || item.turma_aluno || null,
        data_captura: new Date().toISOString()
      }))
    };

    const response = await fetch(BACKEND_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Servidor retornou status ${response.status}: ${response.statusText}`);
    }

    let data;
    try {
      const text = await response.text();
      data = JSON.parse(text);
    } catch (parseError) {
      throw new Error('Erro ao processar lote: o servidor não retornou JSON válido.');
    }

    const results = data.results || [];
    allResults.push(...results);

    results.forEach(r => {
      if (r.status === 'success') successCount++;
      else errorCount++;
    });
  }

  return {
    successCount,
    errorCount,
    results: allResults,
    message: `${successCount} redação(ões) avaliada(s) e gravada(s) na nuvem Supabase com sucesso!`
  };
}
