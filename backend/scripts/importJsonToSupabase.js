import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('[Import Error]: É necessário configurar SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente ou .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function runImport() {
  const jsonFilePath = process.argv[2] || 'agora-db-backup.json';
  if (!fs.existsSync(jsonFilePath)) {
    console.error(`[Import Error]: Arquivo JSON não encontrado em: ${jsonFilePath}`);
    console.log('Uso: node backend/scripts/importJsonToSupabase.js <caminho-do-arquivo.json>');
    process.exit(1);
  }

  console.log(`[Import] Lendo arquivo de backup: ${jsonFilePath}...`);
  const rawData = fs.readFileSync(jsonFilePath, 'utf-8');
  const backup = JSON.parse(rawData);

  const users = backup.users || [];
  const redacoes = backup.redacoes || [];

  console.log(`[Import] Encontrados ${users.length} usuários e ${redacoes.length} redações no backup.`);

  // 1. Import Users
  let importedUsers = 0;
  for (const user of users) {
    const { error } = await supabase.from('users').upsert({
      id: user.id,
      nome: user.nome,
      email: user.email,
      senha_hash: user.senha_hash,
      role: user.role || 'ESTUDANTE',
      turma: user.turma || null,
      created_at: user.created_at || new Date().toISOString()
    }, { onConflict: 'email' });

    if (error) {
      console.error(`[Import User Error] ID ${user.id} (${user.email}):`, error.message);
    } else {
      importedUsers++;
    }
  }
  console.log(`[Import] ${importedUsers}/${users.length} usuários importados para o Supabase.`);

  // 2. Import Redações
  let importedRedacoes = 0;
  for (const item of redacoes) {
    const extractedDataJson = typeof item.extracted_data === 'string'
      ? JSON.parse(item.extracted_data)
      : (item.extracted_data || {});

    const { error } = await supabase.from('redacoes').upsert({
      id: item.id,
      user_id: item.user_id || null,
      nome_aluno: item.nome_aluno || 'Aluno Não Identificado',
      turma_aluno: item.turma_aluno || 'Turma Geral',
      nome_detectado: item.nome_detectado ? 1 : 0,
      data_captura: item.data_captura || new Date().toISOString(),
      tipo_input: item.tipo_input || 'imagem',
      imagem_base64: item.imagem_base64 || null,
      texto_digitado: item.texto_digitado || null,
      is_synced: 1,
      extracted_data: extractedDataJson,
      nota_final: item.nota_final || 0,
      status_validacao: item.status_validacao || 'VALIDADA',
      validado_por: item.validado_por || null,
      data_validacao: item.data_validacao || null
    }, { onConflict: 'id' });

    if (error) {
      console.error(`[Import Redacao Error] ID ${item.id} (${item.nome_aluno}):`, error.message);
    } else {
      importedRedacoes++;
    }
  }

  console.log(`==================================================`);
  console.log(`🎉 MIGRAÇÃO CONCLUÍDA COM SUCESSO!`);
  console.log(`   Usuários importados: ${importedUsers}/${users.length}`);
  console.log(`   Redações importadas: ${importedRedacoes}/${redacoes.length}`);
  console.log(`==================================================`);
}

runImport().catch(err => {
  console.error('[Import Fatal Error]:', err);
});
