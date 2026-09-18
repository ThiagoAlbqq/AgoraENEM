import xlsx from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { supabase } from '../src/config/supabaseClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function normalize(str) {
  if (!str) return '';
  return str.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function importarEAutoVincular() {
  console.log('=== INICIANDO IMPORTAÇÃO DE ALUNOS E VÍNCULO ===\n');

  // 1. Ler Planilha Excel
  const filePath = path.resolve(__dirname, '../../Lista Geral dos Alunos.xlsx');
  const wb = xlsx.readFile(filePath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rawData = xlsx.utils.sheet_to_json(sheet);
  console.log(`Planilha carregada: ${rawData.length} registros encontrados.`);

  // 2. Preparar registros únicos de estudantes
  const DEFAULT_PASSWORD = 'Agora@2026';
  const senhaHash = bcrypt.hashSync(DEFAULT_PASSWORD, 10);

  const mapEmails = new Map();
  const studentsToInsert = [];

  for (const row of rawData) {
    const nome = (row['NOME DOS ALUNOS'] || row['NOME'] || row['Nome'] || '').toString().trim();
    let email = (row['EMAIL_INSTITUCIONAL'] || row['EMAIL'] || row['Email'] || '').toString().trim().toLowerCase();
    const turma = (row['TURMA'] || row['Turma'] || '').toString().trim();

    if (!nome || !email) continue;
    if (mapEmails.has(email)) continue; // Evita duplicatas na planilha
    mapEmails.set(email, true);

    studentsToInsert.push({
      nome,
      email,
      turma,
      role: 'ESTUDANTE',
      senha_hash: senhaHash
    });
  }

  console.log(`Estudantes válidos para inserção/atualização: ${studentsToInsert.length}`);

  // 3. Inserir/Upsert em lotes de 50 no Supabase
  const BATCH_SIZE = 50;
  let totalSaved = 0;

  for (let i = 0; i < studentsToInsert.length; i += BATCH_SIZE) {
    const batch = studentsToInsert.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from('users')
      .upsert(batch, { onConflict: 'email', ignoreDuplicates: false });

    if (error) {
      console.error(`Erro ao inserir lote ${i} - ${i + batch.length}:`, error.message);
    } else {
      totalSaved += batch.length;
      process.stdout.write(`Progresso: ${totalSaved}/${studentsToInsert.length} alunos sincronizados...\r`);
    }
  }
  console.log(`\nTodos os ${totalSaved} alunos foram salvos no Supabase com sucesso!`);

  // 4. Buscar todos os usuários do banco para obter os IDs reais
  const { data: allUsers, error: usersErr } = await supabase
    .from('users')
    .select('id, nome, email, turma, role');

  if (usersErr || !allUsers) {
    console.error('Erro ao buscar usuários do Supabase:', usersErr);
    return;
  }

  const estudantes = allUsers.filter(u => u.role === 'ESTUDANTE');
  const estudantesNorm = estudantes.map(e => ({
    ...e,
    norm: normalize(e.nome)
  }));

  // 5. Buscar todas as redações
  const { data: redacoes, error: redErr } = await supabase
    .from('redacoes')
    .select('id, nome_aluno, turma_aluno, user_id, nota_final');

  if (redErr || !redacoes) {
    console.error('Erro ao buscar redações do Supabase:', redErr);
    return;
  }

  console.log(`\nIniciando Auto-Vínculo de ${redacoes.length} redações avaliadas...`);

  // Dicionário de correções OCR conhecidas para casos com apenas 1º nome ou erro OCR de cabeçalho
  const manualOcrMap = {
    'viviane tomoz': 'viviane tomaz de albuquerque',
    'lara dos santos lima': 'iara dos santos lima',
    'micael': 'micael jeferson vasconcelos de maria',
    'adilson': 'francisco adilson araujo marques',
    'ariane': 'ariane erika magalhaes alves',
    'vinicius': 'francisco vinicius vasconcelos sousa',
    'dovy': 'davy leandro freitas',
    'carlos diego': 'carlos henrique sousa teixeira',
    'laiza': 'maria livia da silva',
    'igo alisson': 'vitor alisson freitas sousa',
    'lany de sousa': 'antonia daniele de souza fonteles'
  };

  let linkedCount = 0;
  const unlinked = [];

  for (const red of redacoes) {
    const normRed = normalize(red.nome_aluno);
    if (!normRed || normRed === 'aluno desconhecido' || normRed === 'aluno' || normRed === 'nao identificado') {
      unlinked.push({ id: red.id, nome: red.nome_aluno, motivo: 'Nome ausente ou ilegível na folha' });
      continue;
    }

    // A. Match com mapa de OCR
    let matchedStudent = null;
    if (manualOcrMap[normRed]) {
      const targetNorm = manualOcrMap[normRed];
      matchedStudent = estudantesNorm.find(e => e.norm === targetNorm);
    }

    // B. Match exato
    if (!matchedStudent) {
      matchedStudent = estudantesNorm.find(e => e.norm === normRed);
    }

    // C. Match por primeiro nome e sobrenomes
    if (!matchedStudent) {
      const redTokens = normRed.split(' ').filter(t => t.length > 2);
      const firstToken = redTokens[0];

      matchedStudent = estudantesNorm.find(e => {
        const aluTokens = e.norm.split(' ').filter(t => t.length > 2);
        const firstNameMatches = aluTokens.slice(0, 2).includes(firstToken) || (redTokens.length > 1 && aluTokens.slice(0, 2).includes(redTokens[1]));
        if (!firstNameMatches) return false;

        const commonTokens = redTokens.filter(t => aluTokens.includes(t));
        return commonTokens.length >= 2 && (commonTokens.length / redTokens.length >= 0.5);
      });
    }

    // D. Se encontrou, atualizar a redação
    if (matchedStudent) {
      const { error: updErr } = await supabase
        .from('redacoes')
        .update({
          user_id: matchedStudent.id,
          nome_aluno: matchedStudent.nome,
          turma_aluno: matchedStudent.turma
        })
        .eq('id', red.id);

      if (updErr) {
        console.error(`Erro ao atualizar redação ID ${red.id}:`, updErr.message);
      } else {
        linkedCount++;
        console.log(`[VINCULADO] Redação ID ${red.id} ("${red.nome_aluno}") ➔ ${matchedStudent.nome} (${matchedStudent.turma}) | ${matchedStudent.email}`);
      }
    } else {
      unlinked.push({ id: red.id, nome: red.nome_aluno, motivo: 'Sem correspondência direta com a lista' });
    }
  }

  console.log('\n================ RESUMO FINAL ================');
  console.log(`Total de Alunos Importados: ${totalSaved}`);
  console.log(`Redações Vinculadas Automaticamente: ${linkedCount} de ${redacoes.length} (${Math.round(linkedCount / redacoes.length * 100)}%)`);
  console.log(`Redações Pendentes de Vínculo Manual: ${unlinked.length}`);
  if (unlinked.length > 0) {
    unlinked.forEach(u => console.log(`  - ID ${u.id}: "${u.nome}" (${u.motivo})`));
  }
  console.log('\n==============================================');
}

importarEAutoVincular();
