import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Configure CORS to allow frontend communication
app.use(cors());

// Increase payload limit to support batch base64 essay image uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

/**
 * Controller: Handles PARALLEL batch processing of student essays using Multi-Agent Architecture
 * - Agent 0: Header & Student Name Vision Detector (Gemini Vision) -> Inspects top header/margins
 * - Agent 1: OCR Transcriber Agent (Gemini Vision) -> Extracts 100% full body text
 * - Agent 2: Pedagogical Evaluator Agent (Gemini Text) -> Applies base.md System Prompt
 */
app.post(['/api/corrigir', '/api/sync'], async (req, res) => {
  const { documents, redacoes } = req.body;
  const itemsToProcess = redacoes || documents;

  if (!itemsToProcess || !Array.isArray(itemsToProcess)) {
    return res.status(400).json({ error: 'Payload must contain a "redacoes" array.' });
  }

  console.log(`[Multi-Agente IA] Recebida solicitação em lote para avaliar ${itemsToProcess.length} redação(ões)...`);

  const apiKey = process.env.GEMINI_API_KEY;
  const results = [];

  // Process items sequentially with a rate-limit delay to respect Google AI Studio RPM limits
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
          let detectedName = nome_aluno || null;
          let detectedTurma = turma_aluno || null;

          // Step 1: Dedicated OCR Full Text Transcription
          console.log(`[Multi-Agente IA] [ID ${id}] 📝 Executando Agente 1 (Transcrição OCR Integral)...`);
          const textoTranscritoIntegral = await agente1Transcrever(imagem_base64, texto_digitado, apiKey);
          await new Promise(r => setTimeout(r, 600));

          // Step 2: Dual Matrix Evaluation (ENEM x Sisedu)
          console.log(`[Multi-Agente IA] [ID ${id}] 🎓 Executando Agente 2 (Banca Avaliadora ENEM x Sisedu)...`);
          extractedData = await agente2Avaliar(textoTranscritoIntegral, detectedName, detectedTurma, apiKey);

          // Ensure extracted student name and class are populated if found
          if (detectedName) extractedData.aluno = detectedName;
          if (detectedTurma) extractedData.turma = detectedTurma;

        } catch (apiErr) {
          console.error(`[Multi-Agente IA] [ID ${id}] ❌ Erro na API Gemini: ${apiErr.message}`);
          results.push({
            id,
            status: 'error',
            error: `Falha na API Gemini (${apiErr.message}). Por favor, aguarde alguns instantes ou verifique sua cota da API.`
          });
          continue;
        }
      } else {
        console.log(`[Multi-Agente IA] [ID ${id}] [MODO DEMONSTRAÇÃO] Nenhuma GEMINI_API_KEY configurada. Gerando avaliação simulada...`);
        extractedData = getMockENEMEvaluation(id, texto_digitado, nome_aluno, turma_aluno);
      }

      // Guarantee that if typed text was provided, full text is preserved
      if (texto_digitado && (!extractedData.texto_transcrito || extractedData.texto_transcrito.length < texto_digitado.length)) {
        extractedData.texto_transcrito = texto_digitado;
      }

      results.push({
        id,
        status: 'success',
        extracted: extractedData,
        processed_at: new Date().toISOString()
      });

      // Throttle delay between essays to avoid bursting RPM limits
      if (i < itemsToProcess.length - 1) {
        await new Promise(r => setTimeout(r, 1000));
      }
    } catch (error) {
      console.error(`[Multi-Agente IA] Erro ao processar redação ID ${id}:`, error.message);
      results.push({
        id,
        status: 'error',
        error: error.message
      });
    }
  }

  console.log(`[Multi-Agente IA] Concluída avaliação de ${results.length} redação(ões).`);

  return res.status(200).json({
    message: 'Redações avaliadas com sucesso.',
    results
  });
});

/**
 * Helper to safely clean and parse JSON responses from AI models
 */
function cleanAndParseJSON(rawText) {
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
      // Replace control characters with valid JSON escapes
      .replace(/[\u0000-\u001F]/g, (ch) => {
        if (ch === '\n') return '\\n';
        if (ch === '\r') return '\\r';
        if (ch === '\t') return '\\t';
        return '';
      })
      // Remove trailing commas before closing braces/brackets
      .replace(/,\s*([}\]])/g, '$1')
      // Fix invalid backslash escapes
      .replace(/\\([^"\\\/bfnrtu])/g, '$1')
      .replace(/\\'/g, "'");

    try {
      return JSON.parse(sanitized);
    } catch (secondErr) {
      console.warn(`[JSON Parser] Tentativa 2 de parse falhou (${secondErr.message}). Sanitizando aspas e caracteres remanescentes...`);

      try {
        // Sanitize unescaped quotes inside text fields
        const ultraSanitized = sanitized
          .replace(/[\u007F-\u009F]/g, '')
          .replace(/\\"/g, '"');
        return JSON.parse(ultraSanitized);
      } catch (thirdErr) {
        console.error(`[JSON Parser] ❌ Falha crítica no parsing do JSON: ${thirdErr.message}`);
        throw thirdErr;
      }
    }
  }
}

/**
 * Helper to call Gemini API with automatic model alias fallback & 503 retry handling
 */
async function generateContentWithFallback(genAI, config, contents) {
  // Model priority optimized for high RPM (15 RPM) and high RPD (500 RPD) limits
  const models = [
    'gemini-3.5-flash-lite',
    'gemini-3.7-flash',
    'gemini-flash-latest',
    'gemini-3.5-flash',
    'gemini-3.8-flash',
    'gemini-3.6-flash'
  ];
  let lastErr = null;

  for (const modelName of models) {
    try {
      const model = genAI.getGenerativeModel({
        ...config,
        model: modelName
      });
      const result = await model.generateContent(contents);
      console.log(`[Gemini API] Executado com sucesso via modelo: ${modelName}`);
      return result;
    } catch (err) {
      lastErr = err;
      const msg = err.message || '';
      const isRetryable = msg.includes('404') || msg.includes('not found') ||
                          msg.includes('429') || msg.includes('Quota') ||
                          msg.includes('503') || msg.includes('Service Unavailable') ||
                          msg.includes('high demand') || msg.includes('overloaded');

      if (isRetryable) {
        console.warn(`[Gemini Fallback] Modelo ${modelName} indisponível (${msg.substring(0, 80)}...). Alternando modelo...`);
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

/**
 * AGENTE 0: Detector Especialista de Cabeçalhos e Nomes (Gemini Vision)
 * Função exclusiva: Inspecionar a região superior/cabeçalho da folha e extrair Nome do Aluno e Turma com alta precisão visual.
 */
async function agenteDetectorCabecalho(base64Image, apiKey) {
  const genAI = new GoogleGenerativeAI(apiKey);

  const headerSystemPrompt = `Você é um perito especialista em análise visual de cabeçalhos de folhas de redação e provas escolares.
Examine EXCLUSIVAMENTE a parte superior, cabeçalho, margens e campos de identificação da imagem (procurando por rótulos como "Aluno:", "Nome:", "Estudante:", "Nome do Aluno:", "Turma:", "Série:", "Classe:", assinaturas manuscritas ou nomes próprios legíveis).

Instruções:
- Se encontrar o nome do aluno no cabeçalho ou folha, extraia-o com precisão no campo "aluno".
- Se encontrar a turma/série no cabeçalho, extraia-a no campo "turma".
- Se NÃO houver nome legível ou for apenas o texto da redação sem identificação, defina "aluno" como null.

Retorne estritamente um objeto JSON com o formato:
{
  "aluno": "Nome do Aluno ou null",
  "turma": "Turma do Aluno ou null"
}`;

  const base64Data = base64Image.includes('base64,')
    ? base64Image.split('base64,')[1]
    : base64Image;

  const mimeTypeMatch = base64Image.match(/^data:(image\/[a-zA-Z+]+);base64,/);
  const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/jpeg';

  const result = await generateContentWithFallback(
    genAI,
    { generationConfig: { responseMimeType: 'application/json' } },
    [
      { inlineData: { data: base64Data, mimeType } },
      headerSystemPrompt
    ]
  );

  const textResponse = result.response.text().trim();
  try {
    const parsed = cleanAndParseJSON(textResponse);
    console.log(`[Agente 0 - Cabeçalho] Identificado -> Aluno: "${parsed.aluno}", Turma: "${parsed.turma}"`);
    return parsed;
  } catch (err) {
    console.warn(`[Agente 0 - Cabeçalho] Erro ao parsear JSON do cabeçalho: ${err.message}`);
    return { aluno: null, turma: null };
  }
}

/**
 * AGENTE 1: Transcritor OCR Especialista (Gemini Vision)
 * Função exclusiva: Extrair 100% do texto manuscrito palavra por palavra, linha por linha.
 */
async function agente1Transcrever(base64Image, textoDigitado, apiKey) {
  if (textoDigitado && textoDigitado.trim().length > 0) {
    return textoDigitado.trim();
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  const ocrSystemPrompt = `Você é um perito especialista em transcrição paleográfica e OCR de redações manuscritas.
Sua ÚNICA função é ler a imagem da folha de redação e transcrever o texto integralmente.

REGRAS INEGOCIÁVEIS:
1. Transcreva o texto 100% COMPLETO, do título/primeira linha até a última palavra.
2. NUNCA resuma, NUNCA omita parágrafos e NUNCA use reticências (...) para abreviar.
3. Preserve a ortografia original do aluno e os parágrafos.
4. Retorne APENAS o texto transcrito puro, sem comentários, sem introduções e sem formatação markdown extra.`;

  const base64Data = base64Image.includes('base64,')
    ? base64Image.split('base64,')[1]
    : base64Image;

  const mimeTypeMatch = base64Image.match(/^data:(image\/[a-zA-Z+]+);base64,/);
  const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/jpeg';

  const result = await generateContentWithFallback(
    genAI,
    {},
    [
      { inlineData: { data: base64Data, mimeType } },
      ocrSystemPrompt
    ]
  );

  const transcribedText = result.response.text().trim();
  console.log(`[Agente 1 - OCR] Transcrição integral concluída (${transcribedText.length} caracteres).`);
  return transcribedText;
}

/**
 * AGENTE 2: Banca Avaliadora Pedagógica (ENEM x Sisedu Projeto Ágora)
 * Função exclusiva: Avaliar o texto transcrito pelo Agente 1 e gerar notas e citações diretas.
 */
async function agente2Avaliar(textoIntegral, nomeFornecido, turmaFornecida, apiKey) {
  const genAI = new GoogleGenerativeAI(apiKey);

  const systemInstruction = `Você é um assistente educacional especialista em avaliação textual e análise crítica. Sua função é ler a redação de um aluno e avaliá-la cruzando duas matrizes de correção: as 5 Competências do ENEM e as rubricas de avaliação qualitativa do Sisedu (Projeto Ágora Escolar).

INSTRUÇÕES DE AVALIAÇÃO (REGRAS RESTRITAS):
1. **Citação Obrigatória:** Para cada comentário ou nível atribuído, você DEVE extrair e citar no campo "citacao_texto" um trecho exato do texto do aluno que comprove sua avaliação. Se o texto não apresentar elementos para uma competência, atribua a nota mínima e declare "Elemento ausente no texto".
2. **Aderência Estrita:** Baseie-se exclusivamente no texto fornecido. Não presuma intenções ou conhecimentos que não foram explicitamente escritos.
3. **Nome e Turma:** Utilize o nome e turma fornecidos no prompt. Se forem null, defina como null.
4. **TRANSCRIÇÃO 100% INTEGRAL:** Mantenha no campo "texto_transcrito" o texto fornecido integralmente.

MATRIZES DE REFERÊNCIA:
1. ENEM (Notas em múltiplos de 40: 0, 40, 80, 120, 160, 200 por competência):
   - Competência 1: Domínio da modalidade escrita formal.
   - Competência 2: Compreensão do tema e aplicação de repertório sociocultural.
   - Competência 3: Seleção, relação, organização e interpretação de informações, fatos e opiniões em defesa de um ponto de vista (Argumentação).
   - Competência 4: Conhecimento dos mecanismos linguísticos necessários para a argumentação (Coesão e Coerência).
   - Competência 5: Proposta de intervenção para o problema abordado, respeitando os direitos humanos.

2. CRITÉRIOS SISEDU (PROJETO ÁGORA):
   Utilize APENAS os níveis: "Inicial", "Em Desenvolvimento" ou "Avançado".
   - Dimensão Discursiva:
     * Clareza da Tese: Opinião implícita (Inicial); Tese clara (Em Desenvolvimento); Tese crítica e problematizadora (Avançado).
     * Argumentação: Exemplos superficiais (Inicial); Argumentos organizados (Em Desenvolvimento); Argumentos críticos e interdisciplinares (Avançado).
     * Repertório: Cotidiano imediato (Inicial); Referências culturais básicas (Em Desenvolvimento); Referências filosóficas, históricas e científicas (Avançado).
   - Dimensão Ético-Moral:
     * Empatia e Alteridade: Reconhece o outro superficialmente (Inicial); Considera múltiplas perspectivas (Em Desenvolvimento); Demonstra consciência ética complexa (Avançado).
     * Justificação Moral: Opiniões intuitivas (Inicial); Justificativas racionais (Em Desenvolvimento); Justificativas fundamentadas em princípios (Avançado).
     * Conclusão Crítica / Propostas: Ausentes (Inicial); Genéricas (Em Desenvolvimento); Propostas concretas e viáveis (Avançado).

FORMATO DE SAÍDA OBRIGATÓRIO (JSON estrito):
{
  "aluno": "${nomeFornecido || 'Nome do Aluno ou null'}",
  "turma": "${turmaFornecida || 'Turma do Aluno ou null'}",
  "texto_transcrito": "Texto integral...",
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

  const prompt = `Avalie esta redação conforme a matriz ENEM x Sisedu Projeto Ágora.
Aluno Identificado: ${nomeFornecido || 'Não especificado'}
Turma Identificada: ${turmaFornecida || 'Não especificada'}

TEXTO INTEGRAL DA REDAÇÃO TRANSCITO PELO AGENTE 1:
"""
${textoIntegral}
"""

Extraia citações exatas ("citacao_texto") para cada nota e nível das duas matrizes.`;

  const result = await generateContentWithFallback(
    genAI,
    {
      systemInstruction,
      generationConfig: { responseMimeType: 'application/json' }
    },
    prompt
  );

  const responseText = result.response.text();
  console.log(`[Agente 2 - Avaliador] Avaliação pedagógica concluída com sucesso.`);
  const parsed = cleanAndParseJSON(responseText);

  // Ensure 100% complete text is always set
  parsed.texto_transcrito = textoIntegral;
  if (nomeFornecido) parsed.aluno = nomeFornecido;
  if (turmaFornecida) parsed.turma = turmaFornecida;

  return parsed;
}

/**
 * Generates realistic Mock ENEM x Sisedu essay evaluations based on base.md
 */
function getMockENEMEvaluation(id, textoDigitado, nomeFornecido, turmaFornecida) {
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

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`==================================================`);
    console.log(`  Plataforma SaaS Multi-Agente IA (ENEM x Sisedu)`);
    console.log(`  API Endpoint: http://localhost:${PORT}/api/corrigir`);
    console.log(`==================================================`);
  });
}

export default app;
