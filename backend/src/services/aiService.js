import { GoogleGenerativeAI } from '@google/generative-ai';
import { generateContentWithFallback } from '../config/gemini.js';

/**
 * Helper to safely clean and parse JSON responses from AI models
 */
export function cleanAndParseJSON(rawText) {
  let cleaned = rawText.trim();

  // Remove markdown codeblock wrappers if present
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  // Extract JSON object if surrounded by extra commentary
  const startIdx = cleaned.indexOf('{');
  const endIdx = cleaned.lastIndexOf('}');
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    cleaned = cleaned.substring(startIdx, endIdx + 1);
  }

  try {
    return JSON.parse(cleaned);
  } catch (firstErr) {
    console.warn(`[JSON Parser] Tentativa 1 de parse falhou (${firstErr.message}). Sanitizando JSON...`);

    let sanitized = cleaned
      // Escape raw unescaped control characters
      .replace(/[\u0000-\u0009\u000B\u000C\u000E-\u001F]/g, '')
      // Remove trailing commas before closing braces/brackets
      .replace(/,\s*([}\]])/g, '$1')
      // Fix invalid backslash escapes (e.g., \x, \a)
      .replace(/\\([^"\\\/bfnrtu])/g, '$1')
      .replace(/\\'/g, "'");

    try {
      return JSON.parse(sanitized);
    } catch (secondErr) {
      console.warn(`[JSON Parser] Tentativa 2 de parse falhou (${secondErr.message}). Sanitizando aspas e caracteres remanescentes...`);

      try {
        const ultraSanitized = sanitized
          .replace(/[\u007F-\u009F]/g, '');
        return JSON.parse(ultraSanitized);
      } catch (thirdErr) {
        console.error(`[JSON Parser] ❌ Falha crítica no parsing do JSON: ${thirdErr.message}`);
        throw thirdErr;
      }
    }
  }
}

/**
 * AGENTE ÚNICO UNIFICADO: Transcrição OCR + Banca Avaliadora Pedagógica (ENEM x Sisedu)
 */
export async function agenteAvaliadorUnificado(imagemBase64, textoDigitado, nomeFornecido, turmaFornecida, apiKey) {
  const genAI = new GoogleGenerativeAI(apiKey);

  const systemInstruction = `Você é um perito em transcrição paleográfica e um avaliador educacional sênior especialista na Matriz do ENEM e Rubricas Sisedu (Projeto Ágora Escolar).

SUA MISSÃO EM 1 ÚNICA EXECUÇÃO:
1. **TRANSCRIÇÃO 100% INTEGRAL ("texto_transcrito"):** Se uma imagem de redação manuscrita for fornecida, transcreva 100% do texto palavra por palavra, preservando a estrutura de parágrafos. NUNCA resuma, NUNCA omita frases e NUNCA use reticências (...) para abreviar. Se for texto digitado, preserve-o integralmente no campo "texto_transcrito".
2. **IDENTIFICAÇÃO DO ALUNO:** Se o nome do aluno ou turma não forem fornecidos, tente identificá-los no cabeçalho/margem da folha nos campos "aluno" e "turma". Se não houver nome legível, defina como null.
3. **MATRIZ ENEM (Notas de 0 a 200 em múltiplos de 40: 0, 40, 80, 120, 160, 200 por competência):**
   - Competência 1: Domínio da modalidade escrita formal.
   - Competência 2: Compreensão do tema e aplicação de repertório sociocultural.
   - Competência 3: Seleção, relação, organização e interpretação de informações (Argumentação).
   - Competência 4: Mecanismos linguísticos para a argumentação (Coesão e Coerência).
   - Competência 5: Proposta de intervenção respeitando os direitos humanos.
4. **MATRIZ SISEDU (Projeto Ágora - Níveis: "Inicial", "Em Desenvolvimento" ou "Avançado"):**
   - Dimensão Discursiva: clareza_tese, argumentacao, repertorio.
   - Dimensão Ético-Moral: empatia_alteridade, justificacao_moral, conclusao_critica.
5. **CITAÇÃO DIRETA OBRIGATÓRIA ("citacao_texto"):** Para cada competência e critério, extraia e cite um trecho exato do texto do aluno que comprove sua avaliação.

FORMATO DE SAÍDA OBRIGATÓRIO (JSON estrito):
{
  "aluno": "${nomeFornecido || 'Nome do Aluno ou null'}",
  "turma": "${turmaFornecida || 'Turma do Aluno ou null'}",
  "texto_transcrito": "Texto integral transcrito palavra por palavra...",
  "avaliacoes": {
    "enem": {
      "competencia_1": { "nota": 160, "citacao_texto": "trecho exato do aluno", "justificativa": "..." },
      "competencia_2": { "nota": 200, "citacao_texto": "trecho exato do aluno", "justificativa": "..." },
      "competencia_3": { "nota": 160, "citacao_texto": "trecho exato do aluno", "justificativa": "..." },
      "competencia_4": { "nota": 160, "citacao_texto": "trecho exato do aluno", "justificativa": "..." },
      "competencia_5": { "nota": 160, "citacao_texto": "trecho exato do aluno", "justificativa": "..." },
      "nota_total_enem": 840
    },
    "sisedu_agora": {
      "dimensao_discursiva": {
        "clareza_tese": { "nivel": "Em Desenvolvimento", "citacao_texto": "trecho exato", "justificativa": "..." },
        "argumentacao": { "nivel": "Avançado", "citacao_texto": "trecho exato", "justificativa": "..." },
        "repertorio": { "nivel": "Avançado", "citacao_texto": "trecho exato", "justificativa": "..." }
      },
      "dimensao_etico_moral": {
        "empatia_alteridade": { "nivel": "Em Desenvolvimento", "citacao_texto": "trecho exato", "justificativa": "..." },
        "justificacao_moral": { "nivel": "Em Desenvolvimento", "citacao_texto": "trecho exato", "justificativa": "..." },
        "conclusao_critica": { "nivel": "Avançado", "citacao_texto": "trecho exato", "justificativa": "..." }
      }
    }
  }
}`;

  const promptText = `Realize a transcrição integral e a avaliação pedagógica cruzada (ENEM x Sisedu).
Aluno Identificado: ${nomeFornecido || 'Não especificado (extrair do cabeçalho se houver)'}
Turma Identificada: ${turmaFornecida || 'Não especificada'}
${textoDigitado ? `\nTEXTO DIGITADO:\n"""\n${textoDigitado}\n"""` : ''}`;

  let contents = [];

  if (imagemBase64 && imagemBase64.trim().length > 0) {
    const base64Data = imagemBase64.includes('base64,')
      ? imagemBase64.split('base64,')[1]
      : imagemBase64;
    const mimeTypeMatch = imagemBase64.match(/^data:(image\/[a-zA-Z+]+);base64,/);
    const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/jpeg';

    contents = [
      { inlineData: { data: base64Data, mimeType } },
      promptText
    ];
  } else {
    contents = promptText;
  }

  const result = await generateContentWithFallback(
    genAI,
    {
      systemInstruction,
      generationConfig: { responseMimeType: 'application/json' }
    },
    contents
  );

  const responseText = result.response.text();
  console.log(`[Agente Único IA] Transcrição OCR e Avaliação pedagógica concluídas com sucesso.`);
  const parsed = cleanAndParseJSON(responseText);

  if (nomeFornecido) parsed.aluno = nomeFornecido;
  if (turmaFornecida) parsed.turma = turmaFornecida;
  if (textoDigitado && (!parsed.texto_transcrito || parsed.texto_transcrito.length < textoDigitado.length)) {
    parsed.texto_transcrito = textoDigitado;
  }

  return parsed;
}

/**
 * Generates realistic Mock ENEM x Sisedu essay evaluations
 */
export function getMockENEMEvaluation(id, textoDigitado, nomeFornecido, turmaFornecida) {
  const isIdentified = !!nomeFornecido || Number(id) % 2 !== 0;

  const mockNames = [
    'Mariana Souza de Oliveira',
    'Lucas Gabriel Ferreira',
    'Beatriz Mendes da Silva',
    'Gabriel Santos Rocha'
  ];

  const selectedName = nomeFornecido || (isIdentified
    ? mockNames[Math.floor(Math.random() * mockNames.length)]
    : null);

  const selectedTurma = turmaFornecida || (isIdentified ? '3º Ano A - Ensino Médio' : null);

  const sampleTexts = [
    "No contexto da sociedade contemporânea, os desafios para a preservação da biodiversidade na Amazônia tornam-se cada vez mais prementes. Em primeira análise, cabe destacar que a falta de fiscalização governamental intensifica o desmatamento ilegal. Ademais, o sociólogo Zygmunt Bauman, em sua obra 'Modernidade Líquida', ressalta a fragilidade das instituições no combate às crises socioambientais. Portanto, medidas urgentes são necessárias para mitigar essa problemática.",
    "A democratização do acesso ao cinema no Brasil apresenta entraves históricos e socioeconômicos. Sob essa ótica, verifica-se que o alto custo dos ingressos e a concentração das salas de exibição em grandes centros urbanos marginalizam a população periférica. Como dizia Kant, o ser humano é aquilo que a educação faz dele, evidenciando a necessidade de ampliação cultural no país."
  ];

  const transcriptText = textoDigitado || `[MODO DEMONSTRAÇÃO - SEM CHAVE DE API ATIVA]\n\n${sampleTexts[Number(id) % sampleTexts.length]}`;

  return {
    aluno: selectedName,
    turma: selectedTurma,
    texto_transcrito: transcriptText,
    avaliacoes: {
      enem: {
        competencia_1: {
          nota: 160,
          citacao_texto: "os desafios para a preservação da biodiversidade na Amazônia tornam-se cada vez mais prementes",
          justificativa: "Demonstra bom domínio da norma culta formal com pontuais vírgulas deslocadas."
        },
        competencia_2: {
          nota: 200,
          citacao_texto: "o sociólogo Zygmunt Bauman, em sua obra 'Modernidade Líquida', ressalta a fragilidade das instituições",
          justificativa: "Excelente repertório sociocultural legitimado e produtivo articulado com a tese."
        },
        competencia_3: {
          nota: 160,
          citacao_texto: "a falta de fiscalização governamental intensifica o desmatamento ilegal",
          justificativa: "Projeto de texto estratégico e argumentação bem direcionada em defesa do ponto de vista."
        },
        competencia_4: {
          nota: 160,
          citacao_texto: "Em primeira análise, cabe destacar... Ademais, o sociólogo... Portanto, medidas urgentes",
          justificativa: "Repertório coesivo diversificado com operadores argumentativos interparágrafos."
        },
        competencia_5: {
          nota: 160,
          citacao_texto: "medidas urgentes são necessárias para mitigar essa problemática",
          justificativa: "Proposta de intervenção com agente e ação definidos, com detalhamento moderado."
        },
        nota_total_enem: 840
      },
      sisedu_agora: {
        dimensao_discursiva: {
          clareza_tese: {
            nivel: "Avançado",
            citacao_texto: "os desafios para a preservação da biodiversidade na Amazônia tornam-se cada vez mais prementes",
            justificativa: "Apresenta tese clara, crítica e problematizadora desde a introdução."
          },
          argumentacao: {
            nivel: "Em Desenvolvimento",
            citacao_texto: "a falta de fiscalização governamental intensifica o desmatamento ilegal",
            justificativa: "Argumentos organizados de forma coerente, porém demandam maior aprofundamento empírico."
          },
          repertorio: {
            nivel: "Avançado",
            citacao_texto: "Zygmunt Bauman, em sua obra 'Modernidade Líquida'",
            justificativa: "Uso de referência sociológica e conceitual interdisciplinar de alto nível."
          }
        },
        dimensao_etico_moral: {
          empatia_alteridade: {
            nivel: "Em Desenvolvimento",
            citacao_texto: "fragilidade das instituições no combate às crises socioambientais",
            justificativa: "Demonstra sensibilidade com as populações atingidas e perspectiva socioambiental."
          },
          justificacao_moral: {
            nivel: "Em Desenvolvimento",
            citacao_texto: "a falta de fiscalização governamental intensifica o desmatamento",
            justificativa: "Justificativas racionais baseadas na responsabilidade estatal e ética coletiva."
          },
          conclusao_critica: {
            nivel: "Avançado",
            citacao_texto: "medidas urgentes são necessárias para mitigar essa problemática",
            justificativa: "Propostas concretas, éticas e alinhadas aos Direitos Humanos."
          }
        }
      }
    }
  };
}
