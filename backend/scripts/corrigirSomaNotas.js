import { supabase, isSupabaseConfigured } from '../src/config/supabaseClient.js';
import db from '../src/config/db.js';

async function fixAllScores() {
  console.log('--- INICIANDO AUDITORIA E CORREÇÃO DE NOTAS NO SUPABASE ---');
  if (!isSupabaseConfigured) {
    console.error('Supabase não configurado.');
    return;
  }

  const { data: rows, error } = await supabase.from('redacoes').select('*');
  if (error) {
    console.error('Erro ao buscar redações:', error);
    return;
  }

  let fixedCount = 0;

  for (const r of rows) {
    let ext = r.extracted_data;
    if (typeof ext === 'string') {
      try { ext = JSON.parse(ext); } catch(e) { ext = {}; }
    }
    if (!ext || typeof ext !== 'object') ext = {};

    const enem = ext.avaliacoes?.enem;
    if (enem) {
      const c1 = Number(enem.competencia_1?.nota ?? 0);
      const c2 = Number(enem.competencia_2?.nota ?? 0);
      const c3 = Number(enem.competencia_3?.nota ?? 0);
      const c4 = Number(enem.competencia_4?.nota ?? 0);
      const c5 = Number(enem.competencia_5?.nota ?? 0);
      const sum = c1 + c2 + c3 + c4 + c5;

      if (sum > 0) {
        const needsUpdate = (r.nota_final !== sum || enem.nota_total_enem !== sum || ext.nota_final !== sum);
        if (needsUpdate) {
          console.log(`Corrigindo ID ${r.id} (${r.nome_aluno}): C1=${c1}, C2=${c2}, C3=${c3}, C4=${c4}, C5=${c5} -> Soma Correta = ${sum} (estava ${r.nota_final})`);
          
          enem.nota_total_enem = sum;
          ext.nota_final = sum;

          const { error: updErr } = await supabase
            .from('redacoes')
            .update({
              nota_final: sum,
              extracted_data: ext
            })
            .eq('id', r.id);

          if (updErr) {
            console.error(`Erro ao atualizar ID ${r.id}:`, updErr.message);
          } else {
            fixedCount++;
          }
        }
      }
    }
  }

  console.log(`--- CORREÇÃO CONCLUÍDA: ${fixedCount} redação(ões) corrigida(s) no Supabase! ---`);

  // Sincroniza também no SQLite se presente
  if (db) {
    try {
      const sqliteRows = db.prepare('SELECT id, nota_final, extracted_data FROM redacoes').all();
      let sqliteFixed = 0;
      for (const row of sqliteRows) {
        let ext = {};
        try { ext = JSON.parse(row.extracted_data || '{}'); } catch(e) {}
        const enem = ext.avaliacoes?.enem;
        if (enem) {
          const c1 = Number(enem.competencia_1?.nota ?? 0);
          const c2 = Number(enem.competencia_2?.nota ?? 0);
          const c3 = Number(enem.competencia_3?.nota ?? 0);
          const c4 = Number(enem.competencia_4?.nota ?? 0);
          const c5 = Number(enem.competencia_5?.nota ?? 0);
          const sum = c1 + c2 + c3 + c4 + c5;
          if (sum > 0 && (row.nota_final !== sum || enem.nota_total_enem !== sum)) {
            enem.nota_total_enem = sum;
            ext.nota_final = sum;
            db.prepare('UPDATE redacoes SET nota_final = ?, extracted_data = ? WHERE id = ?').run(sum, JSON.stringify(ext), row.id);
            sqliteFixed++;
          }
        }
      }
      console.log(`SQLite: ${sqliteFixed} registros corrigidos.`);
    } catch(e) {
      console.warn('SQLite fix notice:', e.message);
    }
  }
}

fixAllScores();
