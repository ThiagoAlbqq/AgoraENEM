import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.POSTGRES_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('[Sisedu Migration Error]: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY necessários.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function buildSiseduFromEnem(enemData = {}, siseduAgoraData = {}, textoTranscrito = '') {
  const c1 = enemData.competencia_1?.nota || 160;
  const c2 = enemData.competencia_2?.nota || 160;
  const c3 = enemData.competencia_3?.nota || 160;
  const c4 = enemData.competencia_4?.nota || 160;
  const c5 = enemData.competencia_5?.nota || 160;

  const scoreToNivel = (score) => {
    if (score >= 180) return 'Adequado';
    if (score >= 120) return 'Intermediário';
    return 'Inicial';
  };

  const dimDisc = siseduAgoraData.dimensao_discursiva || {};

  const d05Nivel = scoreToNivel(c2);
  const d06Nivel = dimDisc.clareza_tese?.nivel || scoreToNivel(c2);
  const d12Nivel = scoreToNivel(c4);
  const d13Nivel = dimDisc.clareza_tese?.nivel || scoreToNivel(c3);
  const d14Nivel = scoreToNivel(c3);
  const d15Nivel = dimDisc.argumentacao?.nivel === 'Avançado' ? 'Intermediário' : (c3 < 160 ? 'Inicial' : 'Intermediário');
  const d16Nivel = dimDisc.argumentacao?.nivel || scoreToNivel(c3);
  const d17Nivel = scoreToNivel(c1);
  const d18Nivel = scoreToNivel(c1);

  const descritores = {
    D05: {
      nome: 'Interpretação Gráfica/Textual',
      nivel: d05Nivel,
      citacao_texto: enemData.competencia_2?.citacao_texto || 'Repertório sociocultural motivador',
      justificativa: 'Compreensão da proposta e interpretação dos textos de apoio para a problematização.'
    },
    D06: {
      nome: 'Identificação do Tema/Tese',
      nivel: d06Nivel,
      citacao_texto: dimDisc.clareza_tese?.citacao_texto || enemData.competencia_2?.citacao_texto || 'Delimitação do tema na introdução',
      justificativa: 'Identificação clara da tese problematizadora na introdução da redação.'
    },
    D12: {
      nome: 'Coesão e Substituição Lexical',
      nivel: d12Nivel,
      citacao_texto: enemData.competencia_4?.citacao_texto || 'Uso de articuladores e anáforas',
      justificativa: 'Encadeamento de ideias por meio de substituições pronominais e variados conectivos.'
    },
    D13: {
      nome: 'Localização da Tese Central',
      nivel: d13Nivel,
      citacao_texto: dimDisc.clareza_tese?.citacao_texto || enemData.competencia_3?.citacao_texto || 'Tese principal formulada',
      justificativa: 'Localização objetiva da tese e posicionamento crítico assumido no texto.'
    },
    D14: {
      nome: 'Distinção de Partes Principais/Secundárias',
      nivel: d14Nivel,
      citacao_texto: enemData.competencia_3?.citacao_texto || 'Hierarquização dos argumentos',
      justificativa: 'Organização em tópicos frasais centrais secundados por fundamentações explicativas.'
    },
    D15: {
      nome: 'Reconhecimento de Posições Distintas',
      nivel: d15Nivel,
      citacao_texto: dimDisc.argumentacao?.citacao_texto || 'Desenvolvimento argumentativo',
      justificativa: 'Reconhecimento de posições antagônicas e capacidade de sustentação crítica de contrapontos.'
    },
    D16: {
      nome: 'Articulação de Tese e Argumentos',
      nivel: d16Nivel,
      citacao_texto: enemData.competencia_3?.citacao_texto || 'Relação tese x argumento',
      justificativa: 'Raciocínio lógico consistente ligando as premissas defensivas à tese central.'
    },
    D17: {
      nome: 'Escolha Vocabular e Estilo',
      nivel: d17Nivel,
      citacao_texto: enemData.competencia_1?.citacao_texto || 'Precisão vocabular formal',
      justificativa: 'Emprego de vocabulário formal, preciso e diversificado na construção dissertativa.'
    },
    D18: {
      nome: 'Pontuação e Recursos Expressivos',
      nivel: d18Nivel,
      citacao_texto: enemData.competencia_1?.citacao_texto || 'Recursos de pontuação e sintaxe',
      justificativa: 'Domínio dos recursos sintáticos e de pontuação na delimitação de períodos complexos.'
    }
  };

  const temInicial = Object.values(descritores).some(d => d.nivel === 'Inicial') || c1 < 140 || c3 < 140;

  let devolutivaInicial = null;
  if (temInicial) {
    devolutivaInicial = `DEVOLUTIVA DE INTERVENÇÃO PEDAGÓGICA (NÍVEL INICIAL - SISEDU):\n1. Diagnóstico: O estudante demonstrou vulnerabilidade na articulação de posições distintas (D15) e/ou precisão sintática/vocabular (D17/D18).\n2. Ação Recomendada para o Professor: Promover oficina de leitura orientada e mapa mental de argumentos opostos sobre a temática.\n3. Meta de Reescrita para o Aluno: Inserir ao menos um conector adversativo/concessivo (ex: 'embora', 'por outro lado') reforçando a contra-argumentação no 2º parágrafo de desenvolvimento.`;
  }

  return {
    sisedu: {
      nivel_global: temInicial ? 'Inicial' : (c1 >= 160 && c3 >= 160 ? 'Adequado' : 'Intermediário'),
      descritores
    },
    devolutiva_nivel_inicial: devolutivaInicial
  };
}

async function reavaliarRedacoes51() {
  console.log('[SISEDU Batch] Buscando redações no Supabase...');
  const { data: redacoes, error } = await supabase.from('redacoes').select('*');

  if (error) {
    console.error('[SISEDU Batch Error]:', error.message);
    process.exit(1);
  }

  console.log(`[SISEDU Batch] Encontradas ${redacoes.length} redações no banco central.`);

  let updatedCount = 0;

  for (const r of redacoes) {
    let extData = typeof r.extracted_data === 'string'
      ? JSON.parse(r.extracted_data || '{}')
      : (r.extracted_data || {});

    const enemData = extData.avaliacoes?.enem || {};
    const siseduAgoraData = extData.avaliacoes?.sisedu_agora || {};
    const textoTranscrito = r.texto_digitado || extData.texto_transcrito || '';

    const { sisedu, devolutiva_nivel_inicial } = buildSiseduFromEnem(enemData, siseduAgoraData, textoTranscrito);

    extData.avaliacoes = {
      ...extData.avaliacoes,
      sisedu
    };

    if (devolutiva_nivel_inicial) {
      extData.devolutiva_nivel_inicial = devolutiva_nivel_inicial;
    }

    const { error: updErr } = await supabase
      .from('redacoes')
      .update({
        extracted_data: extData
      })
      .eq('id', r.id);

    if (updErr) {
      console.error(`[SISEDU Batch Error] ID #${r.id}:`, updErr.message);
    } else {
      updatedCount++;
    }
  }

  console.log(`==================================================`);
  console.log(`🎉 ATUALIZAÇÃO SISEDU D05-D18 CONCLUÍDA COM SUCESSO!`);
  console.log(`   ${updatedCount}/${redacoes.length} redações foram enriquecidas com os Descritores SISEDU e Devolutivas.`);
  console.log(`==================================================`);
}

reavaliarRedacoes51().catch(err => {
  console.error('[SISEDU Batch Fatal Error]:', err);
});
