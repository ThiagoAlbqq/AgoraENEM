import { db } from '../db/db';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '/api/corrigir';

/**
 * Service to sync and evaluate pending offline student essays with the backend API (ENEM x Sisedu).
 */
export async function syncOfflineDocuments() {
  try {
    const unsyncedDocs = await db.redacoes.filter(doc => !doc.is_synced).toArray();

    if (unsyncedDocs.length === 0) {
      return { successCount: 0, errorCount: 0, results: [], message: 'Nenhuma redação pendente de correção.' };
    }

    console.log(`[SyncService] Iniciando avaliação em chunks de ${unsyncedDocs.length} redação(ões) pendente(s)...`);

    // Chunk array into max 2 documents per HTTP payload to guarantee payload stays < 4.5MB (Vercel limit)
    const CHUNK_SIZE = 2;
    const chunks = [];
    for (let i = 0; i < unsyncedDocs.length; i += CHUNK_SIZE) {
      chunks.push(unsyncedDocs.slice(i, i + CHUNK_SIZE));
    }

    let successCount = 0;
    let errorCount = 0;
    const allResults = [];

    for (let c = 0; c < chunks.length; c++) {
      const chunkDocs = chunks[c];
      console.log(`[SyncService] Sincronizando Lote ${c + 1}/${chunks.length} (${chunkDocs.length} redações)...`);

      const response = await fetch(BACKEND_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ redacoes: chunkDocs }),
      });

      if (!response.ok) {
        throw new Error(`Servidor retornou status ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const chunkResults = data.results || [];
      allResults.push(...chunkResults);

      for (const item of chunkResults) {
        if (item.status === 'success' && item.extracted) {
          const ext = item.extracted;
          const currentDoc = chunkDocs.find(d => d.id === item.id);

          const finalStudentName = currentDoc?.nome_aluno || ext.aluno || null;
          const finalTurma = currentDoc?.turma_aluno || ext.turma || null;
          const isNameDetected = !!finalStudentName;

          const notaTotalEnem = ext.avaliacoes?.enem?.nota_total_enem ?? ext.nota_final ?? 0;

          await db.redacoes.update(item.id, {
            is_synced: true,
            extracted_data: {
              ...ext,
              aluno: finalStudentName,
              turma: finalTurma
            },
            nome_aluno: finalStudentName,
            turma_aluno: finalTurma,
            nome_detectado: isNameDetected,
            nota_final: notaTotalEnem
          });
          successCount++;
        } else {
          console.error(`[SyncService] Erro ao corrigir redação ID ${item.id}:`, item.error);
          errorCount++;
        }
      }
    }

    return {
      successCount,
      errorCount,
      results: allResults,
      message: `Correção cruzada concluída: ${successCount} avaliada(s) com sucesso, ${errorCount} falha(s).`
    };
  } catch (error) {
    console.error('[SyncService] Operação de correção falhou:', error);
    throw error;
  }
}
