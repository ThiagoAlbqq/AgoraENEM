import Dexie from 'dexie';

// Initialize the Dexie Database for Student Essays (ENEM x Sisedu)
export const db = new Dexie('RedacoesEnemDB');

// Schema definition
db.version(2).stores({
  redacoes: '++id, nome_aluno, turma_aluno, nome_detectado, data_captura, is_synced, nota_final'
});

/**
 * Helper to save a single offline essay (image or text).
 */
export async function saveRedacaoOffline({ imagem_base64, texto_digitado, tipo_input = 'imagem', nome_manual = null, turma_manual = null }) {
  try {
    const id = await db.redacoes.add({
      imagem_base64: imagem_base64 || null,
      texto_digitado: texto_digitado || null,
      tipo_input,
      nome_aluno: nome_manual || null,
      turma_aluno: turma_manual || null,
      nome_detectado: !!nome_manual,
      data_captura: new Date().toISOString(),
      is_synced: false,
      extracted_data: null,
      nota_final: null
    });
    console.log(`[IndexedDB] Redação salva com ID local: ${id}`);
    return id;
  } catch (error) {
    console.error('[IndexedDB] Erro ao salvar redação offline:', error);
    throw error;
  }
}

/**
 * Helper to save multiple essays at once (batch processing).
 */
export async function saveMultipleRedacoesOffline(items) {
  try {
    const records = items.map(item => ({
      imagem_base64: item.imagem_base64 || null,
      texto_digitado: item.texto_digitado || null,
      tipo_input: item.tipo_input || 'imagem',
      nome_aluno: item.nome_manual || null,
      turma_aluno: item.turma_manual || null,
      nome_detectado: !!item.nome_manual,
      data_captura: new Date().toISOString(),
      is_synced: false,
      extracted_data: null,
      nota_final: null
    }));
    await db.redacoes.bulkAdd(records);
    console.log(`[IndexedDB] ${records.length} redação(ões) salvas em lote com sucesso.`);
  } catch (error) {
    console.error('[IndexedDB] Erro ao salvar lote de redações:', error);
    throw error;
  }
}

/**
 * Helper to update student's name and class manually for an unidentified essay.
 */
export async function updateNomeAluno(id, novoNome, novaTurma = null) {
  try {
    const redacao = await db.redacoes.get(id);
    if (redacao) {
      const updatedExtracted = redacao.extracted_data ? {
        ...redacao.extracted_data,
        aluno: novoNome,
        turma: novaTurma || redacao.extracted_data.turma
      } : null;

      await db.redacoes.update(id, {
        nome_aluno: novoNome,
        turma_aluno: novaTurma || redacao.turma_aluno,
        nome_detectado: true,
        extracted_data: updatedExtracted
      });
      console.log(`[IndexedDB] Nome do aluno atualizado para ID ${id}: ${novoNome}`);
    }
  } catch (error) {
    console.warn('[IndexedDB] Aviso ao atualizar nome no IndexedDB:', error);
  }
}

/**
 * Helper to delete an essay from local database.
 */
export async function deleteRedacao(id) {
  try {
    await db.redacoes.delete(id);
    console.log(`[IndexedDB] Redação ID ${id} excluída.`);
  } catch (error) {
    console.error('[IndexedDB] Erro ao excluir redação:', error);
    throw error;
  }
}

/**
 * Helper to clear all local essays from IndexedDB.
 */
export async function clearAllLocalRedacoes() {
  try {
    await db.redacoes.clear();
    console.log('[IndexedDB] Todas as redações locais foram apagadas.');
  } catch (error) {
    console.error('[IndexedDB] Erro ao apagar redações locais:', error);
    throw error;
  }
}

