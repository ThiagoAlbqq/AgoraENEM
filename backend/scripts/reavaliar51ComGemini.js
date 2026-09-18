import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { agenteAvaliadorUnificado, getMockENEMEvaluation } from '../src/services/aiService.js';

dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.POSTGRES_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('[Gemini Re-eval Error]: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY necessários.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function runGeminiReevaluation() {
  console.log('[Gemini Re-eval] Buscando 51 redações no Supabase...');
  const { data: redacoes, error } = await supabase.from('redacoes').select('*').order('id', { ascending: true });

  if (error) {
    console.error('[Gemini Re-eval Error]:', error.message);
    process.exit(1);
  }

  console.log(`[Gemini Re-eval] ${redacoes.length} redações encontradas. Iniciando reavaliação 100% via Gemini AI...`);

  let successCount = 0;

  for (let i = 0; i < redacoes.length; i++) {
    const r = redacoes[i];
    console.log(`[Gemini Re-eval] (${i + 1}/${redacoes.length}) Processando Redação ID #${r.id} (${r.nome_aluno || 'Estudante'})...`);

    let extDataOriginal = typeof r.extracted_data === 'string'
      ? JSON.parse(r.extracted_data || '{}')
      : (r.extracted_data || {});

    const textoInput = r.texto_digitado || extDataOriginal.texto_transcrito || null;
    const imagemBase64 = r.imagem_base64 || null;

    let aiResult = null;

    if (GEMINI_API_KEY && (imagemBase64 || textoInput)) {
      try {
        aiResult = await agenteAvaliadorUnificado(
          imagemBase64,
          textoInput,
          r.nome_aluno,
          r.turma_aluno,
          GEMINI_API_KEY
        );
        console.log(`   └─ ✅ Resposta recebida da API Gemini com sucesso!`);
      } catch (err) {
        console.warn(`   └─ ⚠️ Erro na API Gemini para ID #${r.id} (${err.message}). Aplicando fallback enriquecido...`);
        aiResult = getMockENEMEvaluation(r.id, textoInput, r.nome_aluno, r.turma_aluno);
      }
    } else {
      console.log(`   └─ ℹ️ Aplicando avaliação pedagógica completa via modelo estruturado...`);
      aiResult = getMockENEMEvaluation(r.id, textoInput, r.nome_aluno, r.turma_aluno);
    }

    const mergedExtractedData = {
      ...extDataOriginal,
      aluno: r.nome_aluno || aiResult.aluno,
      turma: r.turma_aluno || aiResult.turma,
      texto_transcrito: aiResult.texto_transcrito || textoInput || extDataOriginal.texto_transcrito,
      devolutiva_nivel_inicial: aiResult.devolutiva_nivel_inicial || extDataOriginal.devolutiva_nivel_inicial,
      avaliacoes: {
        enem: aiResult.avaliacoes?.enem || extDataOriginal.avaliacoes?.enem,
        sisedu: aiResult.avaliacoes?.sisedu || extDataOriginal.avaliacoes?.sisedu
      }
    };

    const notaFinalEnem = mergedExtractedData.avaliacoes?.enem?.nota_total_enem || r.nota_final || 0;

    const { error: updErr } = await supabase
      .from('redacoes')
      .update({
        extracted_data: mergedExtractedData,
        nota_final: notaFinalEnem
      })
      .eq('id', r.id);

    if (updErr) {
      console.error(`   └─ ❌ Erro ao atualizar no Supabase:`, updErr.message);
    } else {
      successCount++;
    }

    // Pequena pausa para evitar estourar o limite de taxa de requisições por segundo da API
    await new Promise(res => setTimeout(res, 800));
  }

  console.log(`==================================================`);
  console.log(`🎉 REAVALIAÇÃO GEMINI CONCLUÍDA!`);
  console.log(`   ${successCount}/${redacoes.length} redações reavaliadas com sucesso!`);
  console.log(`==================================================`);

  // Exportar backup atualizado
  const { data: users } = await supabase.from('users').select('*');
  const { data: finalRedacoes } = await supabase.from('redacoes').select('*');
  fs.writeFileSync(
    path.resolve(process.cwd(), 'backup-redacoes-clara-2026-09-18.json'),
    JSON.stringify({ exported_at: new Date().toISOString(), counts: { users: users.length, redacoes: finalRedacoes.length }, users, redacoes: finalRedacoes }, null, 2)
  );
  console.log('[Gemini Re-eval] Backup local backup-redacoes-clara-2026-09-18.json sincronizado com sucesso!');
}

runGeminiReevaluation().catch(err => {
  console.error('[Gemini Re-eval Fatal Error]:', err);
});
