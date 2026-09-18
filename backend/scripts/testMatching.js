import xlsx from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';
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

async function test() {
  const filePath = path.resolve(__dirname, '../../Lista Geral dos Alunos.xlsx');
  const wb = xlsx.readFile(filePath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(sheet);
  console.log('Total alunos na planilha:', data.length);

  const { data: redacoes, error } = await supabase.from('redacoes').select('id, nome_aluno, turma_aluno, user_id, nota_final');
  if (error) {
    console.error('Erro ao buscar redações:', error);
    return;
  }
  console.log('Total redações no banco:', redacoes.length);

  const alunosNorm = data.map(d => {
    const nome = (d['NOME DOS ALUNOS'] || d['NOME'] || d['Nome'] || '').trim();
    const email = (d['EMAIL_INSTITUCIONAL'] || d['EMAIL'] || d['Email'] || '').trim();
    const turma = (d['TURMA'] || d['Turma'] || '').trim();
    return { nome, email, turma, norm: normalize(nome) };
  });

  let matched = [];
  let unmatched = [];

  redacoes.forEach(r => {
    const normRed = normalize(r.nome_aluno);
    if (!normRed || normRed === 'aluno desconhecido' || normRed === 'aluno' || normRed === 'nao identificado') {
      unmatched.push({ id: r.id, nome: r.nome_aluno, motivo: 'Nome ausente/genérico no OCR' });
      return;
    }

    // 1. Exato
    let found = alunosNorm.find(a => a.norm === normRed);
    
    // 2. Token overlap com validação de Primeiro Nome e Sobrenomes
    if (!found) {
      const redTokens = normRed.split(' ').filter(t => t.length > 2);
      const firstToken = redTokens[0];
      
      found = alunosNorm.find(a => {
        const aluTokens = a.norm.split(' ').filter(t => t.length > 2);
        // O primeiro nome da redação precisa estar entre os primeiros nomes do aluno ou vice-versa
        const firstNameMatches = aluTokens.slice(0, 2).includes(firstToken) || (redTokens.length > 1 && aluTokens.slice(0, 2).includes(redTokens[1]));
        if (!firstNameMatches) return false;

        const commonTokens = redTokens.filter(t => aluTokens.includes(t));
        return commonTokens.length >= 2 && (commonTokens.length / redTokens.length >= 0.6);
      });
    }

    if (found) {
      matched.push({ redacao: r.nome_aluno, aluno: found.nome, turma: found.turma, email: found.email });
    } else {
      unmatched.push({ id: r.id, nome: r.nome_aluno, motivo: 'Sem correspondência direta' });
    }
  });

  console.log('\n--- RELATÓRIO DE LINKING ---');
  console.log(`Matches automáticos: ${matched.length} de ${redacoes.length} (${Math.round(matched.length / redacoes.length * 100)}%)`);
  console.log('\nExemplos de matches encontrados:');
  matched.slice(0, 10).forEach(m => {
    console.log(`  [OK] OCR: "${m.redacao}" => Aluno: "${m.aluno}" | Turma: ${m.turma} | ${m.email}`);
  });

  console.log(`\nRedações não vinculadas automaticamente (${unmatched.length}):`);
  unmatched.forEach(u => {
    console.log(`  [PENDENTE] Nome OCR: "${u.nome}" (${u.motivo})`);
  });
}

test();
